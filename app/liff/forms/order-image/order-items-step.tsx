'use client'

import { useState } from 'react'

import { ImagePlusIcon, PlusIcon, Trash2Icon } from 'lucide-react'

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
import type { OrderDetail, OrderItemNode } from '@/lib/db/types'
import { nextSingleNumber, nextVarietyNumber } from '@/lib/order-images/item-number'
import { cn } from '@/lib/utils'

import { addItem, deleteItem, errorMessage, getOrder } from './order-image-api'

// Step 2: the order's item tree. The order itself is named in the navbar
// above (see order-image-form.tsx); this step owns the tree of item cards.
// Each card keeps only what is read at a glance: the item name, its photo
// and variety counts, and two quiet header icons — photos first
// (ImagePlus), delete second. Photos themselves live on the item's own
// page, so a card stays compact even when an item holds many pictures.
// Numbering previews come from the same pure helpers the server uses, so
// every label matches what the server will actually create. Mutations
// refetch the whole tree, which keeps concurrent uploads and deletes
// convergent.
export function OrderItemsStep({
  detail,
  onDetailChange,
}: {
  detail: OrderDetail
  onDetailChange: (detail: OrderDetail) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One shared confirm dialog serves every item card (top level or
  // variety) — a dialog per card would duplicate identical markup.
  const [confirmItem, setConfirmItem] = useState<OrderItemNode | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  async function refresh() {
    const result = await getOrder(detail.order.id)
    if (result.ok) onDetailChange(result.data)
    else setError(errorMessage(result.error, result.status))
  }

  async function handleAdd(parentItemId: string | null) {
    setBusy(true)
    setError(null)
    try {
      const result = await addItem(detail.order.id, parentItemId)
      if (!result.ok) {
        setError(errorMessage(result.error, result.status))
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!confirmItem) return
    setBusy(true)
    setDialogError(null)
    try {
      const result = await deleteItem(confirmItem.id)
      if (!result.ok) {
        // Stays inside the dialog: the user is still deciding there, and
        // a failure (already deleted elsewhere) must not vanish silently.
        setDialogError(errorMessage(result.error, result.status))
        return
      }
      setConfirmItem(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const nextTop = nextSingleNumber(detail.items.map((node) => node.itemNumber))
  const isEmpty = detail.items.length === 0

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {detail.items.map((node) => (
        <ItemCard
          key={node.id}
          node={node}
          busy={busy}
          onAdd={(parentItemId) => void handleAdd(parentItemId)}
          onDelete={setConfirmItem}
        />
      ))}

      {/* The frame that closes the list: one cell, the one that adds the next
          item. With no items yet this frame is the whole page and carries the
          empty message at its bottom, exactly like the photo grid does. */}
      <section className="relative grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 border p-4 rounded-xl">
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 border-dashed py-13 rounded-xl"
          disabled={busy}
          onClick={() => void handleAdd(null)}>
          <PlusIcon />
          <span className="text-xs leading-tight">เพิ่มไอเท็ม</span>
          <span className="text-xs leading-tight text-muted-foreground">({nextTop})</span>
        </Button>

        {isEmpty && <p className="absolute bottom-4 right-4 text-sm text-muted-foreground">ออเดอร์นี้ยังไม่มีไอเท็ม</p>}
      </section>

      <Dialog
        open={confirmItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmItem(null)
            setDialogError(null)
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบไอเท็ม</DialogTitle>
            <DialogDescription>{confirmItem ? deleteDescription(confirmItem) : ''}</DialogDescription>
          </DialogHeader>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
            <Button variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? 'กำลังลบ...' : 'ลบไอเท็ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Spells out what actually disappears: the item, its varieties, and the
// real photo count across both levels.
function deleteDescription(node: OrderItemNode): string {
  const totalImages = node.images.length + node.children.reduce((sum, child) => sum + child.images.length, 0)
  const parts = [`ลบไอเท็ม ${node.itemNumber}`]
  if (node.children.length > 0) {
    parts.push(`พร้อมไอเท็มย่อย ${node.children.length} รายการ`)
  }
  parts.push(`และรูปภาพทั้งหมด ${totalImages} รูป`)
  return `${parts.join(' ')} ออกถาวร`
}

// One tile: the item number, its photo count and the two quiet controls.
// The pack and its varieties render through this same component, so the
// two class strings below are the only thing that tells them apart.
function ItemTile({
  node,
  busy,
  onDelete,
}: {
  node: OrderItemNode
  busy: boolean
  onDelete: (node: OrderItemNode) => void
}) {
  // A pack is an item without a parent; a variety hangs under one. The
  // same rule the server uses to tell the two levels apart.
  const isPack = node.parentItemId === null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-2 rounded-xl border px-2 py-10',
        isPack ? 'bg-blue-400/10 border-primary/20' : 'bg-yellow-400/10 border-border'
      )}>
      <h3 className="font-medium text-sm">ไอเท็ม {node.itemNumber}</h3>
      <div className="flex flex-col gap-y-2 items-center gap-1">
        <span className="text-xs text-muted-foreground">จำนวน {node.images.length} ภาพ</span>
        <div className="flex gap-x-2">
          <ButtonLink
            variant="ghost"
            size="icon-sm"
            aria-label={
              node.images.length > 0 ? `ดูรูปภาพไอเท็ม ${node.itemNumber}` : `เพิ่มรูปภาพไอเท็ม ${node.itemNumber}`
            }
            href={`/liff/forms/order-image/items/${node.id}`}>
            <ImagePlusIcon />
          </ButtonLink>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`ลบไอเท็ม ${node.itemNumber}`}
            disabled={busy}
            onClick={() => onDelete(node)}>
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </div>
  )
}

// One pack and its varieties as a responsive grid of equal tiles.
//
// The column count follows the viewport instead of a fixed list of
// breakpoints: auto-fill keeps every tile the same width (the last row
// may end with empty space) and minmax sets the narrowest a tile may get.
// On a phone that lands on two columns.
//
// The add button is the last cell of the same grid, so it sits exactly
// where the next variety will appear.
function ItemCard({
  node,
  busy,
  onAdd,
  onDelete,
}: {
  node: OrderItemNode
  busy: boolean
  onAdd: (parentItemId: string | null) => void
  onDelete: (node: OrderItemNode) => void
}) {
  const nextVariety = nextVarietyNumber(
    node.itemNumber,
    node.children.map((child) => child.itemNumber)
  )

  return (
    <section className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 border p-4 rounded-xl">
      <ItemTile node={node} busy={busy} onDelete={onDelete} />

      {node.children.map((child) => (
        <ItemTile key={child.id} node={child} busy={busy} onDelete={onDelete} />
      ))}

      {/* A full pack has no room for another variety, so the cell is left
          out entirely instead of showing a button that cannot do anything.
          The visible label is split over two lines so it fits the tile
          width, while the accessible name stays the single phrase the
          form and the e2e spec look for.

          h-auto overrides the fixed h-9 that buttonVariants sets: a grid
          item with a fixed height does not stretch to the row height, so
          the button would sit as a short pill in a tall cell. py-10 and
          gap-2 then give it the same box proportions as the tiles above. */}
      {nextVariety !== null && (
        <Button
          variant="outline"
          aria-label={`เพิ่มไอเท็มย่อย (${nextVariety})`}
          className="h-auto flex-col gap-2 border-dashed py-10 rounded-xl"
          disabled={busy}
          onClick={() => onAdd(node.id)}>
          <PlusIcon />
          <span className="text-xs leading-tight">เพิ่ม Variety Pack</span>
          <span className="text-xs leading-tight text-muted-foreground">({nextVariety})</span>
        </Button>
      )}
    </section>
  )
}
