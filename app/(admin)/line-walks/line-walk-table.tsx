import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LineWalkListRow, LineWalkShift } from '@/lib/db/types'
import {
  formatThaiDate,
  formatThaiDateTime,
} from '@/lib/order-images/format'

const SHIFT_LABEL: Record<LineWalkShift, string> = {
  day: 'กลางวัน',
  night: 'กลางคืน',
}

// One row per line walk, read-only. The columns that matter least on a narrow
// window are hidden first; the wrapper keeps the rest horizontally scrollable.
export function LineWalkTable({ rows }: { rows: LineWalkListRow[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border md:min-h-0 md:flex-1">
      <Table containerClassName="md:min-h-0 md:flex-1 md:overflow-y-auto">
        <TableHeader className="[&_th]:border-b [&_th]:bg-background md:[&_th]:sticky md:[&_th]:top-0 md:[&_th]:z-10">
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>กะ</TableHead>
            <TableHead>ไลน์</TableHead>
            <TableHead>แบรนด์</TableHead>
            <TableHead className="hidden md:table-cell">Pack style</TableHead>
            <TableHead className="text-center">จำนวนคน</TableHead>
            <TableHead className="text-center">ยอดสินค้า</TableHead>
            <TableHead className="hidden lg:table-cell">ผู้บันทึก</TableHead>
            <TableHead className="hidden xl:table-cell">
              แก้ไขล่าสุด
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatThaiDate(row.walkDate)}</TableCell>
              <TableCell>{SHIFT_LABEL[row.shift]}</TableCell>
              <TableCell className="max-w-40 truncate">{row.line}</TableCell>
              <TableCell className="max-w-40 truncate">{row.brand}</TableCell>
              <TableCell className="hidden max-w-32 truncate md:table-cell">
                {row.packStyle}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {row.people.toLocaleString('th-TH')}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {row.amount.toLocaleString('th-TH')}
              </TableCell>
              <TableCell className="hidden max-w-40 truncate lg:table-cell">
                {row.creatorName}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {formatThaiDateTime(row.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
