'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ImagePlusIcon, PlusIcon, Trash2Icon } from 'lucide-react'

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
import type { OrderDetail, OrderItemNode } from '@/lib/db/order-images'
import { formatThaiDate } from '@/lib/order-images/format'
import { nextSingleNumber, nextVarietyNumber } from '@/lib/order-images/item-number'

import { addItem, deleteItem, errorMessage, getOrder } from './order-image-api'

// Step 2: the order's item tree. Each card keeps only what is read at a
// glance: the item name, its photo and variety counts, and two quiet header
// icons — photos first (ImagePlus), delete second. Photos themselves live on
// the item's own page, so a card stays compact even when an item holds many
// pictures. Numbering previews come from the same pure helpers the server
// uses, so every label matches what the server will actually create.
// Mutations refetch the whole tree, which keeps concurrent uploads and
// deletes convergent.
export function OrderItemsStep({
  detail,
  onDetailChange,
}: {
  detail: OrderDetail
  onDetailChange: (detail: OrderDetail) => void
}) {
  const router = useRouter()
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
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">ออเดอร์ {detail.order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {formatThaiDate(detail.order.orderDate)} · ไลน์ {detail.order.line}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/liff/form/order-image')}>
          เปลี่ยนออเดอร์
        </Button>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isEmpty ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">ออเดอร์นี้ยังไม่มีไอเท็ม</p>
          <Button disabled={busy} onClick={() => void handleAdd(null)}>
            <PlusIcon />
            {busy ? 'กำลังเพิ่ม...' : `เพิ่มไอเท็มแรก (${nextTop})`}
          </Button>
        </div>
      ) : (
        detail.items.map((node) => (
          <ItemCard
            key={node.id}
            node={node}
            busy={busy}
            onAdd={(parentItemId) => void handleAdd(parentItemId)}
            onDelete={setConfirmItem}
          />
        ))
      )}

      {!isEmpty && (
        <Button variant="outline" disabled={busy} onClick={() => void handleAdd(null)}>
          <PlusIcon />
          {busy ? 'กำลังเพิ่ม...' : `เพิ่มไอเท็ม (${nextTop})`}
        </Button>
      )}

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

// One item (single or pack) with its photos and its varieties nested
// underneath. The photo count replaces the old เดี่ยว/ย่อย badges: the
// nesting already shows the relationship, so the badge only added noise.
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
    <section className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">ไอเท็ม {node.itemNumber}</h3>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{node.images.length} รูป</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              node.images.length > 0 ? `ดูรูปภาพไอเท็ม ${node.itemNumber}` : `เพิ่มรูปภาพไอเท็ม ${node.itemNumber}`
            }
            render={<Link href={`/liff/form/order-image/items/${node.id}`} />}>
            <ImagePlusIcon />
          </Button>
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

      {node.children.length > 0 && (
        <div className="flex flex-col gap-2">
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">ไอเท็ม {child.itemNumber}</h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{child.images.length} รูป</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      child.images.length > 0
                        ? `ดูรูปภาพไอเท็ม ${child.itemNumber}`
                        : `เพิ่มรูปภาพไอเท็ม ${child.itemNumber}`
                    }
                    render={<Link href={`/liff/form/order-image/items/${child.id}`} />}>
                    <ImagePlusIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`ลบไอเท็ม ${child.itemNumber}`}
                    disabled={busy}
                    onClick={() => onDelete(child)}>
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={busy || nextVariety === null}
        onClick={() => onAdd(node.id)}>
        <PlusIcon />
        {nextVariety === null ? 'ไอเท็มย่อยครบแล้ว (9 รายการ)' : `เพิ่มไอเท็มย่อย (${nextVariety})`}
      </Button>
    </section>
  )
}
