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
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')
