// Single source of truth for page titles, shared by metadata and navbar label.
export const PAGE_TITLES: Record<string, string> = {
  '/': 'แดชบอร์ด',
  '/order-images': 'จัดการรูปภาพออเดอร์',
  '/register': 'จัดการผู้ใช้',
  '/liff/authorization': 'ตรวจสอบสิทธิ์การใช้งาน',
  '/liff/forms': 'แบบฟอร์ม',
}

// Resolve a pathname to its plain-text title, with decoded fallback.
export function getPageTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact

  const lastSegment = pathname.split('/').filter(Boolean).pop()
  if (!lastSegment) return PAGE_TITLES['/']

  try {
    return decodeURIComponent(lastSegment)
  } catch {
    return lastSegment
  }
}
