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
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เลขออเดอร์</TableHead>
            <TableHead>วันที่</TableHead>
            <TableHead className="hidden md:table-cell">ไลน์</TableHead>
            <TableHead className="text-right">ไอเท็ม</TableHead>
            <TableHead className="text-right">รูป</TableHead>
            <TableHead className="hidden lg:table-cell">ผู้สร้าง</TableHead>
            <TableHead className="hidden xl:table-cell">สร้างเมื่อ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
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
              <TableCell className="text-right tabular-nums">{row.itemCount}</TableCell>
              <TableCell className="text-right tabular-nums">{row.imageCount}</TableCell>
              <TableCell className="hidden max-w-48 truncate lg:table-cell">
                {row.creatorName ?? row.createdBy}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {formatThaiDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="text-right">
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
