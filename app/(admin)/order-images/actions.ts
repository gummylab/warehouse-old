'use server'

import { revalidatePath } from 'next/cache'

import { safeRevalidateTag } from '@/lib/cache/revalidate'
import { redirect } from 'next/navigation'

import { requireLocalAdminRequest } from '@/lib/admin/authorize'
import {
  deleteImage,
  deleteItemCascade,
  deleteOrderCascade,
  getImage,
  getItemDetail,
  getOrderDetail,
  setImagePackage,
} from '@/lib/db/order-images'
import { isPackageName } from '@/lib/order-images/packages'

// A server action is a POST endpoint, so each one proves it came from the
// operator's machine before touching the database (ADR 0007). The AdminGate
// protects the page; this protects the write.
export type OrderActionState = { error: string } | null

function revalidateOrder(orderId: string): void {
  revalidatePath('/order-images')
  revalidatePath(`/order-images/${orderId}`)
  safeRevalidateTag('orders')
}

export async function deleteImageAction(
  orderId: string,
  imageId: string,
): Promise<OrderActionState> {
  await requireLocalAdminRequest()

  const image = getImage(imageId)
  if (!image || image.orderId !== orderId) {
    return { error: 'ไม่พบรูปนี้ในออเดอร์' }
  }
  if (!deleteImage(imageId)) {
    return { error: 'ลบรูปไม่สำเร็จ' }
  }

  revalidateOrder(orderId)
  return null
}

export async function setPackageAction(
  orderId: string,
  imageId: string,
  pkg: string | null,
): Promise<OrderActionState> {
  await requireLocalAdminRequest()

  if (pkg !== null && !isPackageName(pkg)) {
    return { error: 'แพ็กเกจไม่ถูกต้อง' }
  }
  const image = getImage(imageId)
  if (!image || image.orderId !== orderId) {
    return { error: 'ไม่พบรูปนี้ในออเดอร์' }
  }
  if (!setImagePackage(imageId, pkg)) {
    return { error: 'เปลี่ยนแพ็กเกจไม่สำเร็จ' }
  }

  revalidateOrder(orderId)
  return null
}

export async function deleteItemAction(
  orderId: string,
  itemId: string,
): Promise<OrderActionState> {
  await requireLocalAdminRequest()

  const detail = getItemDetail(itemId)
  if (!detail || detail.order.id !== orderId) {
    return { error: 'ไม่พบไอเท็มนี้ในออเดอร์' }
  }
  if (!deleteItemCascade(itemId)) {
    return { error: 'ลบไอเท็มไม่สำเร็จ' }
  }

  revalidateOrder(orderId)
  return null
}

// The typed order number is a second confirmation, checked again here. A
// client that skips the dialog cannot delete an order by id alone.
export async function deleteOrderAction(
  orderId: string,
  confirmOrderNumber: string,
): Promise<OrderActionState> {
  await requireLocalAdminRequest()

  const detail = getOrderDetail(orderId)
  if (!detail) {
    return { error: 'ไม่พบออเดอร์นี้ หรือถูกลบไปแล้ว' }
  }
  if (detail.order.orderNumber !== confirmOrderNumber.trim()) {
    return { error: 'เลขออเดอร์ไม่ตรง กรุณาพิมพ์ให้ถูกต้อง' }
  }
  if (!deleteOrderCascade(orderId)) {
    return { error: 'ลบออเดอร์ไม่สำเร็จ' }
  }

  revalidatePath('/order-images')
  safeRevalidateTag('orders')
  redirect('/order-images')
}
