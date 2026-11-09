// The one route that serves photo bytes. The admin dashboard and the LIFF
// form read the same rows through the same route, so the query string is
// built here instead of being retyped at each call site.

export type PhotoVariant = 'original' | 'web' | 'thumb'

export function photoFileUrl(imageId: string, variant: PhotoVariant = 'web'): string {
  return `/api/liff/order-images/images/${imageId}/file?size=${variant}`
}

// A download is always the original file: the web/thumb copies are for the
// grid and the viewer, while the operator wants the photo they uploaded.
export function photoDownloadUrl(imageId: string): string {
  return `/api/liff/order-images/images/${imageId}/file?size=original&download=1`
}

// Minted by the authenticated request that is about to leave the LINE client.
// The external browser has no LIFF session cookie, so the download route has
// to accept this short-lived token instead.
export function photoDownloadTokenUrl(imageId: string): string {
  return `/api/liff/order-images/images/${imageId}/download-token`
}
