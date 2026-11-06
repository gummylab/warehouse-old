import sharp, { type Metadata } from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  buildImageVariants,
  THUMB_MAX_EDGE,
  UnsupportedImageError,
  WEB_MAX_EDGE,
} from '@/lib/order-images/optimize'

// A 3:2 landscape source, wide enough that both variants have to shrink.
function landscape(width = 3000, height = 2000): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 40 },
    },
  })
    .png()
    .toBuffer()
}

function longestEdge(meta: Metadata): number {
  return Math.max(meta.width ?? 0, meta.height ?? 0)
}

describe('buildImageVariants', () => {
  it('produces WebP copies that fit inside both long edges', async () => {
    const { web, thumb } = await buildImageVariants(await landscape())

    const webMeta = await sharp(web).metadata()
    const thumbMeta = await sharp(thumb).metadata()

    expect(webMeta.format).toBe('webp')
    expect(thumbMeta.format).toBe('webp')
    expect(longestEdge(webMeta)).toBe(WEB_MAX_EDGE)
    expect(longestEdge(thumbMeta)).toBe(THUMB_MAX_EDGE)
  })

  it('keeps the aspect ratio', async () => {
    const { web } = await buildImageVariants(await landscape(3000, 2000))
    const meta = await sharp(web).metadata()

    expect(meta.width).toBe(1600)
    expect(meta.height).toBeGreaterThanOrEqual(1066)
    expect(meta.height).toBeLessThanOrEqual(1067)
  })

  it('never enlarges a photo smaller than the target', async () => {
    const { web, thumb } = await buildImageVariants(await landscape(320, 200))

    expect((await sharp(web).metadata()).width).toBe(320)
    expect((await sharp(thumb).metadata()).width).toBe(320)
  })

  it('applies the EXIF orientation before resizing', async () => {
    // Orientation 6 means "rotate 90 degrees clockwise": the long edge must end
    // up vertical in both copies.
    const sideways = await sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 3,
        background: { r: 10, g: 120, b: 200 },
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const { web } = await buildImageVariants(sideways)
    const meta = await sharp(web).metadata()

    expect(meta.height).toBe(WEB_MAX_EDGE)
    expect(meta.width).toBeLessThan(meta.height)
  })

  it('rejects bytes that are not one of the three formats', async () => {
    await expect(buildImageVariants(Buffer.from('not an image'))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    )
  })
})
