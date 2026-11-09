import { describe, expect, it } from 'vitest'

import { GET, POST } from '@/app/api/liff/line-walks/route'
import { listLines } from '@/lib/db/order-images'
import { approvePendingUser, createPendingUser } from '@/lib/db/users'
import { signSessionToken, SESSION_COOKIE } from '@/lib/liff/order-session'

import { isolateTestData } from '../setup/db'

const SECRET = 'unit-test-session-secret-at-least-32-chars'

isolateTestData({ env: { LIFF_SESSION_SECRET: SECRET } })

const DATE = '2026-11-05'

function seededUser(lineUserId: string, formIds = ['line-walk']) {
  const user = createPendingUser({
    lineUserId,
    displayName: `User ${lineUserId}`,
  })
  approvePendingUser(user.id, '2026-11-05T03:00:00.000Z', formIds)
  return user
}

async function cookieHeadersFor(
  lineUserId: string,
): Promise<Record<string, string>> {
  return {
    cookie: `${SESSION_COOKIE}=${(await signSessionToken(lineUserId)) ?? ''}`,
  }
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://example.test/api/liff/line-walks', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function getRequest(
  params: Record<string, string>,
  headers: Record<string, string> = {},
) {
  return new Request(
    `http://example.test/api/liff/line-walks?${new URLSearchParams(params)}`,
    { headers },
  )
}

function keyParams(line: string) {
  return { date: DATE, shift: 'day', line, brand: 'brand', packStyle: 'box' }
}

describe('line-walk routes', () => {
  it('refuses a caller with no session', async () => {
    const line = listLines()[0]

    const response = await GET(getRequest(keyParams(line)))

    expect(response.status).toBe(401)
  })

  it('refuses an approved user who was granted a different form', async () => {
    seededUser('U-line-other', ['order-image'])
    const line = listLines()[0]

    const response = await GET(
      getRequest(keyParams(line), await cookieHeadersFor('U-line-other')),
    )

    expect(response.status).toBe(403)
  })

  it('returns null when the key has no record', async () => {
    seededUser('U-line-1')
    const line = listLines()[0]

    const response = await GET(
      getRequest(keyParams(line), await cookieHeadersFor('U-line-1')),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ entry: null })
  })

  it('saves an entry and returns it through the lookup', async () => {
    seededUser('U-line-1')
    const line = listLines()[0]
    const headers = await cookieHeadersFor('U-line-1')

    const saved = await POST(
      postRequest(
        {
          entries: [
            {
              walkDate: DATE,
              shift: 'day',
              line,
              brand: ' brand ',
              packStyle: ' box ',
              people: 3,
              amount: 40,
            },
          ],
        },
        headers,
      ),
    )

    expect(saved.status).toBe(200)
    const savedBody = (await saved.json()) as {
      entries: { brand: string; packStyle: string }[]
    }
    expect(savedBody.entries[0]).toMatchObject({
      brand: 'brand',
      packStyle: 'box',
    })

    const lookup = await GET(getRequest(keyParams(line), headers))
    expect(await lookup.json()).toMatchObject({
      entry: { people: 3, amount: 40 },
    })
  })

  it('upserts the same key instead of creating a second row', async () => {
    seededUser('U-line-1')
    const line = listLines()[0]
    const headers = await cookieHeadersFor('U-line-1')
    const entry = {
      walkDate: DATE,
      shift: 'day',
      line,
      brand: 'brand',
      packStyle: 'box',
      people: 3,
      amount: 40,
    }

    const first = await POST(postRequest({ entries: [entry] }, headers))
    const firstBody = (await first.json()) as { entries: { id: string }[] }

    const second = await POST(
      postRequest({ entries: [{ ...entry, people: 7 }] }, headers),
    )
    const secondBody = (await second.json()) as {
      entries: { id: string; people: number }[]
    }

    expect(secondBody.entries[0].id).toBe(firstBody.entries[0].id)
    expect(secondBody.entries[0].people).toBe(7)
  })

  it('rejects two entries with the same key in one batch', async () => {
    seededUser('U-line-1')
    const line = listLines()[0]
    const headers = await cookieHeadersFor('U-line-1')
    const entry = {
      walkDate: DATE,
      shift: 'day',
      line,
      brand: 'brand',
      packStyle: 'box',
      people: 3,
      amount: 40,
    }

    const response = await POST(
      postRequest({ entries: [entry, entry] }, headers),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'duplicate-entry' })
  })

  it('rejects a negative count and an unknown line', async () => {
    seededUser('U-line-1')
    const line = listLines()[0]
    const headers = await cookieHeadersFor('U-line-1')

    const badCount = await POST(
      postRequest(
        {
          entries: [
            {
              walkDate: DATE,
              shift: 'day',
              line,
              brand: 'brand',
              packStyle: 'box',
              people: -1,
              amount: 0,
            },
          ],
        },
        headers,
      ),
    )
    expect(badCount.status).toBe(400)
    expect(await badCount.json()).toEqual({ error: 'invalid-people' })

    const badLine = await POST(
      postRequest(
        {
          entries: [
            {
              walkDate: DATE,
              shift: 'day',
              line: 'no-such-line',
              brand: 'brand',
              packStyle: 'box',
              people: 1,
              amount: 1,
            },
          ],
        },
        headers,
      ),
    )
    expect(badLine.status).toBe(400)
    expect(await badLine.json()).toEqual({ error: 'unknown-line' })
  })
})
