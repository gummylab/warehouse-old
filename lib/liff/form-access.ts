// Pure navigation rules for the LIFF gate.
//
// Kept apart from the client component so the redirect rules can be tested
// without React or Next. A redirect is UX only: the API endpoints check the
// grant themselves (ADR 0003, ADR 0017).
import { FORM_REGISTRY } from '../forms/registry'

export const AUTH_PATH = '/liff/authorization'
export const FORMS_PATH = '/liff/forms'

export type GateStatus =
  | 'unconfigured'
  | 'loading'
  | 'error'
  | 'outside-line'
  | 'none'
  | 'pending'
  | 'approved'

// Where the gate should send the user, or null to stay put.
//
// Only an approved user with no grant for the current form is moved. The form
// routes are matched exactly: a future form with sub-routes would need a
// prefix rule here.
export function gateRedirect(
  status: GateStatus,
  pathname: string,
  formIds: readonly string[],
): string | null {
  if (status === 'none' || status === 'pending') {
    return pathname === AUTH_PATH ? null : AUTH_PATH
  }

  // Unconfigured, loading, error and outside-line render their own notice;
  // no redirect is decided until the session resolves.
  if (status !== 'approved') return null

  if (pathname === AUTH_PATH) return FORMS_PATH

  const form = FORM_REGISTRY.find((entry) => entry.path === pathname)
  if (form && !formIds.includes(form.id)) return FORMS_PATH

  return null
}
