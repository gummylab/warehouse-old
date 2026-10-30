import { StateScreen } from '@/components/layout/state-screen'
import { ButtonLink } from '@/components/ui/button'

// 404 for a URL that matches no route. It renders inside the root layout,
// so the app's styles and font apply and StateScreen can use the shared
// flex-1 height instead of a viewport unit.
export default function NotFound() {
  return (
    <StateScreen
      title="ไม่พบหน้าที่ต้องการ"
      description="ลิงก์อาจไม่ถูกต้อง หรือหน้านั้นถูกย้ายไปแล้ว"
      actions={
        <ButtonLink href="/" variant="outline">
          กลับหน้าแรก
        </ButtonLink>
      }
    />
  )
}
