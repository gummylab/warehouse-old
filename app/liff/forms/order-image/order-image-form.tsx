'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { FormPage } from '@/components/layout/form-page'
import { Button, ButtonLink } from '@/components/ui/button'
import type { OrderDetail } from '@/lib/db/types'
import { formatThaiDate } from '@/lib/order-images/format'
import { isValidCalendarDate, isValidOrderNumber, normalizeOrderNumber } from '@/lib/order-images/validation'

import { ChevronLeftIcon } from 'lucide-react'
import { FormNavbar } from '../../form-navbar'
import { useLiffSession } from '../../liff-session-context'
import type { LookupInput } from './order-image-api'
import { errorMessage, lookupOrder, postSession, setSessionToken } from './order-image-api'
import { OrderItemsStep } from './order-items-step'
import { StepOneFields } from './step-one-fields'

// Owns the step switch, the session cookie exchange, the order detail
// state that both steps read, and the navbar above them. Step 1 submits
// here because the router and the session promise live here; step 2
// manages its own mutations and errors and reports the refreshed tree back
// through onDetailChange.
// The navbar lives here because only this component knows whether an order
// exists yet: before the lookup it carries the form's name and the way back
// to the hub, after it carries the order itself.
// The page keys this component by orderId (see page.tsx): every URL change
// remounts it fresh from server props, which is how back/forward and the
// step 1 → 2 transition stay correct without any prop-to-state sync.
export function OrderImageForm({ lines, initialDetail }: { lines: string[]; initialDetail: OrderDetail | null }) {
  const { token } = useLiffSession()
  const router = useRouter()
  const [detail, setDetail] = useState<OrderDetail | null>(initialDetail)
  const [submitting, setSubmitting] = useState(false)
  const [stepOneError, setStepOneError] = useState<string | null>(null)

  // Exchange the LIFF token for the session cookie once per token, before
  // the first data call can race it; step 1's submit awaits this promise
  // so a fast user cannot401 against a still-pending exchange.
  const sessionRef = useRef<Promise<boolean> | null>(null)
  useEffect(() => {
    setSessionToken(token)
    sessionRef.current = postSession().then((ok) => {
      // Surface a failed exchange immediately (revoked mid-session, server
      // down); a later submit clears it and the API layer's 401 renewal
      // heals transient failures anyway.
      if (!ok) setStepOneError(errorMessage('session-failed'))
      return ok
    })
  }, [token])

  async function handleLookup(input: LookupInput) {
    setStepOneError(null)
    // Same checks as the lookup route, before any network call, so the
    // message appears instantly under the fields.
    if (!isValidOrderNumber(input.orderNumber)) {
      setStepOneError(errorMessage('invalid-order-number'))
      return
    }
    if (!isValidCalendarDate(input.orderDate)) {
      setStepOneError(errorMessage('invalid-order-date'))
      return
    }
    if (!input.line) {
      setStepOneError(errorMessage('line-required'))
      return
    }

    setSubmitting(true)
    try {
      await sessionRef.current
      const lookup = await lookupOrder({
        ...input,
        orderNumber: normalizeOrderNumber(input.orderNumber),
      })
      if (!lookup.ok) {
        setStepOneError(errorMessage(lookup.error, lookup.status))
        return
      }
      // Navigation IS the state transition: the server page re-reads the
      // order and hands it back under a new component key (page.tsx), so
      // the form remounts straight into step 2 with fresh data — no second
      // client-side detail read, no prop-to-state sync.
      await router.replace(`/liff/forms/order-image?orderId=${lookup.data.orderId}`)
    } catch {
      // router.replace is the only call here that can reject (navigation
      // aborted, offline); the API helpers return results instead.
      setStepOneError(errorMessage('network-error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormPage
      width="full"
      header={
        <FormNavbar
          width="full"
          title={detail ? `ออเดอร์ ${detail.order.orderNumber}` : 'อัปโหลดรูปภาพออเดอร์'}
          subtitle={
            detail
              ? `${formatThaiDate(detail.order.orderDate)} / ไลน์${detail.order.line}`
              : undefined
          }
          action={
            detail ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="เลือกออเดอร์ใหม่"
                onClick={() => router.push('/liff/forms/order-image')}>
                <ChevronLeftIcon />
              </Button>
            ) : (
              // Step 1 is one level below the form hub. A link keeps the
              // destination explicit and works with the browser's own
              // navigation, unlike router.back().
              <ButtonLink
                variant="ghost"
                size="icon"
                aria-label="กลับไปหน้าแบบฟอร์ม"
                href="/liff/forms">
                <ChevronLeftIcon />
              </ButtonLink>
            )
          }
        />
      }>
      {detail ? (
        <OrderItemsStep
          detail={detail}
          // The update receives the latest base state, so two actions that
          // overlap cannot overwrite each other with a stale tree.
          onDetailChange={(updater) =>
            setDetail((current) => (current ? updater(current) : current))
          }
        />
      ) : (
        <StepOneFields
          lines={lines}
          submitting={submitting}
          error={stepOneError}
          onSubmit={handleLookup}
        />
      )}
    </FormPage>
  )
}
