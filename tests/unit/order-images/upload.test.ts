import { describe, expect, it } from 'vitest'

import {
  IMAGE_ACCEPT_ATTRIBUTE,
  isAcceptedImageType,
  MAX_FILE_BYTES,
} from '@/lib/order-images/upload'

// The image manager pre-checks with these values before any network call and
// the upload route checks them again after auth; the two must not drift.
describe('upload limits', () => {
  it('caps a file at 10 MB', () => {
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024)
  })

  it('accepts the three phone-friendly formats', () => {
    expect(isAcceptedImageType('image/jpeg')).toBe(true)
    expect(isAcceptedImageType('image/png')).toBe(true)
    expect(isAcceptedImageType('image/webp')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isAcceptedImageType('image/gif')).toBe(false)
    expect(isAcceptedImageType('image/heic')).toBe(false)
    expect(isAcceptedImageType('IMAGE/PNG')).toBe(false)
    expect(isAcceptedImageType('')).toBe(false)
  })

  it('offers exactly the accepted types to the file input', () => {
    expect(IMAGE_ACCEPT_ATTRIBUTE).toBe('image/jpeg,image/png,image/webp')
  })
})
