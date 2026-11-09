import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// A download token authorises one file read from the external browser, where
// the LIFF session cookie does not exist. It is not a session token: the key
// is derived from the session secret, and the shape is not a JWT, so
// verifySessionToken cannot accept it.
const TTL_SECONDS = 5 * 60

function downloadKey(): Buffer | null {
  const secret = process.env.LIFF_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return createHash('sha256').update(`${secret}:download`).digest()
}

export function createDownloadToken(imageId: string): string | null {
  const key = downloadKey()
  if (!key) return null
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  return `${exp}.${sign(key, imageId, exp)}`
}

export function verifyDownloadToken(
  token: string | null,
  imageId: string,
): boolean {
  if (!token) return false
  const key = downloadKey()
  if (!key) return false

  const parts = token.split('.')
  if (parts.length !== 2) return false
  const expPart = parts[0]
  const signature = parts[1]
  if (!expPart || !signature) return false
  const exp = Number(expPart)
  if (!Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false
  }

  const expected = Buffer.from(sign(key, imageId, exp))
  const actual = Buffer.from(signature)
  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  )
}

function sign(key: Buffer, imageId: string, exp: number): string {
  return createHmac('sha256', key)
    .update(`${imageId}:${exp}`)
    .digest('base64url')
}
