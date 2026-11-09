'use client'

import { createColumnHelper } from '@tanstack/react-table'
import { ArrowUpDownIcon } from 'lucide-react'

import { type DataTableFeatures } from '@/components/data-table/data-table-features'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type RegisterUser } from '@/lib/db/types'
import { formById } from '@/lib/forms/registry'

import { FormEditButton } from './form-edit-button'
import { RevokeButton } from './revoke-button'
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

// The grant set at a glance: one badge per form with its full page title.
// The column is not sortable or filterable: the set is small, and the search
// box already covers the only thing an operator types here (a name).
export const formsColumn = columnHelper.display({
  id: 'forms',
  header: 'ฟอร์ม',
  cell: ({ row }) =>
    row.original.formIds.length === 0 ? (
      <span className="text-sm text-muted-foreground">ยังไม่มีฟอร์ม</span>
    ) : (
      <div className="flex flex-wrap gap-1">
        {row.original.formIds.map((id) => (
          <Badge key={id} variant="secondary">
            {formById(id)?.label ?? id}
          </Badge>
        ))}
      </div>
    ),
})

const actionsColumn = columnHelper.display({
  id: 'actions',
  // Renderer function: TanStack's header type rejects a bare Element.
  header: () => actionsHeader,
  cell: ({ row }) => (
    <div className="flex justify-center gap-2">
      {/* Two direct buttons beat a dropdown (one click each, same rule the
          pending queue follows); the destructive one keeps its confirm
          dialog, the edit one its form picker. */}
      <FormEditButton
        id={row.original.id}
        displayName={row.original.displayName}
        formIds={row.original.formIds}
      />
      <RevokeButton id={row.original.id} displayName={row.original.displayName} />
    </div>
  ),
})

// Approved users table: profile + request date + granted forms + actions.
export const columns = columnHelper.columns([
  profileColumn,
  requestedAtColumn,
  formsColumn,
  actionsColumn,
])
