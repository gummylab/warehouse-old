# Approval grants an explicit set of forms

Approving a request now opens a dialog with one checkbox per form, nothing ticked by default; the same dialog, opened from the approved table's "แก้ไข" button, replaces the set. The approved table shows the held forms in a "ฟอร์ม" badge column, and a user with none reads "ยังไม่มีฟอร์ม". Zero forms is a valid outcome: the user stays approved and the hub shows "ยังไม่ได้รับสิทธิ์แบบฟอร์ม".

The moment of approval is when the admin knows what the user should see, so the set is cheapest to choose there and cannot be forgotten afterwards. Nothing ticked is the least-privilege default: one click never grants a form the admin did not look at. Zero forms lets an admin suspend a user's forms without revoking the account, which would force the user to request access again.

This revises the queue's single-click rule from [ADR 0008](0008-optimistic-removal-in-the-register-queue.md) for approval only. Reject stays one click, because a rejection deletes the request and has nothing to configure.

## Considered options

- **Keep one-click approve with every form, and edit afterwards.** Rejected: it grants access the admin did not choose, even if only until the edit.
- **Inline checkboxes in the queue row.** Rejected: the table is already wide, and per-row form state would have to live above the table, away from the button that owns the action.
- **Require at least one form to approve.** Rejected: zero forms is useful as a suspension, and the hub already has an empty state for it.

## Consequences

- Approval writes the status flip and its grants in one transaction, so a failed grant write cannot leave an approved user with the wrong set.
- The approve and edit dialogs share `form-picker-dialog.tsx`; each caller passes its own action, so the two paths keep separate optimistic updates and toasts.
- The set is replaced, not merged, when edited: a form no longer ticked loses its row.
- A grant can only come from the checkbox list, and the data layer drops ids the registry does not ship, so a forged form id grants nothing.
