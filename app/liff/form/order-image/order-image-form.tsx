'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { OrderDetail } from '@/lib/db/order-images'
import {
  isValidCalendarDate,
  isValidOrderNumber,
  normalizeOrderNumber,
} from '@/lib/order-images/validation'

import { useLiffSession } from '../../liff-session-context'
import {
  errorMessage,
  lookupOrder,
  postSession,
  setSessionToken,
} from './order-image-api'
import type { LookupInput } from './order-image-api'
import { OrderItemsStep } from './order-items-step'
import { StepOneFields } from './step-one-fields'

// Owns the step switch, the session cookie exchange and the order detail
// state that both steps read. Step 1 submits here because the router and
// the session promise live here; step 2 manages its own mutations and
// errors and reports the refreshed tree back through onDetailChange.
// The page keys this component by orderId (see page.tsx): every URL change
// remounts it fresh from server props, which is how back/forward and the
// step 1 → 2 transition stay correct without any prop-to-state sync.
export function OrderImageForm({
  lines,
  initialDetail,
}: {
  lines: string[]
  initialDetail: OrderDetail | null
}) {
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
      await router.replace(`/liff/form/order-image?orderId=${lookup.data.orderId}`)
    } catch {
      // router.replace is the only call here that can reject (navigation
      // aborted, offline); the API helpers return results instead.
      setStepOneError(errorMessage('network-error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!detail) {
    return (
      <StepOneFields
        lines={lines}
        submitting={submitting}
        error={stepOneError}
        onSubmit={handleLookup}
      />
    )
  }
  return <OrderItemsStep detail={detail} onDetailChange={setDetail} />
}
