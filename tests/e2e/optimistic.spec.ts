import { expect, test, type APIRequestContext } from '@playwright/test'

import { uniqueOrderNumber } from './support/data'

// A one-pixel PNG, the same idea as the order-image spec: the server only
// stores and serves the bytes, so the content does not need to be a real photo.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const ORDER_DATE = '2026-01-20'
const LINE = 'ดอกแค'

async function createOrder(
  request: APIRequestContext,
): Promise<{ orderId: string; itemId: string }> {
  const orderNumber = uniqueOrderNumber()

  const orderResponse = await request.post('/api/liff/order-images/orders', {
    data: { orderNumber, orderDate: ORDER_DATE, line: LINE },
  })
  expect(orderResponse.ok()).toBeTruthy()
  const { orderId } = (await orderResponse.json()) as { orderId: string }

  const itemResponse = await request.post(
    `/api/liff/order-images/orders/${orderId}/items`,
    { data: {} },
  )
  expect(itemResponse.ok()).toBeTruthy()
  const { item } = (await itemResponse.json()) as { item: { id: string } }

  return { orderId, itemId: item.id }
}

async function uploadPhoto(
  request: APIRequestContext,
  itemId: string,
): Promise<void> {
  const response = await request.post(
    `/api/liff/order-images/items/${itemId}/images`,
    {
      multipart: {
        file: {
          name: 'optimistic.png',
          mimeType: 'image/png',
          buffer: PNG_BYTES,
        },
      },
    },
  )
  expect(response.ok()).toBeTruthy()
}

test('shows a new item before the server answers', async ({ page, request }) => {
  const { orderId } = await createOrder(request)
  await page.goto(`/liff/forms/order-image?orderId=${orderId}`)

  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/liff/order-images/orders/*/items', async (route) => {
    await gate
    await route.continue()
  })

  await page.getByRole('button', { name: 'เพิ่มไอเท็ม (200)' }).click()

  // The temporary tile is on screen while the POST is still held open.
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 200' })).toBeVisible()

  release()

  // The preview must be cancelled, not added on top of the real row: the
  // item number appears exactly once after the server answers.
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 200' })).toHaveCount(1)

  // Once the server row replaces the preview, its variety button is active
  // and the next top-level number has advanced.
  await expect(page.getByRole('button', { name: 'เพิ่มไอเท็ม (300)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'เพิ่มไอเท็มย่อย (210)' })).toBeVisible()
})

test('removes a photo before the server answers and restores it on failure', async ({
  page,
  request,
}) => {
  const { itemId } = await createOrder(request)
  await uploadPhoto(request, itemId)
  await page.goto(`/liff/forms/order-image/items/${itemId}`)

  const photo = page.locator('img[alt="รูปที่ 1"]')
  await expect(photo).toBeVisible()

  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/liff/order-images/images/*', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.continue()
      return
    }
    await gate
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'image-not-found' }),
    })
  })

  await page.getByRole('button', { name: 'ตั้งค่ารูปที่ 1' }).click()
  await page.getByRole('menuitem', { name: 'ลบรูปนี้' }).click()
  await page
    .getByRole('dialog', { name: 'ยืนยันการลบรูปภาพ' })
    .getByRole('button', { name: 'ยืนยันลบ' })
    .click()

  // The card leaves the grid while DELETE is still held open.
  await expect(photo).toHaveCount(0)

  release()

  // The refusal brings the card back and reports through the toast.
  await expect(photo).toBeVisible()
  await expect(page.getByText('ลบรูปไม่สำเร็จ')).toBeVisible()
})
