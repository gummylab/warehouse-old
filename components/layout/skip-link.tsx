// The first focusable element on the admin pages. It stays hidden until the
// keyboard reaches it, then jumps past the sidebar and header to the page
// body. The target id lives on PageBody (`id="main-content"`).
export function SkipLink({ href = '#main-content' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-ring">
      ข้ามไปยังเนื้อหาหลัก
    </a>
  )
}
