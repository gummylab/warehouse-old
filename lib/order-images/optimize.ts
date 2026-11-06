// Turns one uploaded photo into the two sizes the app displays.
//
// The original is stored untouched (see saveImage); these are extra copies, so
// a generation failure must never cost the upload. The caller decides that
// policy: this module only reports what went wrong.
import sharp from 'sharp'

// Long edges. A preview at 1600 stays sharp on a desktop screen; a list tile
// at 480 covers a 3-column grid on a phone at 3x density.
export const WEB_MAX_EDGE = 1600
export const THUMB_MAX_EDGE = 480

const WEB_QUALITY = 78
const THUMB_QUALITY = 72

// The three formats the form and the upload route accept. HEIC is deliberately
// absent: the picker converts on iPhone, and the prebuilt sharp cannot decode
// it without libheif.
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp'])

export class UnsupportedImageError extends Error {
  constructor() {
    super('unsupported image format')
    this.name = 'UnsupportedImageError'
  }
}

export type ImageVariants = {
  web: Buffer
  thumb: Buffer
}

export async function buildImageVariants(buffer: Buffer): Promise<ImageVariants> {
  // Decoding the bytes is also the only real format check: a client can claim
  // any MIME type, but libvips has to parse the file to resize it.
  const metadata = await sharp(buffer).metadata().catch(() => null)
  if (
    !metadata?.format ||
    !ACCEPTED_FORMATS.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new UnsupportedImageError()
  }

  // rotate() with no angle applies the EXIF orientation, so a phone photo
  // taken sideways comes out upright. Neither output keeps the metadata, which
  // also drops any location the camera recorded.
  const render = (maxEdge: number, quality: number) =>
    sharp(buffer)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer()

  const [web, thumb] = await Promise.all([
    render(WEB_MAX_EDGE, WEB_QUALITY),
    render(THUMB_MAX_EDGE, THUMB_QUALITY),
  ]).catch(() => {
    // The header parsed but the pixel data did not (a truncated or corrupt
    // upload). Same answer as an unknown format: the route returns 400 rather
    // than letting a sharp error become a 500.
    throw new UnsupportedImageError()
  })

  return { web, thumb }
}
