// The forms an approved LINE user can be granted. One entry per LIFF feature
// page (see "แบบฟอร์ม" in GLOSSARY.md).
//
// Data-only and client-safe on purpose: the register screen renders the
// labels, the LIFF hub renders the cards, the gate matches a pathname, and
// lib/db/seed-forms.ts writes the ids into the `forms` table. The label comes
// from PAGE_TITLES so a form's name exists once, for the page title and the
// register badge alike.
import { PAGE_TITLES } from '../page-titles'

export type FormId = 'order-image' | 'line-walk'

export type FormEntry = {
  id: FormId
  // Route of the form page. The hub links here and the gate compares the
  // current pathname against it.
  path: string
  // Full Thai name, shared with the page title and the register badge.
  label: string
  // Display order in the hub and in the badge list.
  sortOrder: number
}

export const FORM_REGISTRY: readonly FormEntry[] = [
  {
    id: 'order-image',
    path: '/liff/forms/order-image',
    label: PAGE_TITLES['/liff/forms/order-image'],
    sortOrder: 1,
  },
  {
    id: 'line-walk',
    path: '/liff/forms/line-walk',
    label: PAGE_TITLES['/liff/forms/line-walk'],
    sortOrder: 2,
  },
]

export const FORM_IDS: readonly FormId[] = FORM_REGISTRY.map((form) => form.id)

export function isFormId(value: string): value is FormId {
  return FORM_REGISTRY.some((form) => form.id === value)
}

export function formById(id: string): FormEntry | undefined {
  return FORM_REGISTRY.find((form) => form.id === id)
}

// Unknown ids are dropped rather than rejected. A grant can only come from
// the checkbox list this registry renders, so an unknown id is a forged or
// stale value, and it must not grant anything.
export function normalizeFormIds(values: readonly string[]): FormId[] {
  const known = new Set<string>()
  for (const value of values) {
    if (isFormId(value)) known.add(value)
  }
  return FORM_REGISTRY.filter((form) => known.has(form.id)).map((form) => form.id)
}
