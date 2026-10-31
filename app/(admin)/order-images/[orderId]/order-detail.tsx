'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from 'lucide-react'

import { StateScreen } from '@/components/layout/state-screen'
import { TileGrid } from '@/components/layout/tile-grid'
import { Button, ButtonLink } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  ImageRecord,
  OrderDetail as OrderDetailType,
  OrderItemNode,
} from '@/lib/db/types'
import { toastMessages } from '@/lib/messages'
import { formatThaiDate } from '@/lib/order-images/format'
import { notifyError, notifySuccess } from '@/lib/toast'

import {
  deleteImageAction,
  deleteItemAction,
  deleteOrderAction,
  setPackageAction,
} from '../actions'
import { AdminImageTile } from './admin-image-tile'
import { DeleteOrderDialog } from './delete-order-dialog'

// The detail view owns the dialogs and the mutations; the server page owns
// the data. After a successful write the page is refreshed so the tree and
// the counts come from SQLite again, not from a local copy that can drift.
export function OrderDetail({
  initialDetail,
  creatorLabel,
}: {
  initialDetail: OrderDetailType
  creatorLabel: string
}) {
  const router = useRouter()
  const detail = initialDetail
  const images = allImages(detail.items)
  const itemCount = countItems(detail.items)

  const [error, setError] = useState<string | null>(null)
  const [previewImageId, setPreviewImageId] = useState<string | null>(null)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [pendingImageId, setPendingImageId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [orderPending, startOrderTransition] = useTransition()

  const previewImage = images.find((image) => image.id === previewImageId) ?? null
  const deleteImage = images.find((image) => image.id === deleteImageId) ?? null
  const deleteItem = findItem(detail.items, deleteItemId)
  const previewIndex = previewImage
    ? images.findIndex((image) => image.id === previewImage.id)
    : -1

  function changePackage(image: ImageRecord, pkg: string | null) {
    if (pendingImageId) return
    setPendingImageId(image.id)
    setError(null)

    startTransition(async () => {
      try {
        const result = await setPackageAction(detail.order.id, image.id, pkg)
        if (result) {
          setError(result.error)
          notifyError(result.error)
          return
        }
        notifySuccess(
          pkg ? toastMessages.packageChanged(pkg) : toastMessages.packageCleared,
        )
        router.refresh()
      } finally {
        setPendingImageId(null)
      }
    })
  }

  function confirmDeleteImage() {
    if (!deleteImage || pendingDeleteId) return
    const target = deleteImage
    setPendingDeleteId(target.id)
    setError(null)

    startTransition(async () => {
      try {
        const result = await deleteImageAction(detail.order.id, target.id)
        if (result) {
          setError(result.error)
          notifyError(result.error)
          return
        }
        setDeleteImageId(null)
        setPreviewImageId((current) => (current === target.id ? null : current))
        notifySuccess(toastMessages.imageDeleted)
        router.refresh()
      } finally {
        setPendingDeleteId(null)
      }
    })
  }

  function confirmDeleteItem() {
    if (!deleteItem || pendingItemId) return
    const target = deleteItem
    setPendingItemId(target.id)
    setError(null)

    startTransition(async () => {
      try {
        const result = await deleteItemAction(detail.order.id, target.id)
        if (result) {
          setError(result.error)
          notifyError(result.error)
          return
        }
        setDeleteItemId(null)
        notifySuccess(
          toastMessages.itemDeleted(target.itemNumber, target.children.length),
        )
        router.refresh()
      } finally {
        setPendingItemId(null)
      }
    })
  }

  function confirmDeleteOrder(confirmation: string) {
    setOrderError(null)
    startOrderTransition(async () => {
      const result = await deleteOrderAction(detail.order.id, confirmation)
      if (result) setOrderError(result.error)
    })
  }

  function stepPreview(delta: number) {
    setPreviewImageId((current) =>
      neighbourId(images, current, delta),
    )
  }

  // The viewer follows the same Left/Right keys as the LIFF gallery. The
  // listener exists only while the dialog is open.
  useEffect(() => {
    if (previewImageId === null) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const delta = event.key === 'ArrowRight' ? 1 : -1
      setPreviewImageId((current) => neighbourId(images, current, delta))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewImageId, images])

  function handleDeleteOrderOpen(next: boolean) {
    setDeleteOrderOpen(next)
    if (!next) setOrderError(null)
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
        <div className="flex items-start gap-2">
          <ButtonLink
            variant="ghost"
            size="icon"
            aria-label="กลับไปหน้ารวม"
            href="/order-images">
            <ChevronLeftIcon />
          </ButtonLink>

          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate text-xl font-semibold">
              ออเดอร์ {detail.order.orderNumber}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {formatThaiDate(detail.order.orderDate)} / ไลน์
              {detail.order.line} / โดย {creatorLabel}
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="ml-auto shrink-0"
            disabled={orderPending}
            onClick={() => setDeleteOrderOpen(true)}>
            ลบออเดอร์
          </Button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>ไอเท็ม {itemCount}</span>
          <span>รูป {images.length}</span>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {detail.items.length === 0 ? (
        <StateScreen
          headingLevel="h2"
          title="ออเดอร์นี้ยังไม่มีไอเท็ม"
          description="เพิ่มไอเท็มได้จากฟอร์ม LIFF"
        />
      ) : (
        detail.items.map((node) => (
          <ItemSection
            key={node.id}
            node={node}
            pendingImageId={pendingImageId}
            pendingDeleteId={pendingDeleteId}
            pendingItemId={pendingItemId}
            onPreview={setPreviewImageId}
            onPackageChange={changePackage}
            onDeleteImage={setDeleteImageId}
            onDeleteItem={setDeleteItemId}
          />
        ))
      )}

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImageId(null)
        }}>
        <DialogContent className="gap-0 p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">
            {previewImage
              ? `รูปที่ ${previewIndex + 1} จาก ${images.length}`
              : 'รูปภาพ'}
          </DialogTitle>

          {previewImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src */}
              <img
                src={`/api/liff/order-images/images/${previewImage.id}/file`}
                alt={`รูปที่ ${previewImage.seq}`}
                className="max-h-[80vh] w-full rounded-2xl bg-muted object-contain"
              />

              {images.length > 1 ? (
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
                    {previewIndex + 1} / {images.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label="รูปถัดไป"
                    disabled={previewIndex >= images.length - 1}
                    onClick={() => stepPreview(1)}>
                    <ChevronRightIcon />
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteImage !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteImageId(null)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบรูปภาพ</DialogTitle>
            <DialogDescription>
              {deleteImage
                ? `ลบรูปที่ ${deleteImage.seq} ออกถาวร ไม่สามารถกู้คืนได้`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteImageId(null)}
              disabled={pendingDeleteId !== null}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteImage}
              disabled={pendingDeleteId !== null}>
              ยืนยันลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemId(null)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบไอเท็ม</DialogTitle>
            <DialogDescription>
              {deleteItem ? deleteItemDescription(deleteItem) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteItemId(null)}
              disabled={pendingItemId !== null}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteItem}
              disabled={pendingItemId !== null}>
              ลบไอเท็ม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteOrderDialog
        open={deleteOrderOpen}
        onOpenChange={handleDeleteOrderOpen}
        orderNumber={detail.order.orderNumber}
        itemCount={itemCount}
        imageCount={images.length}
        pending={orderPending}
        error={orderError}
        onConfirm={confirmDeleteOrder}
      />
    </div>
  )
}

function ItemSection({
  node,
  pendingImageId,
  pendingDeleteId,
  pendingItemId,
  onPreview,
  onPackageChange,
  onDeleteImage,
  onDeleteItem,
}: {
  node: OrderItemNode
  pendingImageId: string | null
  pendingDeleteId: string | null
  pendingItemId: string | null
  onPreview: (id: string) => void
  onPackageChange: (image: ImageRecord, pkg: string | null) => void
  onDeleteImage: (id: string) => void
  onDeleteItem: (id: string) => void
}) {
  return (
    <section
      aria-label={`ไอเท็ม ${node.itemNumber}`}
      className="flex flex-col gap-3 rounded-xl border p-4">
      <ItemBlock
        node={node}
        level="pack"
        pendingImageId={pendingImageId}
        pendingDeleteId={pendingDeleteId}
        pendingItemId={pendingItemId}
        onPreview={onPreview}
        onPackageChange={onPackageChange}
        onDeleteImage={onDeleteImage}
        onDeleteItem={onDeleteItem}
      />

      {node.children.length > 0 ? (
        <div className="flex flex-col gap-3 border-t pt-3">
          {node.children.map((child) => (
            <ItemBlock
              key={child.id}
              node={child}
              level="variety"
              pendingImageId={pendingImageId}
              pendingDeleteId={pendingDeleteId}
              pendingItemId={pendingItemId}
              onPreview={onPreview}
              onPackageChange={onPackageChange}
              onDeleteImage={onDeleteImage}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function ItemBlock({
  node,
  level,
  pendingImageId,
  pendingDeleteId,
  pendingItemId,
  onPreview,
  onPackageChange,
  onDeleteImage,
  onDeleteItem,
}: {
  node: OrderItemNode
  level: 'pack' | 'variety'
  pendingImageId: string | null
  pendingDeleteId: string | null
  pendingItemId: string | null
  onPreview: (id: string) => void
  onPackageChange: (image: ImageRecord, pkg: string | null) => void
  onDeleteImage: (id: string) => void
  onDeleteItem: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {level === 'pack' ? (
          <h3 className="text-base font-semibold">ไอเท็ม {node.itemNumber}</h3>
        ) : (
          <h4 className="text-sm font-medium">ไอเท็ม {node.itemNumber}</h4>
        )}
        <span className="text-xs text-muted-foreground">
          รูป {node.images.length}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          aria-label={`ลบไอเท็ม ${node.itemNumber}`}
          disabled={pendingItemId !== null}
          onClick={() => onDeleteItem(node.id)}>
          <Trash2Icon />
        </Button>
      </div>

      <ImageGrid
        itemNumber={node.itemNumber}
        images={node.images}
        pendingImageId={pendingImageId}
        pendingDeleteId={pendingDeleteId}
        onPreview={onPreview}
        onPackageChange={onPackageChange}
        onDeleteImage={onDeleteImage}
      />
    </div>
  )
}

function ImageGrid({
  itemNumber,
  images,
  pendingImageId,
  pendingDeleteId,
  onPreview,
  onPackageChange,
  onDeleteImage,
}: {
  itemNumber: number
  images: ImageRecord[]
  pendingImageId: string | null
  pendingDeleteId: string | null
  onPreview: (id: string) => void
  onPackageChange: (image: ImageRecord, pkg: string | null) => void
  onDeleteImage: (id: string) => void
}) {
  if (images.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        ยังไม่มีรูปภาพ
      </p>
    )
  }

  return (
    <TileGrid label={`รูปภาพไอเท็ม ${itemNumber}`}>
      {images.map((image) => (
        <AdminImageTile
          key={image.id}
          image={image}
          pending={
            pendingImageId === image.id || pendingDeleteId === image.id
          }
          onPreview={() => onPreview(image.id)}
          onPackageChange={(pkg) => onPackageChange(image, pkg)}
          onDelete={() => onDeleteImage(image.id)}
        />
      ))}
    </TileGrid>
  )
}

function allImages(items: OrderItemNode[]): ImageRecord[] {
  return items.flatMap((item) => [...item.images, ...allImages(item.children)])
}

function countItems(items: OrderItemNode[]): number {
  return items.reduce((sum, item) => sum + 1 + countItems(item.children), 0)
}

function findItem(
  items: OrderItemNode[],
  id: string | null,
): OrderItemNode | null {
  if (!id) return null
  for (const item of items) {
    if (item.id === id) return item
    const child = findItem(item.children, id)
    if (child) return child
  }
  return null
}

function neighbourId(
  images: ImageRecord[],
  currentId: string | null,
  delta: number,
): string | null {
  const at = images.findIndex((image) => image.id === currentId)
  return at < 0 ? currentId : (images[at + delta]?.id ?? currentId)
}

function deleteItemDescription(node: OrderItemNode): string {
  const imageCount = allImages([node]).length
  const parts = [`ลบไอเท็ม ${node.itemNumber}`]
  if (node.children.length > 0) {
    parts.push(`พร้อมไอเท็มย่อย ${node.children.length} รายการ`)
  }
  parts.push(`และรูปภาพทั้งหมด ${imageCount} รูป`)
  return `${parts.join(' ')} ออกถาวร`
}
