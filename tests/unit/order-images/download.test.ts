import { describe, expect, it } from 'vitest'

import {
  downloadExtension,
  photoDownloadName,
} from '@/lib/order-images/download'

describe('photoDownloadName', () => {
  it('keeps the uploaded name when it is safe', () => {
    expect(
      photoDownloadName({ seq: 1, fileName: 'IMG_1234.JPG', mimeType: 'image/jpeg' }),
    ).toBe('IMG_1234.JPG')
  })

  it('falls back to the item sequence when the name has no extension', () => {
    expect(
      photoDownloadName({ seq: 3, fileName: 'photo', mimeType: 'image/png' }),
    ).toBe('photo-3.png')
  })

  it('rejects a path-like uploaded name', () => {
    expect(
      photoDownloadName({ seq: 2, fileName: '../x.png', mimeType: 'image/webp' }),
    ).toBe('photo-2.webp')
  })

  it('uses jpg when the type is unknown', () => {
    expect(downloadExtension(null)).toBe('jpg')
    expect(downloadExtension('image/gif')).toBe('jpg')
  })
})
