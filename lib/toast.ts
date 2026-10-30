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
