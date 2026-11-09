import { describe, expect, it } from 'vitest'

import { FORM_REGISTRY, normalizeFormIds } from '@/lib/forms/registry'
import { AUTH_PATH, FORMS_PATH, gateRedirect } from '@/lib/liff/form-access'

// The gate is steering only (ADR 0017), but the rules are still worth pinning:
// a wrong rule either traps a user on a dead screen or flashes a page whose
// API calls all answer 403.
const ALL_FORMS = ['order-image', 'line-walk']

describe('gateRedirect', () => {
  it('sends an unapproved visitor to the authorization screen', () => {
    expect(gateRedirect('none', '/liff/forms', [])).toBe(AUTH_PATH)
    expect(gateRedirect('pending', '/liff/forms/order-image', ALL_FORMS)).toBe(AUTH_PATH)
    // Already there: nothing to do.
    expect(gateRedirect('none', AUTH_PATH, [])).toBeNull()
    expect(gateRedirect('pending', AUTH_PATH, [])).toBeNull()
  })

  it('sends an approved user away from the authorization screen', () => {
    expect(gateRedirect('approved', AUTH_PATH, ALL_FORMS)).toBe(FORMS_PATH)
  })

  it('lets an approved user into a granted form', () => {
    expect(gateRedirect('approved', '/liff/forms/order-image', ['order-image'])).toBeNull()
    expect(gateRedirect('approved', '/liff/forms/line-walk', ALL_FORMS)).toBeNull()
  })

  it('sends an approved user away from a form they were not granted', () => {
    expect(gateRedirect('approved', '/liff/forms/order-image', ['line-walk'])).toBe(FORMS_PATH)
    expect(gateRedirect('approved', '/liff/forms/line-walk', [])).toBe(FORMS_PATH)
  })

  it('does not redirect for a path that is not a form', () => {
    expect(gateRedirect('approved', '/liff/forms', ALL_FORMS)).toBeNull()
  })

  it('leaves unresolved states to their own notices', () => {
    expect(gateRedirect('loading', '/liff/forms', [])).toBeNull()
    expect(gateRedirect('error', '/liff/forms/order-image', [])).toBeNull()
    expect(gateRedirect('outside-line', '/liff/forms', [])).toBeNull()
    expect(gateRedirect('unconfigured', '/liff/forms', [])).toBeNull()
  })
})

describe('normalizeFormIds', () => {
  it('keeps known ids once, in registry order', () => {
    expect(normalizeFormIds(['line-walk', 'order-image', 'line-walk'])).toEqual([
      'order-image',
      'line-walk',
    ])
  })

  it('drops ids the registry does not know', () => {
    expect(normalizeFormIds(['order-image', 'no-such-form'])).toEqual(['order-image'])
    expect(normalizeFormIds([])).toEqual([])
  })

  it('matches the registry order exactly', () => {
    const ids = FORM_REGISTRY.map((form) => form.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(normalizeFormIds(ids)).toEqual(ids)
  })
})
