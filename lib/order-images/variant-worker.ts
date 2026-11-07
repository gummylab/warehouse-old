// Worker thread for image variant generation (sharp).
// Runs in a separate thread so CPU-bound resize work does not block
// the main event loop / other requests' deferred work.
//
// Protocol:
//   in:  { buffer: ArrayBuffer }  (transferred)
//   out: { ok: true, web: ArrayBuffer, thumb: ArrayBuffer }  (transferred)
//     or { ok: false, error: string }

import { parentPort } from 'worker_threads'
import sharp from 'sharp'

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp'])
const WEB_MAX_EDGE = 1600
const THUMB_MAX_EDGE = 480
const WEB_QUALITY = 78
const THUMB_QUALITY = 72

async function build(buffer: Buffer): Promise<{ web: Buffer; thumb: Buffer }> {
  const metadata = await sharp(buffer).metadata().catch(() => null)
  if (
    !metadata?.format ||
    !ACCEPTED_FORMATS.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error('unsupported image format')
  }

  const render = (maxEdge: number, quality: number) =>
    sharp(buffer)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()

  const [web, thumb] = await Promise.all([
    render(WEB_MAX_EDGE, WEB_QUALITY),
    render(THUMB_MAX_EDGE, THUMB_QUALITY),
  ])

  return { web, thumb }
}

parentPort?.on('message', async (msg: { buffer: ArrayBuffer }) => {
  try {
    const buf = Buffer.from(msg.buffer)
    const { web, thumb } = await build(buf)
    parentPort?.postMessage(
      { ok: true, web: web.buffer, thumb: thumb.buffer },
    )
  } catch (error) {
    parentPort?.postMessage({ ok: false, error: String(error) })
  }
})
