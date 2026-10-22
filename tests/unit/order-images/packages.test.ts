import { describe, expect, it } from 'vitest'

import { isPackageName, PACKAGE_OPTIONS } from '@/lib/order-images/packages'

// These five strings are the stored values (there is no enum translation
// layer), the DB CHECK constraint, and the form's select options at once.
describe('packages', () => {
  it('lists exactly the five labelled packages', () => {
    expect(PACKAGE_OPTIONS).toEqual(['Primary', 'Inner Box', 'Sleeve Box', 'Tray', 'Carton'])
  })

  it('accepts every listed package, spaces included', () => {
    for (const pkg of PACKAGE_OPTIONS) {
      expect(isPackageName(pkg)).toBe(true)
    }
  })

  it('is case sensitive', () => {
    expect(isPackageName('primary')).toBe(false)
    expect(isPackageName('INNER BOX')).toBe(false)
  })

  it('rejects anything that is not a package string', () => {
    expect(isPackageName(null)).toBe(false)
    expect(isPackageName(undefined)).toBe(false)
    expect(isPackageName(5)).toBe(false)
    expect(isPackageName('')).toBe(false)
    expect(isPackageName('Box')).toBe(false)
  })
})
