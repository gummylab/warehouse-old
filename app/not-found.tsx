import Link from 'next/link'

// 404 for a URL that matches no route. It renders inside the root layout,
// so the app's styles and font apply.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-lg font-semibold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-sm text-muted-foreground">
        ลิงก์อาจไม่ถูกต้อง หรือหน้านั้นถูกย้ายไปแล้ว
      </p>
      <Link
        href="/"
        className="rounded-md border border-border px-4 py-2 text-sm font-medium"
      >
        กลับหน้าแรก
      </Link>
    </div>
  )
}
