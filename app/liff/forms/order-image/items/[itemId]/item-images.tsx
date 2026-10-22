'use client'

import { useState } from 'react'

import { ChevronLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button, ButtonLink } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ImageRecord, ItemDetail } from '@/lib/db/types'
import { formatThaiDate } from '@/lib/order-images/format'
import { PACKAGE_OPTIONS } from '@/lib/order-images/packages'

import { FormNavbar } from '../../../../form-navbar'
import { deleteImage, errorMessage, getItem, setImagePackage } from '../../order-image-api'
import { UploadDialog } from './upload-dialog'

// The photo page for one item: a plain 3-column grid plus the upload button
// that used to be squeezed under every thumbnail in step 2. Tapping a photo
// opens the one place that edits it (package label, delete). Mutations
// refetch this item through the API and return to step 2 re-rendered from
// the server, so the counts on the card are never stale.
export function ItemImages({ initialDetail }: { initialDetail: ItemDetail }) {
  const [detail, setDetail] = useState(initialDetail)
  const [error, setError] = useState<string | null>(null)
  // The upload lives in its own dialog (see upload-dialog.tsx). The page
  // only needs to know whether one is running, for the placeholder in the
  // grid, and whether the dialog is open.
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
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
    <div className="flex w-full flex-col gap-4 pb-4 sm:gap-6">
      {/* The navbar carries the item and the order it belongs to, so the
          page below is only the photos. The back link keeps the name
          "กลับออเดอร์" because that is what the e2e spec looks for. */}
      <FormNavbar
        title={`ไอเท็ม ${detail.item.itemNumber}`}
        subtitle={`ออเดอร์ ${detail.order.orderNumber} / ${formatThaiDate(detail.order.orderDate)} / ไลน์${detail.order.line}`}
        action={
          <ButtonLink
            variant="ghost"
            size="icon"
            aria-label="กลับออเดอร์"
            href={`/liff/forms/order-image?orderId=${detail.order.id}`}>
            <ChevronLeftIcon />
          </ButtonLink>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* The photo grid, framed like the item cards on the order page. The
          add cell is the last one, so it always sits where the next photo
          will appear. */}
      <section className="relative grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 border p-4 rounded-xl">
        {detail.images.map((image) => (
          <PhotoTile
            key={image.id}
            image={image}
            onOpen={() => {
              setDialogError(null)
              setConfirmingDelete(false)
              setManagedImageId(image.id)
            }}
          />
        ))}

        {uploading && (
          <span aria-hidden="true" className="flex flex-col gap-1 rounded-xl border border-dashed p-1">
            <span className="block aspect-square w-full animate-pulse rounded-lg bg-muted" />
            <span className="text-xs text-muted-foreground">กำลังอัปโหลด...</span>
          </span>
        )}

        {/* h-auto overrides the fixed h-9 that buttonVariants sets: a grid
            item with a fixed height does not stretch to the row height, so
            the cell would sit as a short pill next to the photo tiles. */}
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 border-dashed rounded-xl py-14"
          disabled={uploading}
          onClick={() => setUploadOpen(true)}>
          <PlusIcon />
          <span className="text-xs leading-tight">เพิ่มรูปภาพ</span>
        </Button>
      </section>

      {/* The upload dialog owns the file list and the upload loop. Closing
          it refetches the item, so the grid shows whatever landed, even
          when the dialog was closed while a file was still on its way. */}
      <UploadDialog
        open={uploadOpen}
        itemId={detail.item.id}
        context={`ไอเท็ม ${detail.item.itemNumber} · ออเดอร์ ${detail.order.orderNumber}`}
        onOpenChange={(next) => {
          setUploadOpen(next)
          if (!next) void refresh()
        }}
        onUploadingChange={setUploading}
      />

      <Dialog
        open={managedImage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManagedImageId(null)
            setConfirmingDelete(false)
            setDialogError(null)
          }
        }}>
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
                  disabled={packageBusy || deleting}>
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

          {confirmingDelete && <p className="text-sm text-destructive">ลบรูปนี้ถาวร ไม่สามารถกู้คืนได้</p>}
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}

          <DialogFooter>
            {confirmingDelete ? (
              <>
                <Button variant="outline" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
                  {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
                </Button>
              </>
            ) : (
              <>
                <DialogClose render={<Button variant="outline" />}>ปิด</DialogClose>
                <Button
                  variant="destructive"
                  disabled={packageBusy || deleting}
                  onClick={() => setConfirmingDelete(true)}>
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

// One photo as a tile: the picture inside its own frame, with the package
// label under it.
//
// The tile stays a button because tapping it opens the editor, and the
// label stays inside it because that is what the e2e spec reads.
function PhotoTile({ image, onOpen }: { image: ImageRecord; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex flex-col gap-y-2 rounded-xl border p-2 text-left">
      <span className="block overflow-hidden rounded-lg border">
        {/* next/image would proxy through /_next/image, whose upstream
            fetch carries no session cookie and would be rejected 403. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src, see above */}
        <img
          src={`/api/liff/order-images/images/${image.id}/file`}
          alt={`รูปที่ ${image.seq}`}
          loading="lazy"
          className="aspect-square w-full bg-muted object-cover"
        />
      </span>
      <span className="w-full truncate text-xs text-muted-foreground text-center">
        {image.package ?? 'ยังไม่ระบุแพ็คเกจ'}
      </span>
    </button>
  )
}
