'use client'

import { useActionState, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { type DataTableFeatures } from '@/components/data-table/data-table-features'
import { Button } from '@/components/ui/button'
import { type RegisterUser } from '@/lib/db/types'

import { toastMessages } from '@/lib/messages'
import { notifySuccess } from '@/lib/toast'

import { approveUser, rejectUser, type DecideActionState } from './actions'
import { actionsHeader, profileColumn, requestedAtColumn } from './columns'
import { FormPickerDialog } from './form-picker-dialog'
import { useRegisterDecision } from './register-decision-context'

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
    cell: ({ row }) => (
      <DecideButtons id={row.original.id} displayName={row.original.displayName} />
    ),
  }),
])

// Both decisions post straight to server actions (write + revalidate
// /register), so a decided row leaves the queue without the client
// navigating anywhere. Approving needs one dialog first now: the admin picks
// the form set in the same click that grants access, which is the only moment
// the choice is cheap.
function DecideButtons({ id, displayName }: { id: string; displayName: string }) {
  return (
    <div className="flex justify-center gap-2">
      <ApproveButton id={id} displayName={displayName} />
      <DecideButton
        id={id}
        displayName={displayName}
        label="ปฏิเสธ"
        variant="destructive"
        action={rejectUser}
        successMessage={toastMessages.userRejected}
      />
    </div>
  )
}

function ApproveButton({ id, displayName }: { id: string; displayName: string }) {
  const [open, setOpen] = useState(false)
  const { removeUser, reportError } = useRegisterDecision()

  const [, formAction, pending] = useActionState(
    async (
      previous: DecideActionState,
      formData: FormData,
    ): Promise<DecideActionState> => {
      const formIds = formData.getAll('formIds').map(String)
      // The row leaves the queue on the confirm click, matching the reject
      // path; the server's revalidated payload puts it back on a refusal.
      removeUser(id)
      const result = await approveUser(id, formIds)
      if (result) reportError(result.error)
      else notifySuccess(toastMessages.userApproved(displayName))
      return result
    },
    null,
  )

  return (
    <>
      <Button size="sm" variant="default" onClick={() => setOpen(true)}>
        อนุมัติ
      </Button>
      <FormPickerDialog
        open={open}
        onOpenChange={setOpen}
        title="อนุมัติผู้ใช้"
        description={`เลือกฟอร์มที่ "${displayName}" จะเห็น ไม่เลือกเลยก็ได้`}
        submitLabel="อนุมัติ"
        selectedFormIds={[]}
        formAction={formAction}
        pending={pending}
      />
    </>
  )
}

function DecideButton({
  id,
  displayName,
  label,
  variant,
  action,
  successMessage,
}: {
  id: string
  displayName: string
  label: string
  variant: 'default' | 'destructive'
  action: (id: string) => Promise<DecideActionState>
  successMessage: (name: string) => string
}) {
  const { removeUser, reportError } = useRegisterDecision()

  // The row leaves the table on the click: useOptimistic only accepts
  // updates made inside a transition or an action, and useActionState's
  // action is one. The server's revalidated payload replaces the row
  // afterwards, and puts it back if the write was refused.
  const [, formAction, pending] = useActionState(
    async (previous: DecideActionState): Promise<DecideActionState> => {
      removeUser(id)
      const result = await action(id)
      // A refusal is reported above the table, not next to the button:
      // the button unmounts together with the row it removed. A success is
      // announced after the write lands, so the toast cannot contradict a
      // row that had to come back.
      if (result) reportError(result.error)
      else notifySuccess(successMessage(displayName))
      return result
    },
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
    </div>
  )
}
