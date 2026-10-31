import Link from 'next/link'

import { ButtonLink } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OrderListRow } from '@/lib/db/types'
import {
  formatThaiDate,
  formatThaiDateTime,
} from '@/lib/order-images/format'

// One row per order. The columns that matter least on a narrow window are
// hidden first; the wrapper from the Table primitive keeps the rest
// horizontally scrollable.
export function OrderTable({ rows }: { rows: OrderListRow[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border md:min-h-0 md:flex-1">
      <Table containerClassName="md:min-h-0 md:flex-1 md:overflow-y-auto">
        <TableHeader className="[&_th]:border-b [&_th]:bg-background md:[&_th]:sticky md:[&_th]:top-0 md:[&_th]:z-10">
          <TableRow>
            <TableHead>เลขออเดอร์</TableHead>
            <TableHead>วันที่</TableHead>
            <TableHead className="hidden md:table-cell">ไลน์</TableHead>
            <TableHead className="text-center">ไอเท็ม</TableHead>
            <TableHead className="hidden lg:table-cell">ผู้สร้าง</TableHead>
            <TableHead className="hidden xl:table-cell">สร้างเมื่อ</TableHead>
            <TableHead className="text-center">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/order-images/${row.id}`}
                  className="text-primary underline-offset-4 hover:underline">
                  {row.orderNumber}
                </Link>
              </TableCell>
              <TableCell>{formatThaiDate(row.orderDate)}</TableCell>
              <TableCell className="hidden max-w-40 truncate md:table-cell">
                {row.line}
              </TableCell>
              <TableCell className="text-center tabular-nums">{row.itemCount}</TableCell>
              <TableCell className="hidden max-w-48 truncate lg:table-cell">
                {row.creatorName ?? row.createdBy}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {formatThaiDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="text-center">
                <ButtonLink
                  variant="ghost"
                  size="sm"
                  href={`/order-images/${row.id}`}>
                  เปิด
                </ButtonLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
