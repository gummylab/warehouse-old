// The shapes the client components receive.
//
// They live apart from the data layer on purpose. A Client Component may
// import a type from a server module, but not a value: importing a value
// would pull better-sqlite3 into the client bundle. Splitting the types
// out means the data layer can carry the `server-only` marker (which makes
// a mistaken value import a build error instead of a runtime surprise)
// while the client keeps importing its shapes from a module that has no
// server dependency at all.
//
// 'rejected' is deliberately absent: rejecting a request deletes the row
// (ADR 0003), so the only stored statuses are pending and approved.

export type RegisterUser = {
  id: string
  displayName: string
  // LINE picture URL; absent falls back to the first letter of the name.
  avatarUrl?: string
  status: 'pending' | 'approved'
  // ISO 8601. Stored as a string so server and client formats never clash.
  requestedAt: string
}

export type OrderRecord = {
  id: string
  orderNumber: string
  orderDate: string // Bangkok calendar date 'YYYY-MM-DD'
  line: string
  createdBy: string // LINE user id or 'local-device' (ADR 0004)
  createdAt: string
}

export type ItemRecord = {
  id: string
  orderId: string
  parentItemId: string | null
  itemNumber: number
  createdBy: string
  createdAt: string
}

export type ImageRecord = {
  id: string
  itemId: string
  orderId: string
  seq: number
  package: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  createdBy: string
  createdAt: string
}

export type OrderItemNode = ItemRecord & {
  images: ImageRecord[]
  children: OrderItemNode[]
}

export type OrderDetail = {
  order: OrderRecord
  items: OrderItemNode[] // top-level only; varieties nested under children
}

// The admin list reads one row per order, with the counts and the creator
// name already resolved by SQL. The shapes live here, apart from the data
// layer, so a Client Component can import them without pulling in
// better-sqlite3.
export type OrderPeriod = 'day' | 'month' | 'year'

// The overview grain doubles as the KPI window and the trend chart step. It is
// a view option, not a table filter: the strip and the chart always cover the
// whole system and ignore the line and search controls.
export type TrendGrain = 'day' | 'month' | 'year'

// One point in the trend chart. `bucket` is 'YYYY-MM-DD', 'YYYY-MM' or 'YYYY',
// matching the grain the point belongs to.
export type TrendPoint = {
  bucket: string
  count: number
}

export type OrderOverviewRange = {
  points: TrendPoint[]
  summary: OrderSummary
}

export type OrderOverview = Record<TrendGrain, OrderOverviewRange>

export type OrderListFilters = {
  period: OrderPeriod
  // Anchor date ('YYYY-MM-DD'); the range below is derived from it.
  date: string
  from: string
  to: string
  line: string | null
  query: string | null
  page: number
  pageSize: number
}

export type OrderListRow = OrderRecord & {
  itemCount: number
  creatorName: string | null
}

export type OrderListResult = {
  rows: OrderListRow[]
  total: number
  page: number
  pageCount: number
}

export type OrderSummary = {
  orders: number
  items: number
  images: number
}

// One item with the order it belongs to: everything the item-images page
// needs, scoped to a single item instead of the whole order tree.
export type ItemDetail = {
  order: OrderRecord
  item: ItemRecord
  images: ImageRecord[]
}
