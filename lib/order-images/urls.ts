// The one route that serves photo bytes. The admin dashboard and the LIFF
// form read the same rows through the same route, so the query string is
// built here instead of being retyped at each call site.

export type PhotoVariant = 'original' | 'web' | 'thumb'

export function photoFileUrl(imageId: string, variant: PhotoVariant = 'web'): string {
  return `/api/liff/order-images/images/${imageId}/file?size=${variant}`
}
