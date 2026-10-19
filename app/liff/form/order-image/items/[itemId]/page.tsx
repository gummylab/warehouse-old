import type { Metadata } from 'next'
import Link from 'next/link'

import { io } from 'next/cache'

import { getItemDetail } from '@/lib/db/order-images'

import { ItemImages } from './item-images'

// The LIFF layout gate withholds this page until the LINE session resolves,
// so the dev server's instant-navigation simulation never renders this
// segment and reports it as "dropped". The masking is the design, not a
// defect — this opts the route out of that validation (see /liff/forms).
export const instant = false

// Dynamic route: the item number is only known at request time, and /liff
// pages carry no header label, so a static title serves metadata.
export const metadata: Metadata = {
  title: 'รูปภาพไอเท็ม',
}

type PageProps = {
  params: Promise<{ itemId: string }>
}

// One item's photo page (linked from step 2's cards). Reads the item, its
// order and its photos here; the client owns uploads and label edits and
// refetches the same shape through GET /api/liff/order-images/items/[id].
export default async function ItemImagesPage({ params }: PageProps) {
  const { itemId } = await params

  // io() keeps the synchronous DB read out of the static shell; during a
  // real request it resolves immediately.
  await io()
  const detail = getItemDetail(itemId)

  if (!detail) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">ไม่พบไอเท็มนี้</p>
        <Link
          href="/liff/form/order-image"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          กลับไปหน้าแบบฟอร์ม
        </Link>
      </div>
    )
  }

  return <ItemImages initialDetail={detail} />
}
