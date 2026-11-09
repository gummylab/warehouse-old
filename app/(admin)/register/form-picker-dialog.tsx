'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FORM_REGISTRY } from '@/lib/forms/registry'

// The form picker shared by the approve dialog and the edit dialog on the
// approved table. It owns no state and no server action: the caller passes
// the form action from useActionState, so each path keeps its own optimistic
// update and toast. The checkboxes carry `name="formIds"`, which the action
// reads with formData.getAll, so selecting none is a valid submit (a user may
// be approved with no form at all).
export function FormPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  selectedFormIds,
  formAction,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  // Empty means the user has no form yet. Both dialogs default to this, so
  // approving never grants a form the admin did not tick.
  selectedFormIds: readonly string[]
  formAction: (formData: FormData) => void
  pending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">ฟอร์มที่อนุญาต</legend>
            {FORM_REGISTRY.map((form) => (
              <label
                key={form.id}
                className="flex items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="formIds"
                  value={form.id}
                  defaultChecked={selectedFormIds.includes(form.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span>{form.label}</span>
              </label>
            ))}
          </fieldset>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              ยกเลิก
            </DialogClose>
            {/* Base UI Button defaults to type="button", so the submit has to
                say so explicitly or the form never posts. */}
            <Button type="submit" disabled={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
