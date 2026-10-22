import { describe, expect, it, vi } from 'vitest'

import { isLocalDeviceBrowser, isLocalDeviceRequest } from '@/lib/liff/local-device'

// ADR 0004's two conditions are the whole access-control story for a request
// that never touches LINE, so every branch is worth pinning.
//
// The Host header is set explicitly: a real server fills it in from the wire,
// but undici does not derive it from the request URL (verified against the
// Node version this repo runs on), so a test must write it out.
function requestWith(headers: Record<string, string>) {
  return new Request('http://example.test/api/liff/status', { method: 'POST', headers })
}

describe('isLocalDeviceRequest', () => {
  it('trusts a loopback request that never passed through Cloudflare', () => {
    expect(isLocalDeviceRequest(requestWith({ host: 'localhost:8080' }))).toBe(true)
    expect(isLocalDeviceRequest(requestWith({ host: '127.0.0.1:8080' }))).toBe(true)
    expect(isLocalDeviceRequest(requestWith({ host: '[::1]:8080' }))).toBe(true)
  })

  it('matches the loopback host case-insensitively', () => {
    expect(isLocalDeviceRequest(requestWith({ host: 'LOCALHOST:8080' }))).toBe(true)
  })

  it('refuses a request that carries CF-Connecting-IP, even on a loopback host', () => {
    // The Cloudflare edge sets this header and a client cannot remove it, so
    // its presence proves the request came in from the public internet.
    expect(
      isLocalDeviceRequest(
        requestWith({ host: 'localhost:8080', 'cf-connecting-ip': '203.0.113.7' }),
      ),
    ).toBe(false)
  })

  it('refuses a host that is not loopback', () => {
    expect(isLocalDeviceRequest(requestWith({ host: '192.168.1.20:8080' }))).toBe(false)
    expect(isLocalDeviceRequest(requestWith({ host: 'wh-bot.itclex.space' }))).toBe(false)
  })

  it('does not treat a missing host as local', () => {
    expect(isLocalDeviceRequest(requestWith({}))).toBe(false)
  })

  it('refuses a host that merely starts with a loopback name', () => {
    expect(isLocalDeviceRequest(requestWith({ host: 'localhost.evil.test' }))).toBe(false)
  })
})

describe('isLocalDeviceBrowser', () => {
  it('is false during server rendering, where there is no window', () => {
    expect(isLocalDeviceBrowser()).toBe(false)
  })

  it('is true when the page itself was opened on a loopback host', () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } })
    expect(isLocalDeviceBrowser()).toBe(true)
  })

  it('handles the bracketed IPv6 form browsers report', () => {
    vi.stubGlobal('window', { location: { hostname: '[::1]' } })
    expect(isLocalDeviceBrowser()).toBe(true)
  })

  it('is false when the page was opened through the public hostname', () => {
    vi.stubGlobal('window', { location: { hostname: 'wh-bot.itclex.space' } })
    expect(isLocalDeviceBrowser()).toBe(false)
  })
})
