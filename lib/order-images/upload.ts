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
