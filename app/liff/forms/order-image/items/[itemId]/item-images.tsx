'use client'

import { startTransition, useEffect, useOptimistic, useRef, useState } from 'react'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from 'lucide-react'

import { FormPage } from '@/components/layout/form-page'
import { TileButton, TileGrid } from '@/components/layout/tile-grid'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ImageRecord, ItemDetail } from '@/lib/db/types'
import { toastMessages } from '@/lib/messages'
import { formatThaiDate } from '@/lib/order-images/format'
import { PACKAGE_OPTIONS } from '@/lib/order-images/packages'
import { reduceImages } from '@/lib/order-images/tree'
import { notifyError, notifySuccess } from '@/lib/toast'

import { FormNavbar } from '../../../../form-navbar'
import { deleteImage, errorMessage, getItem, setImagePackage } from '../../order-image-api'
import { UploadDialog } from './upload-dialog'

// The photo page for one item: a grid of photos plus the cell that adds the
// next one. Tapping a photo opens the viewer, which shows the picture and
// nothing else. Everything that changes a photo — the package label and the
// delete — lives in the menu on its card. Mutations refetch this item
// through the API, so the labels and counts on the cards are never stale.
export function ItemImages({ initialDetail }: { initialDetail: ItemDetail }) {
  const [detail, setDetail] = useState(initialDetail)
  const [error, setError] = useState<string | null>(null)
  // The upload lives in its own dialog (see upload-dialog.tsx). The page
  // only needs to know whether one is running, for the placeholder in the
  // grid, and whether the dialog is open.
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  // Ids, not records: refresh() replaces the whole detail, so the dialogs
  // re-derive their photo from fresh state every render. A deleted photo
  // then vanishes from the lookup and closes the dialog.
  const [previewImageId, setPreviewImageId] = useState<string | null>(null)
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)
  // One request per image: a second package change on the same card waits,
  // while the other cards stay usable.
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  // The grid renders the preview, not the last server response, so a change
  // appears on the click and the response replaces the preview afterwards.
  const [optimisticImages, applyOptimistic] = useOptimistic(detail.images, reduceImages)
  // Where the finger went down, for the swipe across the photo in the viewer.
  // Touch only: a mouse drag over a picture is a selection, not a navigation.
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const previewImage = optimisticImages.find((image) => image.id === previewImageId) ?? null
  const deletingImage = optimisticImages.find((image) => image.id === deletingImageId) ?? null
  // The viewer counts positions, not seq: seq is allocated as MAX(seq) + 1 per
  // item, so a delete leaves gaps and "รูปที่ 3 จาก 2" would make no sense.
  const previewIndex = previewImageId
    ? optimisticImages.findIndex((image) => image.id === previewImageId)
    : -1

  async function refresh() {
    const result = await getItem(detail.item.id)
    if (result.ok) setDetail(result.data)
    else setError(errorMessage(result.error, result.status))
  }

  // The package is picked in the card's menu, which closes on every pick.
  // The label changes on the click; a refusal reverts it and reports through
  // the shared toast instead of a line under a menu that no longer exists.
  function changePackage(image: ImageRecord, pkg: string | null) {
    if (pendingPackageId) return
    setPendingPackageId(image.id)
    setError(null)
    startTransition(async () => {
      applyOptimistic({ type: 'package', id: image.id, package: pkg })
      try {
        const result = await setImagePackage(image.id, pkg)
        if (!result.ok) {
          notifyError(toastMessages.packageChangeFailed, {
            description: errorMessage(result.error, result.status),
          })
          return
        }
        setDetail((current) => ({
          ...current,
          images: reduceImages(current.images, {
            type: 'replace',
            image: result.data.image,
          }),
        }))
        notifySuccess(pkg ? toastMessages.packageChanged(pkg) : toastMessages.packageCleared)
      } finally {
        setPendingPackageId(null)
      }
    })
  }

  function confirmDelete() {
    if (!deletingImage || pendingDeleteId) return
    const target = deletingImage
    // Close first: the card is already leaving the grid, so keeping the
    // dialog open would make the delete feel slower than it is.
    setDeletingImageId(null)
    setPendingDeleteId(target.id)
    startTransition(async () => {
      applyOptimistic({ type: 'remove', id: target.id })
      try {
        const result = await deleteImage(target.id)
        if (!result.ok) {
          notifyError(toastMessages.imageDeleteFailed, {
            description: errorMessage(result.error, result.status),
          })
          return
        }
        setDetail((current) => ({
          ...current,
          images: reduceImages(current.images, { type: 'remove', id: target.id }),
        }))
        notifySuccess(toastMessages.imageDeleted)
      } finally {
        setPendingDeleteId(null)
      }
    })
  }

  // Walking the viewer by one photo. The buttons, the arrow keys and the
  // swipe all end up here, so the three ways to move cannot drift apart.
  function stepPreview(delta: number) {
    setPreviewImageId((currentId) => neighbourId(optimisticImages, currentId, delta))
  }

  // Arrow keys are the quickest way through the photos with a keyboard. The
  // listener exists only while the viewer is open, and the update reads the
  // latest list, so a refresh mid-view cannot move to a stale photo.
  useEffect(() => {
    if (previewImageId === null) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const delta = event.key === 'ArrowRight' ? 1 : -1
      setPreviewImageId((currentId) => neighbourId(optimisticImages, currentId, delta))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewImageId, optimisticImages])

  return (
    <FormPage
      className="w-full"
      header={
        // The navbar carries the item and the order it belongs to, so the
        // page below is only the photos. The back link keeps the name
        // "กลับออเดอร์" because that is what the e2e spec looks for.
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
      }>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* The photo grid, framed like the item cards on the order page. The
          add cell is the last one, so it always sits where the next photo
          will appear. */}
      <TileGrid label="รูปภาพของไอเท็ม">
        {optimisticImages.map((image) => (
          <PhotoTile
            key={image.id}
            image={image}
            pending={pendingPackageId !== null}
            deletePending={pendingDeleteId !== null}
            onPreview={() => setPreviewImageId(image.id)}
            onPackageChange={(pkg) => changePackage(image, pkg)}
            onDelete={() => setDeletingImageId(image.id)}
          />
        ))}

        {uploading && (
          <span aria-hidden="true" className="flex flex-col gap-1 rounded-xl border border-dashed p-1">
            <span className="block aspect-square w-full animate-pulse rounded-lg bg-muted" />
            <span className="text-xs text-muted-foreground">กำลังอัปโหลด...</span>
          </span>
        )}

        {/* The add cell is the last tile, so it always sits where the next
            photo will appear. Height and layout live in TileButton. */}
        <TileButton
          height="tall"
          label="เพิ่มรูปภาพ"
          disabled={uploading}
          onClick={() => setUploadOpen(true)}
        />
      </TileGrid>

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

      {/* The viewer: the photo, then a bar to walk the item's photos. The
          title stays for screen readers, so the dialog has a name without
          putting text on screen. */}
      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImageId(null)
        }}>
        <DialogContent
          className="gap-0 p-2 sm:max-w-3xl"
          onTouchStart={(event) => {
            const touch = event.touches[0]
            swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
          }}
          onTouchEnd={(event) => {
            const start = swipeStart.current
            swipeStart.current = null
            const touch = event.changedTouches[0]
            if (!start || !touch) return
            const dx = touch.clientX - start.x
            const dy = touch.clientY - start.y
            // A mostly vertical drag is the user scrolling, not a request for
            // the next photo.
            if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return
            stepPreview(dx < 0 ? 1 : -1)
          }}>
          <DialogTitle className="sr-only">
            {previewImage
              ? `รูปที่ ${previewIndex + 1} จาก ${optimisticImages.length}`
              : 'รูปภาพ'}
          </DialogTitle>

          {previewImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src, see above */}
              <img
                src={`/api/liff/order-images/images/${previewImage.id}/file`}
                alt={`รูปที่ ${previewImage.seq}`}
                className="max-h-[80vh] w-full rounded-2xl bg-muted object-contain"
              />

              {/* One photo has nowhere to go, so the bar appears only when
                  there is something to walk. 44px targets sit under the
                  picture, where a thumb reaches and nothing covers the photo. */}
              {optimisticImages.length > 1 && (
                <div className="mt-1 flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label="รูปก่อนหน้า"
                    disabled={previewIndex <= 0}
                    onClick={() => stepPreview(-1)}>
                    <ChevronLeftIcon />
                  </Button>
                  <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
                    {previewIndex + 1} / {optimisticImages.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label="รูปถัดไป"
                    disabled={previewIndex >= optimisticImages.length - 1}
                    onClick={() => stepPreview(1)}>
                    <ChevronRightIcon />
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deleting a photo cannot be undone, so it gets its own confirmation
          instead of a button that fires on the first tap. */}
      <Dialog
        open={deletingImage !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingImageId(null)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบรูปภาพ</DialogTitle>
            <DialogDescription>
              {deletingImage ? `ลบรูปที่ ${deletingImage.seq} ออกถาวร ไม่สามารถกู้คืนได้` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              ยืนยันลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormPage>
  )
}

// A swipe has to be deliberate: a short drag is usually a slip while tapping.
const SWIPE_THRESHOLD_PX = 40

// The id `delta` photos away from `currentId`, or the same id at an edge, so a
// swipe past the first or the last photo simply stays put.
function neighbourId(
  images: ImageRecord[],
  currentId: string | null,
  delta: number
): string | null {
  const at = images.findIndex((image) => image.id === currentId)
  return at < 0 ? currentId : (images[at + delta]?.id ?? currentId)
}

// One photo as a card: the picture inside its own frame, the package label
// under it, and the menu that changes the photo.
//
// The card is a div, not a button: the picture and the menu trigger are two
// separate controls, and a button inside a button is invalid HTML that the
// component library reports in the console.
function PhotoTile({
  image,
  pending,
  deletePending,
  onPreview,
  onPackageChange,
  onDelete,
}: {
  image: ImageRecord
  pending: boolean
  deletePending: boolean
  onPreview: () => void
  onPackageChange: (pkg: string | null) => void
  onDelete: () => void
}) {
  return (
    <div className="relative flex flex-col gap-y-2 rounded-xl border p-2">
      {/* Tapping the picture opens the viewer. Only the picture is a
          control, so the label below stays readable text. */}
      <button type="button" onClick={onPreview} className="block overflow-hidden rounded-lg border">
        {/* next/image would proxy through /_next/image, whose upstream
            fetch carries no session cookie and would be rejected 403. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src, see above */}
        <img
          src={`/api/liff/order-images/images/${image.id}/file`}
          alt={`รูปที่ ${image.seq}`}
          loading="lazy"
          className="aspect-square w-full bg-muted object-cover"
        />
      </button>

      <span className="w-full truncate text-xs text-muted-foreground text-center">
        {image.package ?? 'ยังไม่ระบุแพ็กเกจ'}
      </span>

      {/* Everything that changes the photo lives here. The frosted backdrop
          keeps the trigger readable over a bright picture. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1.5 top-1.5 bg-background/80 backdrop-blur-sm"
              aria-label={`ตั้งค่ารูปที่ ${image.seq}`}
              disabled={pending}
            />
          }>
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>แพ็กเกจ</DropdownMenuSubTrigger>
            {/* The submenu takes its width from its trigger, which is
                narrower than the longest package name. */}
            <DropdownMenuSubContent className="w-auto min-w-48">
              <DropdownMenuRadioGroup
                value={image.package ?? null}
                onValueChange={(value: string | null) => onPackageChange(value)}>
                {/* closeOnClick ends the whole menu on every pick, so the
                    card shows the new label (or the error) right away. */}
                <DropdownMenuRadioItem value={null} closeOnClick>
                  ยังไม่ระบุแพ็กเกจ
                </DropdownMenuRadioItem>
                {PACKAGE_OPTIONS.map((pkg) => (
                  <DropdownMenuRadioItem key={pkg} value={pkg} closeOnClick>
                    {pkg}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={pending || deletePending}
            onClick={onDelete}>
            <Trash2Icon />
            ลบรูปนี้
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
