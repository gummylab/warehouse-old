import { describe, expect, it } from 'vitest'

import {
  addItemSchema,
  imagePackageSchema,
  orderLookupSchema,
  parseJsonBody,
} from '@/lib/liff/schemas'

// The schemas guard the request bodies of the public endpoints. What
// matters is not that Zod rejects a bad body (it does) but that the
// rejection carries the error code the form already knows, so the client
// needs no new wording.

function postRequest(body: unknown) {
  return new Request('http://example.test/api/liff/order-images/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('parseJsonBody', () => {
  it('returns the parsed body when it fits the schema', async () => {
    const result = await parseJsonBody(
      postRequest({ orderNumber: '123456789', orderDate: '2026-10-19', line: 'line-a' }),
      orderLookupSchema,
    )

    expect(result).toEqual({
      ok: true,
      data: { orderNumber: '123456789', orderDate: '2026-10-19', line: 'line-a' },
    })
  })

  it('reports the code the schema named', async () => {
    const result = await parseJsonBody(
      postRequest({ orderNumber: 1234, orderDate: '2026-10-19', line: 'line-a' }),
      orderLookupSchema,
    )

    expect(result).toEqual({ ok: false, error: 'invalid-order-number' })
  })

  it('reports a body that is not JSON at all', async () => {
    const result = await parseJsonBody(postRequest('not json'), orderLookupSchema)

    expect(result.ok).toBe(false)
  })

  it('rejects a body that is missing a field', async () => {
    const result = await parseJsonBody(
      postRequest({ orderNumber: '123456789', orderDate: '2026-10-19' }),
      orderLookupSchema,
    )

    expect(result).toEqual({ ok: false, error: 'unknown-line' })
  })
})

describe('addItemSchema', () => {
  it('accepts a body without a parent, which means top level', async () => {
    const result = await parseJsonBody(postRequest({}), addItemSchema)

    expect(result).toEqual({ ok: true, data: {} })
  })

  it('accepts an explicit null parent, which is what the client sends', async () => {
    // The client always sends the field, so a top-level item arrives as
    // null rather than as a missing key.
    const result = await parseJsonBody(postRequest({ parentItemId: null }), addItemSchema)

    expect(result).toEqual({ ok: true, data: { parentItemId: null } })
  })

  it('accepts a parent id', async () => {
    const result = await parseJsonBody(postRequest({ parentItemId: 'item-1' }), addItemSchema)

    expect(result).toEqual({ ok: true, data: { parentItemId: 'item-1' } })
  })

  it('rejects an empty parent id', async () => {
    const result = await parseJsonBody(postRequest({ parentItemId: '' }), addItemSchema)

    expect(result.ok).toBe(false)
  })
})

describe('imagePackageSchema', () => {
  it('accepts null, which clears the label', async () => {
    const result = await parseJsonBody(postRequest({ package: null }), imagePackageSchema)

    expect(result).toEqual({ ok: true, data: { package: null } })
  })

  it('accepts a package name', async () => {
    const result = await parseJsonBody(
      postRequest({ package: 'Inner Box' }),
      imagePackageSchema,
    )

    expect(result).toEqual({ ok: true, data: { package: 'Inner Box' } })
  })

  it('rejects a missing package field', async () => {
    const result = await parseJsonBody(postRequest({}), imagePackageSchema)

    expect(result.ok).toBe(false)
  })
})
