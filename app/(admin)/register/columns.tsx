'use client'

import { createColumnHelper } from '@tanstack/react-table'
import { ArrowUpDownIcon, MoreHorizontalIcon } from 'lucide-react'

import { type DataTableFeatures } from '@/components/data-table/data-table-features'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type RegisterUser } from '@/lib/db/users'

import { UserAvatar } from './user-avatar'

const columnHelper = createColumnHelper<DataTableFeatures, RegisterUser>()

// Shared with the pending queue table so both tabs render identity and
// request dates identically.
export const profileColumn = columnHelper.accessor('displayName', {
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      โปรไฟล์
      <ArrowUpDownIcon className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row, getValue }) => (
    <div className="flex items-center gap-3">
      <UserAvatar
        displayName={row.original.displayName}
        avatarUrl={row.original.avatarUrl}
      />
      <span>{getValue()}</span>
    </div>
  ),
})

export const requestedAtColumn = columnHelper.accessor('requestedAt', {
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      วันที่ขอ
      <ArrowUpDownIcon className="ml-2 h-4 w-4" />
    </Button>
  ),
  // ISO strings sort chronologically, so the alphanumeric sort works as-is.
  // Explicit units keep seconds out of the displayed time.
  cell: ({ getValue }) =>
    new Date(getValue()).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
})

// Shared header for both action columns: the inner div beats the th's
// text-left default so the label centers over the column content.
export const actionsHeader = <div className="text-center">จัดการ</div>

const actionsColumn = columnHelper.display({
  id: 'actions',
  // Renderer function: TanStack's header type rejects a bare Element.
  header: () => actionsHeader,
  cell: () => (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="h-8 w-8 p-0" />}
        >
          <MoreHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">เปิดเมนู</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
          {/* TODO: wire revoke access to the backend API when it exists. */}
          <DropdownMenuItem variant="destructive">เพิกถอนสิทธิ์</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
})

// Approved users table: profile + request date + revoke action.
export const columns = columnHelper.columns([
  profileColumn,
  requestedAtColumn,
  actionsColumn,
])
