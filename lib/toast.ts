'use client'

import { toast, type ExternalToast } from 'sonner'

// Shared durations keep success quiet and errors readable. A caller can still
// override them, for example to keep a configuration error on screen.
type NotifyOptions = Pick<ExternalToast, 'description' | 'id'>

export function notifySuccess(message: string, options: NotifyOptions = {}) {
  toast.success(message, { duration: 2500, ...options })
}

export function notifyError(message: string, options: NotifyOptions = {}) {
  toast.error(message, { duration: 6000, ...options })
}

// A form the admin just removed keeps answering 403 until the user leaves it.
// The toast carries the way back instead of leaving them on a dead screen;
// the id makes repeated calls replace the same toast instead of stacking.
export function notifyFormAccessRevoked() {
  toast.error('คุณไม่มีสิทธิ์ใช้แบบฟอร์มนี้แล้ว', {
    duration: 6000,
    id: 'form-access-revoked',
    action: {
      label: 'กลับหน้าแบบฟอร์ม',
      // A full navigation on purpose: the page must re-bootstrap the LINE
      // session and drop the form's in-memory state, which router.push()
      // would keep.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      onClick: () => window.location.assign('/liff/forms'),
    },
  })
}
