import { describe, expect, it } from 'vitest'

import { getPageTitle, PAGE_TITLES } from '@/lib/page-titles'

// One source of truth for both metadata.title and the admin header label, so
// the lookup is compared against the table itself rather than against a copy
// of the copy (the table is data; the lookup is the behaviour).
describe('page titles', () => {
  it('resolves the dashboard title for the root path', () => {
    expect(getPageTitle('/')).toBe(PAGE_TITLES['/'])
  })

  it('resolves a registered path to its own entry, not to another one', () => {
    expect(getPageTitle('/register')).toBe(PAGE_TITLES['/register'])
    expect(getPageTitle('/order-images')).toBe(PAGE_TITLES['/order-images'])
    expect(getPageTitle('/register')).not.toBe(PAGE_TITLES['/'])
    expect(getPageTitle('/register')).not.toBe(PAGE_TITLES['/order-images'])
  })

  it('keeps the section title for a nested order-image route', () => {
    expect(getPageTitle('/order-images/abc-123')).toBe(
      PAGE_TITLES['/order-images'],
    )
  })

  it('resolves the LIFF pages that carry a title', () => {
    expect(getPageTitle('/liff/authorization')).toBe(PAGE_TITLES['/liff/authorization'])
    expect(getPageTitle('/liff/forms/order-image')).toBe(PAGE_TITLES['/liff/forms/order-image'])
  })

  it('falls back to the last URL segment for unregistered paths', () => {
    // Dynamic routes such as an item's photo page are deliberately absent
    // from the table.
    expect(getPageTitle('/liff/forms/order-image/items/abc-123')).toBe('abc-123')
  })

  it('decodes a percent-encoded segment', () => {
    const encoded = '%E0%B8%81'
    expect(getPageTitle(`/liff/forms/order-image/items/${encoded}`)).toBe(decodeURIComponent(encoded))
  })

  it('keeps the raw segment when it cannot be decoded', () => {
    expect(getPageTitle('/liff/forms/order-image/items/%E0%B8')).toBe('%E0%B8')
  })

  it('falls back to the dashboard title when there is no path at all', () => {
    expect(getPageTitle('')).toBe(PAGE_TITLES['/'])
  })
})
