// The name the operator sees in Files/Photos. The uploaded name is the best
// one, but it comes from the client, so it is validated before it reaches a
// download attribute or a Content-Disposition header.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type DownloadablePhoto = {
  seq: number
  fileName?: string | null
  mimeType?: string | null
}

export function downloadExtension(mimeType: string | null | undefined): string {
  return (mimeType && EXTENSIONS[mimeType]) || 'jpg'
}

export function photoDownloadName(photo: DownloadablePhoto): string {
  const uploaded = photo.fileName?.trim()
  if (uploaded && isSafeFileName(uploaded)) return uploaded
  return `photo-${photo.seq}.${downloadExtension(photo.mimeType)}`
}

// A name that cannot escape a folder or break the quoted header. It has to
// keep a short extension so the receiving app recognises the file type.
function isSafeFileName(name: string): boolean {
  if (/[/\\\u0000-\u001f"]/.test(name)) return false
  return /\.[a-z0-9]{2,5}$/i.test(name)
}
