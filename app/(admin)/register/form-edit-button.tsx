'use client'

import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'

import { toastMessages } from '@/lib/messages'
import { notifySuccess } from '@/lib/toast'

import { updateUserForms, type DecideActionState } from './actions'
import { FormPickerDialog } from './form-picker-dialog'
import { useRegisterDecision } from './register-decision-context'

// Edit action for the approved table. Opens the same dialog the approve path
// uses, pre-ticked with the current grants, and replaces the whole set.
export function FormEditButton({
  id,
  displayName,
  formIds,
}: {
  id: string
  displayName: string
  formIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const { updateForms, reportError } = useRegisterDecision()

  const [, formAction, pending] = useActionState(
    async (
      previous: DecideActionState,
      formData: FormData,
    ): Promise<DecideActionState> => {
      const next = formData.getAll('formIds').map(String)
      // The badges swap before the round trip. On a refusal the overlay
      // reverts and the dialog stays open with the operator's selection.
      updateForms(id, next)
      const result = await updateUserForms(id, next)
      if (result) {
        reportError(result.error)
      } else {
        setOpen(false)
        notifySuccess(toastMessages.userFormsSaved(displayName))
      }
      return result
    },
    null,
  )

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        แก้ไข
      </Button>
      <FormPickerDialog
        open={open}
        onOpenChange={setOpen}
        title="แก้ไขสิทธิ์ฟอร์ม"
        description={`เลือกฟอร์มที่ "${displayName}" จะเห็น`}
        submitLabel="บันทึก"
        selectedFormIds={formIds}
        formAction={formAction}
        pending={pending}
      />
    </>
  )
}
