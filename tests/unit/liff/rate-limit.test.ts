import { describe, expect, it } from 'vitest'

import { isRateLimited, rateLimitedResponse } from '@/lib/liff/rate-limit'

// The rate limiter guards the two endpoints that spend an outbound HTTPS
// call to LINE on every request (ADR 0003). The counter lives in this
// module's memory, so each test needs its own client address to stay
// independent of the others.

function remoteRequest(headers: Record<string, string> = {}) {
  return new Request('http://example.test/api/liff/status', {
    method: 'POST',
    headers: { 'cf-connecting-ip': '203.0.113.7', ...headers },
  })
}

describe('isRateLimited', () => {
  it('lets the first requests through', () => {
    const request = remoteRequest()
    expect(isRateLimited(request)).toBe(false)
    expect(isRateLimited(request)).toBe(false)
  })

  it('blocks once the client uses up its allowance', () => {
    const request = remoteRequest({ 'cf-connecting-ip': '203.0.113.8' })
    let limited = false
    for (let attempt = 0; attempt < 40; attempt += 1) {
      limited = isRateLimited(request)
    }
    expect(limited).toBe(true)
  })

  it('counts each client separately', () => {
    const noisy = remoteRequest({ 'cf-connecting-ip': '203.0.113.9' })
    for (let attempt = 0; attempt < 40; attempt += 1) isRateLimited(noisy)

    // A different address starts with a full allowance.
    const quiet = remoteRequest({ 'cf-connecting-ip': '203.0.113.10' })
    expect(isRateLimited(quiet)).toBe(false)
  })

  it('never limits a request from the machine running the server', () => {
    // The operator's own machine is trusted (ADR 0004) and never reaches
    // the public surface, so the limiter must not get in its way.
    const local = new Request('http://example.test/api/liff/status', {
      method: 'POST',
      headers: { host: 'localhost:8080' },
    })
    for (let attempt = 0; attempt < 40; attempt += 1) {
      expect(isRateLimited(local)).toBe(false)
    }
  })
})

describe('rateLimitedResponse', () => {
  it('answers 429 with a retry hint', () => {
    const response = rateLimitedResponse()

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
  })
})
