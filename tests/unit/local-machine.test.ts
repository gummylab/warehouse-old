import { describe, expect, it } from 'vitest'

import {
  isLocalMachineHeaders,
  isLocalMachineRequest,
  isLoopbackHost,
} from '@/lib/local-machine'

// The primitive behind both the LIFF trust (ADR 0004) and the admin write
// guard: "did this request come straight from the machine running the
// server?". Every branch matters, because a wrong answer either opens the
// admin surface to the internet or locks the operator out of their own
// machine.
//
// The Host header is set explicitly: a real server fills it in from the
// wire, but undici does not derive it from the request URL (verified
// against the Node version this repo runs on), so a test must write it out.
function requestWith(headers: Record<string, string>) {
  return new Request('http://example.test/api/liff/status', { method: 'POST', headers })
}

describe('isLocalMachineHeaders', () => {
  it('trusts a loopback request that never passed through Cloudflare', () => {
    expect(isLocalMachineHeaders(new Headers({ host: 'localhost:8080' }))).toBe(true)
    expect(isLocalMachineHeaders(new Headers({ host: '127.0.0.1:8080' }))).toBe(true)
    expect(isLocalMachineHeaders(new Headers({ host: '[::1]:8080' }))).toBe(true)
  })

  it('refuses a request that carries CF-Connecting-IP, even on a loopback host', () => {
    // The Cloudflare edge sets this header and a client cannot remove it,
    // so its presence proves the request came in from the public internet.
    expect(
      isLocalMachineHeaders(
        new Headers({ host: 'localhost:8080', 'cf-connecting-ip': '203.0.113.7' }),
      ),
    ).toBe(false)
  })

  it('refuses a host that is not loopback', () => {
    expect(isLocalMachineHeaders(new Headers({ host: '192.168.1.20:8080' }))).toBe(false)
    expect(isLocalMachineHeaders(new Headers({ host: 'wh-bot.itclex.space' }))).toBe(false)
  })

  it('does not treat a missing host as local', () => {
    expect(isLocalMachineHeaders(new Headers())).toBe(false)
  })
})

describe('isLocalMachineRequest', () => {
  it('reads the headers off a real request', () => {
    expect(isLocalMachineRequest(requestWith({ host: 'localhost:8080' }))).toBe(true)
    expect(isLocalMachineRequest(requestWith({ host: 'wh-bot.itclex.space' }))).toBe(false)
  })
})

describe('isLoopbackHost', () => {
  it('matches the loopback host case-insensitively', () => {
    expect(isLoopbackHost('LOCALHOST:8080')).toBe(true)
  })

  it('refuses a host that merely starts with a loopback name', () => {
    expect(isLoopbackHost('localhost.evil.test')).toBe(false)
  })

  it('handles the bracketed IPv6 form', () => {
    expect(isLoopbackHost('[::1]:8080')).toBe(true)
    expect(isLoopbackHost('::1')).toBe(true)
  })
})
