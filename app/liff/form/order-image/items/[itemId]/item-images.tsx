'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

import { ArrowLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ItemDetail } from '@/lib/db/order-images'
import { formatThaiDate } from '@/lib/order-images/format'
import { PACKAGE_OPTIONS } from '@/lib/order-images/packages'
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  isAcceptedImageType,
  MAX_FILE_BYTES,
} from '@/lib/order-images/upload'

import { deleteImage, errorMessage, getItem, setImagePackage, uploadImage } from '../../order-image-api'

// The photo page for one item: a plain 3-column grid plus the upload button
// that used to be squeezed under every thumbnail in step 2. Tapping a photo
// opens the one place that edits it (package label, delete). Mutations
// refetch this item through the API and return to step 2 re-rendered from
// the server, so the counts on the card are never stale.
export function ItemImages({ initialDetail }: { initialDetail: ItemDetail }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [detail, setDetail] = useState(initialDetail)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Store the id, not the record: refresh() replaces the whole detail, so
  // the dialog re-derives its image from fresh state every render. A
  // deleted image then vanishes from the lookup and closes the dialog.
  const [managedImageId, setManagedImageId] = useState<string | null>(null)
  const [packageBusy, setPackageBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const managedImage = detail.images.find((image) => image.id === managedImageId) ?? null

  async function refresh() {
    const result = await getItem(detail.item.id)
    if (result.ok) setDetail(result.data)
    else setError(errorMessage(result.error, result.status))
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || uploading) return
    const files = Array.from(fileList)
    setUploading(true)
    setUploadError(null)
    let firstError: string | null = null
    try {
      for (const [index, file] of files.entries()) {
        setProgress({ current: index + 1, total: files.length })
        // Mirror the server's checks so an oversized camera photo names
        // the offending file immediately instead of a bare 413 later.
        if (!isAcceptedImageType(file.type)) {
          firstError ??= `${file.name}: ${errorMessage('unsupported-type')}`
          continue
        }
        if (file.size > MAX_FILE_BYTES) {
          firstError ??= `${file.name}: ${errorMessage('file-too-large')}`
          continue
        }
        // Sequential on purpose: per-file progress stays honest and one
        // failed file never cancels the rest of the selection.
        const result = await uploadImage(detail.item.id, file)
        if (!result.ok) {
          firstError ??= `${file.name}: ${errorMessage(result.error, result.status)}`
        }
      }
      await refresh()
      if (firstError) setUploadError(firstError)
    } finally {
      setUploading(false)
      setProgress(null)
      // Reset so picking the same file again after a failure re-fires
      // change (browsers skip an unchanged input value).
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function changePackage(pkg: string | null) {
    if (!managedImage) return
    setPackageBusy(true)
    setDialogError(null)
    try {
      const result = await setImagePackage(managedImage.id, pkg)
      if (!result.ok) {
        setDialogError(errorMessage(result.error, result.status))
        return
      }
      await refresh()
    } finally {
      setPackageBusy(false)
    }
  }

  async function confirmDelete() {
    if (!managedImage) return
    setDeleting(true)
    setDialogError(null)
    try {
      const result = await deleteImage(managedImage.id)
      if (!result.ok) {
        setDialogError(errorMessage(result.error, result.status))
        return
      }
      // Clearing the id closes the dialog; the refresh removes the tile.
      setManagedImageId(null)
      setConfirmingDelete(false)
      await refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 sm:gap-6">
      <header className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 self-start"
          render={
            <Link href={`/liff/form/order-image?orderId=${detail.order.id}`} />
          }
        >
          <ArrowLeftIcon />
          กลับออเดอร์
        </Button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">ไอเท็ม {detail.item.itemNumber}</h1>
          <p className="break-words text-sm text-muted-foreground">
            ออเดอร์ {detail.order.orderNumber} · {formatThaiDate(detail.order.orderDate)} · ไลน์{' '}
            {detail.order.line}
          </p>
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
        {detail.images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setDialogError(null)
              setConfirmingDelete(false)
              setManagedImageId(image.id)
            }}
            className="flex flex-col gap-1 text-left"
          >
            <span className="relative block">
              {/* next/image would proxy through /_next/image, whose upstream
                  fetch carries no session cookie and would be rejected 403. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src, see above */}
              <img
                src={`/api/liff/order-images/images/${image.id}/file`}
                alt={`รูปที่ ${image.seq}`}
                loading="lazy"
                className="aspect-square w-full rounded-xl bg-muted object-cover"
              />
              {image.package === null && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-background"
                />
              )}
            </span>
            <span className="w-full truncate text-xs text-muted-foreground">
              {image.package ?? 'ยังไม่ระบุ'}
            </span>
          </button>
        ))}
        {uploading && (
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block aspect-square w-full animate-pulse rounded-xl bg-muted" />
            <span className="text-xs text-muted-foreground">กำลังอัปโหลด...</span>
          </span>
        )}
      </div>

      {detail.images.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground">ยังไม่มีรูปภาพ</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          className="w-full sm:w-auto"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <PlusIcon />
          {uploading ? 'กำลังอัปโหลด...' : 'เพิ่มรูปภาพ'}
        </Button>
        {progress && (
          <span className="text-xs text-muted-foreground">
            {progress.current}/{progress.total}
          </span>
        )}
        {uploadError && <p className="w-full text-sm text-destructive">{uploadError}</p>}
      </div>

      <Dialog
        open={managedImage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManagedImageId(null)
            setConfirmingDelete(false)
            setDialogError(null)
          }
        }}
      >
        {/* Tall content (photo + select + footer) must scroll inside the
            viewport on a small phone; the default popup has no max height. */}
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รูปที่ {managedImage?.seq}</DialogTitle>
            <DialogDescription>เลือกแพ็กเกจหรือลบรูปนี้ออก</DialogDescription>
          </DialogHeader>

          {managedImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src, see above */}
              <img
                src={`/api/liff/order-images/images/${managedImage.id}/file`}
                alt={`รูปที่ ${managedImage.seq}`}
                className="max-h-64 w-full rounded-xl bg-muted object-contain sm:max-h-80"
              />
              <label className="flex flex-col gap-1.5 text-sm">
                แพ็กเกจ
                <Select
                  value={managedImage.package}
                  onValueChange={(pkg) => void changePackage(pkg)}
                  disabled={packageBusy || deleting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ยังไม่ระบุแพ็กเกจ" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_OPTIONS.map((pkg) => (
                      <SelectItem key={pkg} value={pkg}>
                        {pkg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </>
          )}

          {confirmingDelete && (
            <p className="text-sm text-destructive">ลบรูปนี้ถาวร ไม่สามารถกู้คืนได้</p>
          )}
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}

          <DialogFooter>
            {confirmingDelete ? (
              <>
                <Button
                  variant="outline"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                >
                  {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
                </Button>
              </>
            ) : (
              <>
                <DialogClose render={<Button variant="outline" />}>ปิด</DialogClose>
                <Button
                  variant="destructive"
                  disabled={packageBusy || deleting}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2Icon />
                  ลบรูปนี้
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
