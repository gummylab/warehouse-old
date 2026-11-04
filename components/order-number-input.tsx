'use client'

import { REGEXP_ONLY_DIGITS } from 'input-otp'

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { ORDER_NUMBER_LENGTH } from '@/lib/order-images/validation'
import { cn } from '@/lib/utils'

// Nine fixed slots for the warehouse's printed order number. The real input
// sits behind the slots, so paste, the number keyboard and assistive tech all
// still see one normal input.
//
// The slots shrink instead of keeping a fixed width: nine 36px cells would
// overflow a 320px phone. `flex-1` inside a full-width group lets the row fit
// the form at any width.
export function OrderNumberInput({
  value,
  onChange,
  id,
  label,
  disabled,
  invalid = false,
  autoFocus = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  // Accessible name for the hidden input; the caller renders the visible label.
  label?: string
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  className?: string
}) {
  return (
    <InputOTP
      id={id}
      aria-label={label}
      aria-invalid={invalid || undefined}
      maxLength={ORDER_NUMBER_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus={autoFocus}
      autoComplete="off"
      inputMode="numeric"
      containerClassName={cn('w-full', className)}>
      <InputOTPGroup className="w-full">
        {Array.from({ length: ORDER_NUMBER_LENGTH }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            aria-invalid={invalid || undefined}
            className="h-9 min-w-0 flex-1"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
