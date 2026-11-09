// Upload limits shared by the image manager (instant feedback, before any
// network call) and the upload route (authoritative check after auth).
// One module keeps the two caps and type lists from drifting apart.

// Camera photos over the tunnel must stay bounded: 10 MB is well above a
// phone JPEG after any resizing and still rejects a crafted multi-gigabyte
// body early.
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function isAcceptedImageType(type: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)
}

// Value for the file input's accept attribute.
//
// Kept to the three types on purpose: iOS converts a HEIC photo to JPEG on
// upload only while the input does not declare HEIC support, and the server
// rejects HEIC, so a wildcard here would break the library picker on iPhone.
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')

// Value for the camera input's accept attribute.
//
// Looser than the gallery one for a reason: Android only offers the camera in
// its own chooser when the accept is a wildcard, so the narrow list above
// leaves a phone with no camera at all in the browsers that ignore `capture`.
// A camera writes a JPEG, and if a browser falls back to the gallery the pick
// still goes through addFiles, which screens it.
export const CAMERA_ACCEPT_ATTRIBUTE = 'image/*'

// Validate image type from magic bytes (first 12 bytes) instead of
// reading the entire buffer through sharp. ~10x faster for large files.
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) return true
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true
  return false
}
