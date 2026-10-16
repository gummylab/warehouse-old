'use client'

import { useActionState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { type DataTableFeatures } from '@/components/data-table/data-table-features'
import { Button } from '@/components/ui/button'
import { type RegisterUser } from '@/lib/db/users'

import { approveUser, rejectUser, type DecideActionState } from './actions'
import { actionsHeader, profileColumn, requestedAtColumn } from './columns'

const columnHelper = createColumnHelper<DataTableFeatures, RegisterUser>()

// Approval queue table: same identity columns as the approved table, but with
// one-click approve/reject instead of a dropdown: the queue is high-frequency
// work, so each action must cost a single click.
export const pendingColumns = columnHelper.columns([
  profileColumn,
  requestedAtColumn,
  columnHelper.display({
    id: 'actions',
    header: () => actionsHeader,
    cell: ({ row }) => <DecideButtons id={row.original.id} />,
  }),
])

// Both buttons post straight to server actions (write + revalidate
// /register), so a decided row leaves the queue without the client
// navigating anywhere.
function DecideButtons({ id }: { id: string }) {
  return (
    <div className="flex justify-center gap-2">
      <DecideButton id={id} label="อนุมัติ" variant="default" action={approveUser} />
      <DecideButton id={id} label="ปฏิเสธ" variant="destructive" action={rejectUser} />
    </div>
  )
}

function DecideButton({
  id,
  label,
  variant,
  action,
}: {
  id: string
  label: string
  variant: 'default' | 'destructive'
  action: (id: string) => Promise<DecideActionState>
}) {
  // bind() pre-fills the id argument; useActionState still calls the action
  // with (prevState, formData) and the action ignores the extras. The hook
  // tracks the pending state (button disables while writing) and carries
  // the error message back for rendering.
  const [state, formAction, pending] = useActionState(
    action.bind(null, id),
    null,
  )

  return (
    <div className="flex flex-col items-center gap-1">
      <form action={formAction}>
        {/* Base UI Button defaults to type="button" (unlike native HTML),
            so without an explicit submit it never posts the action. */}
        <Button size="sm" variant={variant} type="submit" disabled={pending}>
          {label}
        </Button>
      </form>
      {state && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  )
}
