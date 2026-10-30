// Pure tree updates for the optimistic UI.
//
// The server stays the source of truth: these helpers only describe what the
// screen should show while a request is in flight and how the confirmed
// response replaces that preview. They have no React import, so the rules can
// be unit-tested without a browser.
import type {
  ImageRecord,
  OrderDetail,
  OrderItemNode,
} from '@/lib/db/types'

export type OrderTreeAction =
  | { type: 'add'; node: OrderItemNode }
  | { type: 'remove'; id: string }

export type ImageAction =
  | { type: 'package'; id: string; package: string | null }
  | { type: 'replace'; image: ImageRecord }
  | { type: 'remove'; id: string }

function byItemNumber(a: OrderItemNode, b: OrderItemNode): number {
  return a.itemNumber - b.itemNumber
}

function sorted(nodes: OrderItemNode[]): OrderItemNode[] {
  return [...nodes].sort(byItemNumber)
}

export function reduceOrderDetail(
  detail: OrderDetail,
  action: OrderTreeAction,
): OrderDetail {
  switch (action.type) {
    case 'add':
      return insertItemNode(detail, action.node)
    case 'remove':
      return removeItemNode(detail, action.id)
  }
}

export function reduceImages(
  images: ImageRecord[],
  action: ImageAction,
): ImageRecord[] {
  switch (action.type) {
    case 'package':
      return images.map((image) =>
        image.id === action.id ? { ...image, package: action.package } : image,
      )
    case 'replace':
      return images.map((image) =>
        image.id === action.image.id ? action.image : image,
      )
    case 'remove':
      return images.filter((image) => image.id !== action.id)
  }
}

// Adds a pack at the top level or a variety under its pack. The tree is kept
// sorted by item number so the tile order matches what a refetch would show.
export function insertItemNode(
  detail: OrderDetail,
  node: OrderItemNode,
): OrderDetail {
  if (node.parentItemId === null) {
    return { ...detail, items: sorted([...detail.items, node]) }
  }

  return {
    ...detail,
    items: detail.items.map((pack) =>
      pack.id === node.parentItemId
        ? { ...pack, children: sorted([...pack.children, node]) }
        : pack,
    ),
  }
}

// Deletes a pack together with its varieties, or one variety from its pack.
export function removeItemNode(detail: OrderDetail, id: string): OrderDetail {
  return {
    ...detail,
    items: detail.items
      .filter((pack) => pack.id !== id)
      .map((pack) =>
        pack.children.some((child) => child.id === id)
          ? { ...pack, children: pack.children.filter((child) => child.id !== id) }
          : pack,
      ),
  }
}
