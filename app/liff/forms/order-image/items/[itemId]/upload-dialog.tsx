'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { CameraIcon, CheckIcon, FileImageIcon, UploadIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import {
  CAMERA_ACCEPT_ATTRIBUTE,
  IMAGE_ACCEPT_ATTRIBUTE,
  isAcceptedImageType,
  MAX_FILE_BYTES,
} from '@/lib/order-images/upload'
import { cn } from '@/lib/utils'

import { errorMessage, uploadImage } from '../../order-image-api'

// One file in the upload list.
//
// The status walks ready → uploading → done. 'rejected' is decided before
// the upload starts (the file breaks a cap the server also enforces), so it
// never reaches the network and cannot be retried. 'error' is a failed
// upload and can be tried again.
type UploadEntry = {
  key: string
  file: File
  status: 'ready' | 'uploading' | 'done' | 'error' | 'rejected'
  error?: string
}

// The upload dialog of one item's photo page.
//
// The operator picks or drops the photos here, sees every file with its own
// state, and the dialog closes itself once every file has landed. A file
// that fails keeps the dialog open with the reason next to it, so a failed
// upload is never mistaken for a finished one.
export function UploadDialog({
  open,
  itemId,
  context,
  onOpenChange,
  onUploadingChange,
}: {
  open: boolean
  itemId: string
  context: string
  onOpenChange: (open: boolean) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyRef = useRef(0)
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Closing resets the list and aborts whatever is still in flight: a
  // request that outlives the dialog would land on a list that is gone.
  // The reset lives in the close handler, not in an effect, so the list
  // never changes in a second render after the dialog is already gone.
  function handleOpenChange(next: boolean) {
    if (!next) {
      controllerRef.current?.abort()
      controllerRef.current = null
      setEntries([])
      setUploading(false)
      onUploadingChange(false)
    }
    onOpenChange(next)
  }

  // The last thing to go: an upload that is still running is aborted with
  // the component.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function updateEntry(key: string, patch: Partial<UploadEntry>) {
    setEntries((prev) => prev.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)))
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const added: UploadEntry[] = []
    for (const file of Array.from(list)) {
      const key = `f${keyRef.current++}`
      // The same caps the server applies, checked here so a wrong file is
      // named before it is sent instead of after a round trip.
      if (!isAcceptedImageType(file.type)) {
        added.push({ key, file, status: 'rejected', error: errorMessage('unsupported-type') })
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        added.push({ key, file, status: 'rejected', error: errorMessage('file-too-large') })
        continue
      }
      added.push({ key, file, status: 'ready' })
    }
    setEntries((prev) => [...prev, ...added])
  }

  // Both pickers (camera and gallery) end up here, so one set of caps applies
  // to either path and the list cannot tell them apart afterwards.
  function handlePicked(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    // Reset so picking the same file again fires change.
    event.target.value = ''
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((entry) => entry.key !== key))
  }

  async function startUpload() {
    // One file at a time: the report stays honest, and the server writes
    // SQLite synchronously in a single process, so parallel requests would
    // not finish any sooner.
    const queue = entries.filter((entry) => entry.status === 'ready' || entry.status === 'error')
    if (queue.length === 0 || uploading) return

    const controller = new AbortController()
    controllerRef.current = controller
    setUploading(true)
    onUploadingChange(true)

    let failed = false
    for (const entry of queue) {
      if (controller.signal.aborted) break
      updateEntry(entry.key, { status: 'uploading', error: undefined })
      const result = await uploadImage(itemId, entry.file, controller.signal)
      if (controller.signal.aborted) break
      if (result.ok) {
        updateEntry(entry.key, { status: 'done' })
      } else {
        failed = true
        updateEntry(entry.key, { status: 'error', error: errorMessage(result.error, result.status) })
      }
    }

    controllerRef.current = null
    setUploading(false)
    onUploadingChange(false)

    // Every file landed: let the check marks show for a moment, then close.
    // A failure keeps the dialog open with the reason next to the file.
    if (!failed && !controller.signal.aborted) {
      closeTimerRef.current = setTimeout(() => handleOpenChange(false), 700)
    }
  }

  const readyCount = entries.filter((entry) => entry.status === 'ready').length
  const failedCount = entries.filter((entry) => entry.status === 'error').length
  const primaryLabel = uploading
    ? 'กำลังอัปโหลด...'
    : readyCount > 0
      ? 'อัปโหลด'
      : failedCount > 0
        ? 'ลองใหม่'
        : 'อัปโหลด'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มรูปภาพ</DialogTitle>
          <DialogDescription>{context}</DialogDescription>
        </DialogHeader>

        {/* The drop zone. Dragging over it turns the border darker so the
            drop is acknowledged before the file lands. */}
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            addFiles(event.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center',
            dragging && 'border-primary bg-muted/40'
          )}
        >
          <UploadIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {/* A phone has nothing to drag onto the zone, so it reads the two
                buttons instead of a drop instruction. */}
            <span className="pointer-fine:hidden">ถ่ายรูปหรือเลือกไฟล์</span>
            <span className="hidden pointer-fine:inline">ลากไฟล์มาวางที่นี่</span>
          </p>
          <div className="flex items-center gap-2">
            {/* The camera has its own input instead of relying on the system
                chooser: Android offers no camera there for the narrow accept
                the gallery input needs. Hidden on a fine pointer, where
                capture is ignored and the button would only reopen the file
                dialog. */}
            <Button
              size="sm"
              className="pointer-fine:hidden"
              onClick={() => cameraRef.current?.click()}>
              <CameraIcon />
              ถ่ายรูป
            </Button>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              เลือกไฟล์
            </Button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept={CAMERA_ACCEPT_ATTRIBUTE}
            capture="environment"
            className="hidden"
            onChange={handlePicked}
          />
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            multiple
            className="hidden"
            onChange={handlePicked}
          />
        </div>

        {entries.length > 0 && (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.key} className="flex items-center gap-2 rounded-xl border p-2">
                <FileImageIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{entry.file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(entry.file.size)}
                </span>

                {entry.status === 'uploading' && (
                  <Spinner className="size-4 shrink-0" aria-label="กำลังอัปโหลด" />
                )}
                {entry.status === 'done' && (
                  <CheckIcon className="size-4 shrink-0 text-emerald-600" aria-label="อัปโหลดแล้ว" />
                )}
                {(entry.status === 'error' || entry.status === 'rejected') && (
                  <span className="max-w-40 shrink-0 truncate text-xs text-destructive">
                    {entry.error}
                  </span>
                )}

                {entry.status !== 'uploading' && entry.status !== 'done' && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`เอา ${entry.file.name} ออก`}
                    onClick={() => removeEntry(entry.key)}
                  >
                    <XIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
          <Button
            disabled={uploading || (readyCount === 0 && failedCount === 0)}
            onClick={() => void startUpload()}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// The size a phone camera produces is best read in megabytes.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
