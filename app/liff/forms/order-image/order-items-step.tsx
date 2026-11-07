'use client'

import { Fragment, startTransition, useOptimistic, useRef, useState } from 'react'

import {
  ImagePlusIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { TileButton, TileGrid } from '@/components/layout/tile-grid'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
import { toastMessages } from '@/lib/messages'
import { matchesItemNumber, nextSingleNumber, nextVarietyNumber } from '@/lib/order-images/item-number'
import { reduceOrderDetail } from '@/lib/order-images/tree'
import { notifyError, notifySuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { addItem, deleteItem, errorMessage } from './order-image-api'

// Step 2: the order's item tree. The order itself is named in the navbar
// above (see order-image-form.tsx); this step owns the tree of item cards.
// Each card keeps only what is read at a glance: the item name, its photo
// and variety counts, and two quiet header icons — photos first
// (ImagePlus), delete second. Photos themselves live on the item's own
// page, so a card stays compact even when an item holds many pictures.
// Numbering previews come from the same pure helpers the server uses, so
// every label matches what the server will actually create. A mutation shows
// its result immediately, and the server response replaces that preview with
// the real row.
export function OrderItemsStep({
  detail,
  onDetailChange,
}: {
  detail: OrderDetail
  // Receives the latest base tree, so overlapping actions cannot write a
  // stale snapshot over each other.
  onDetailChange: (updater: (current: OrderDetail) => OrderDetail) => void
}) {
  const [optimisticDetail, applyOptimistic] = useOptimistic(detail, reduceOrderDetail)
  // Per-parent locks: two top-level adds cannot race for the same number,
  // while a variety under another pack stays available.
  const [pendingAddKeys, setPendingAddKeys] = useState<ReadonlySet<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const tempIdRef = useRef(0)
  // One shared confirm dialog serves every item card (top level or
  // variety) — a dialog per card would duplicate identical markup.
  const [confirmItem, setConfirmItem] = useState<OrderItemNode | null>(null)
  // Instant filter over the item numbers. Local state on purpose: finding a
  // card on this screen is not a view worth keeping in the URL.
  const [query, setQuery] = useState('')

  function markAddPending(key: string, pending: boolean) {
    setPendingAddKeys((prev) => {
      const next = new Set(prev)
      if (pending) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function handleAdd(parentItemId: string | null) {
    const parentKey = parentItemId ?? 'root'
    if (pendingAddKeys.has(parentKey)) return

    const parent = parentItemId
      ? optimisticDetail.items.find((node) => node.id === parentItemId)
      : null
    if (parentItemId && !parent) return

    const itemNumber = parent
      ? nextVarietyNumber(
          parent.itemNumber,
          parent.children.map((child) => child.itemNumber),
        )
      : nextSingleNumber(optimisticDetail.items.map((node) => node.itemNumber))
    if (itemNumber === null) return

    // A filtered list would hide the card that is about to appear, so the
    // search is dropped only when the new number falls outside it. A number
    // that already matches keeps the filter the user set.
    if (!matchesItemNumber(itemNumber, query)) setQuery('')

    const tempId = `temp-${tempIdRef.current++}`
    const temp: OrderItemNode = {
      id: tempId,
      orderId: detail.order.id,
      parentItemId,
      itemNumber,
      // Client-only placeholder; the real row is added to the base and this
      // preview disappears when the transition ends.
      createdBy: 'pending',
      createdAt: new Date().toISOString(),
      images: [],
      children: [],
    }

    markAddPending(parentKey, true)
    startTransition(async () => {
      applyOptimistic({ type: 'add', node: temp })
      try {
        const result = await addItem(detail.order.id, parentItemId)
        if (!result.ok) {
          notifyError(toastMessages.itemAddFailed, {
            description: errorMessage(result.error, result.status),
          })
          return
        }
        // Cancel the preview before the base gets the real row. Otherwise
        // the overlay re-applies the optimistic add to the new base and the
        // temp tile renders next to the real one for a frame.
        applyOptimistic({ type: 'remove', id: tempId })
        onDetailChange((current) =>
          reduceOrderDetail(current, {
            type: 'add',
            node: { ...result.data.item, images: [], children: [] },
          }),
        )
        notifySuccess(toastMessages.itemAdded(result.data.item.itemNumber))
      } finally {
        markAddPending(parentKey, false)
      }
    })
  }

  function confirmDelete() {
    if (!confirmItem || pendingDeleteId) return
    const target = confirmItem
    // Close first: the row is already leaving the screen, so keeping the
    // dialog open would make the delete feel slower than it is.
    setConfirmItem(null)
    setPendingDeleteId(target.id)
    startTransition(async () => {
      applyOptimistic({ type: 'remove', id: target.id })
      try {
        const result = await deleteItem(target.id)
        if (!result.ok) {
          notifyError(toastMessages.itemDeleteFailed, {
            description: errorMessage(result.error, result.status),
          })
          return
        }
        onDetailChange((current) =>
          reduceOrderDetail(current, { type: 'remove', id: target.id }),
        )
        notifySuccess(toastMessages.itemDeleted(target.itemNumber, target.children.length))
      } finally {
        setPendingDeleteId(null)
      }
    })
  }

  const nextTop = nextSingleNumber(
    optimisticDetail.items.map((node) => node.itemNumber),
  )
  // Matching is per tile: searching 220 shows item 220 alone, not the pack's
  // other varieties. A pack survives the filter when either its own number or
  // one of its varieties answers the query.
  const filtering = query.trim() !== ''
  const visibleItems = optimisticDetail.items
    .map((node) => ({
      node,
      showPack: matchesItemNumber(node.itemNumber, query),
      varieties: node.children.filter((child) => matchesItemNumber(child.itemNumber, query)),
    }))
    .filter((entry) => entry.showPack || entry.varieties.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative min-w-0 flex-1 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            // Item numbers are whole numbers, so the phone opens its number
            // pad. The browser's own clear button is hidden: the button below
            // sits in the same corner.
            inputMode="numeric"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาเลขไอเท็ม"
            aria-label="ค้นหาเลขไอเท็ม"
            className="pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="ล้างช่องค้นหา"
              onClick={() => setQuery('')}>
              <XIcon />
            </Button>
          ) : null}
        </div>

        <Button
          type="button"
          className="shrink-0"
          disabled={pendingAddKeys.has('root')}
          onClick={() => handleAdd(null)}>
          <PlusIcon />
          เพิ่มไอเท็ม ({nextTop})
        </Button>
      </div>

      {optimisticDetail.items.length === 0 ? (
        <EmptyState
          variant="section"
          icon={<PackageIcon />}
          title="ยังไม่มีไอเท็ม"
          description="เพิ่มไอเท็มแรกด้วยปุ่มด้านบน แล้วแนบรูปภาพในหน้าไอเท็ม"
        />
      ) : (
        <>
          {visibleItems.map((entry, index) => (
            <Fragment key={entry.node.id}>
              {index > 0 ? <Separator /> : null}
              <ItemCard
                node={entry.node}
                varieties={entry.varieties}
                showPack={entry.showPack}
                filtering={filtering}
                pendingAddKeys={pendingAddKeys}
                deletePending={pendingDeleteId !== null}
                onAdd={handleAdd}
                onDelete={setConfirmItem}
              />
            </Fragment>
          ))}

          {/* The order has items, but the search hid them all. The no-item
              state above takes precedence, so this only reports a filter
              miss. */}
          {query.trim() && visibleItems.length === 0 ? (
            <EmptyState
              variant="inline"
              announce
              icon={<SearchXIcon />}
              title={`ไม่พบไอเท็มที่ตรงกับเลข ${query.trim()}`}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery('')}>
                  ล้างคำค้นหา
                </Button>
              }
            />
          ) : null}
        </>
      )}

      <Dialog
        open={confirmItem !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmItem(null)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบไอเท็ม</DialogTitle>
            <DialogDescription>{confirmItem ? deleteDescription(confirmItem) : ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              ลบไอเท็ม
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
  deletePending,
  onDelete,
}: {
  node: OrderItemNode
  deletePending: boolean
  onDelete: (node: OrderItemNode) => void
}) {
  // A pack is an item without a parent; a variety hangs under one. The
  // same rule the server uses to tell the two levels apart.
  const isPack = node.parentItemId === null
  const isTemp = node.id.startsWith('temp-')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-2 rounded-xl border px-2 py-10',
        isPack ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-border',
        isTemp && 'opacity-60'
      )}>
      {isPack ? (
        <h2 className="font-medium text-sm">ไอเท็ม {node.itemNumber}</h2>
      ) : (
        <h3 className="font-medium text-sm">ไอเท็ม {node.itemNumber}</h3>
      )}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-muted-foreground">จำนวน {node.images.length} ภาพ</span>
        <div className="flex gap-2">
          {isTemp ? (
            // No row exists behind a temporary node yet, so its photo link
            // would open an item page that does not exist.
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={`กำลังสร้างไอเท็ม ${node.itemNumber}`}>
              <ImagePlusIcon />
            </Button>
          ) : (
            <ButtonLink
              variant="ghost"
              size="icon-sm"
              aria-label={
                node.images.length > 0 ? `ดูรูปภาพไอเท็ม ${node.itemNumber}` : `เพิ่มรูปภาพไอเท็ม ${node.itemNumber}`
              }
              href={`/liff/forms/order-image/items/${node.id}`}>
              <ImagePlusIcon />
            </ButtonLink>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`ลบไอเท็ม ${node.itemNumber}`}
            disabled={deletePending || isTemp}
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
  varieties,
  showPack,
  filtering,
  pendingAddKeys,
  deletePending,
  onAdd,
  onDelete,
}: {
  node: OrderItemNode
  // Already filtered by the search. The pack's own tile is not in here.
  varieties: OrderItemNode[]
  showPack: boolean
  filtering: boolean
  pendingAddKeys: ReadonlySet<string>
  deletePending: boolean
  onAdd: (parentItemId: string | null) => void
  onDelete: (node: OrderItemNode) => void
}) {
  const isTemp = node.id.startsWith('temp-')
  // Numbering reads the full child list, never the filtered one: a variety
  // hidden by the search still holds its number.
  const nextVariety = isTemp
    ? null
    : nextVarietyNumber(
        node.itemNumber,
        node.children.map((child) => child.itemNumber)
      )

  return (
    <TileGrid
      label={`ไอเท็ม ${node.itemNumber}`}
      className="border-0 p-0">
      {showPack ? (
        <ItemTile node={node} deletePending={deletePending} onDelete={onDelete} />
      ) : null}

      {varieties.map((child) => (
        <ItemTile key={child.id} node={child} deletePending={deletePending} onDelete={onDelete} />
      ))}

      {/* A full pack has no room for another variety, so the cell is left
          out entirely instead of showing a button that cannot do anything.
          The visible label is split over two lines so it fits the tile
          width, while the accessible name stays the single phrase the
          form and the e2e spec look for. Hidden while the search is on: the
          results should be the matches, not an extra action cell. */}
      {!filtering && nextVariety !== null && (
        <TileButton
          aria-label={`เพิ่มไอเท็มย่อย (${nextVariety})`}
          label="เพิ่ม Variety Pack"
          hint={`(${nextVariety})`}
          disabled={pendingAddKeys.has(node.id)}
          onClick={() => onAdd(node.id)}
        />
      )}
    </TileGrid>
  )
}
