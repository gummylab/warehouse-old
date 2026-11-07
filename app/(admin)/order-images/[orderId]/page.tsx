import { io } from 'next/cache'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { StateScreen } from '@/components/layout/state-screen'
import { ButtonLink } from '@/components/ui/button'
import { getOrderDetail } from '@/lib/db/order-images'
import { getUserByLineId } from '@/lib/db/users'

import { OrderDetail } from './order-detail'

// The admin detail is dynamic and local-only. Opt out of instant-navigation
// validation, which drops a segment that suspends on a SQLite read.
export const instant = false

export const metadata: Metadata = {
  title: 'รายละเอียดออเดอร์',
}

export default async function OrderDetailPage(
  props: PageProps<'/order-images/[orderId]'>,
) {
  const { orderId } = await props.params

  return (
    <Suspense fallback={<StateScreen loading title="กำลังโหลด…" />}>
      <OrderDetailData orderId={orderId} />
    </Suspense>
  )
}

async function OrderDetailData({ orderId }: { orderId: string }) {
  // io() keeps the SQLite read out of the static shell; the Suspense
  // boundary above streams the detail into the shell.
  await io()
  const detail = getOrderDetail(orderId)

  if (!detail) {
    return (
      <StateScreen
        headingLevel="h2"
        title="ไม่พบออเดอร์นี้"
        description="ออเดอร์อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง"
        actions={
          <ButtonLink href="/order-images" variant="outline">
            กลับไปหน้ารวม
          </ButtonLink>
        }
      />
    )
  }

  const creatorLabel =
    detail.order.createdBy === 'local-device'
      ? 'เครื่องนี้'
      : (getUserByLineId(detail.order.createdBy)?.displayName ??
        detail.order.createdBy)

  return <OrderDetail initialDetail={detail} creatorLabel={creatorLabel} />
}
