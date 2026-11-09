'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import liff from '@line/liff'

import { isLocalDeviceBrowser } from '@/lib/liff/local-device'

// Inlined at build time by Next; the server verify helper answers 503 when
// it is missing.
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID

// No SDK or network step may hang forever: init and both API calls each get
// a deadline, and every terminal path sets a state. The POST deadline stays
// larger than the server's VERIFY_TIMEOUT_MS (20s) so a slow LINE verify
// surfaces as a server result, not a client timeout.
const INIT_TIMEOUT_MS = 15_000
const POST_TIMEOUT_MS = 25_000

// Where bootstrap stopped. Rendered only in development (a phone has no
// console), so a stuck test on a device is still diagnosable.
export type LiffStage = 'init-failed' | 'init-timeout' | 'api'

// Who the LINE-verified server says is opening this app.
export type LiffStatus =
  | 'unconfigured'
  | 'loading'
  | 'error'
  | 'outside-line'
  | 'none'
  | 'pending'
  | 'approved'

export type LiffToken = { value: string; type: 'idToken' | 'accessToken' }

export type LiffSessionState = {
  status: LiffStatus
  // Where the session was resolved: LINE verification, or the local device
  // shortcut that skips LINE entirely (ADR 0004). Drives the banner.
  mode: 'line' | 'local'
  stage: LiffStage | null
  // Token for /api/liff calls; set once LINE issued one, even when the
  // status call that follows fails (so a retry can reuse it).
  token: LiffToken | null
  // Form ids this user may open, in display order. The status call answers
  // it, the gate matches a pathname against it, and the hub renders from it.
  // Empty for a pending user, an unknown user, or a failed status call.
  forms: string[]
}

type LiffSessionContextValue = LiffSessionState & {
  // Re-runs the whole bootstrap; the error notices offer it as retry.
  retry: () => void
  // Applies a status the server just reported (the request endpoint's
  // answer), so the authorization screen flips to "pending" without a
  // second status round-trip.
  applyStatus: (next: Extract<LiffStatus, 'none' | 'pending' | 'approved'>) => void
}

// The session is resolved once per page load and shared by every page under
// /liff through this context; identity itself is verified server-side, the
// browser only forwards the token (ADR 0003).
const LiffSessionContext = createContext<LiffSessionContextValue | null>(null)

export function LiffSessionProvider({ children }: { children: React.ReactNode }) {
  // Unconfigured is known at first render, so it seeds the state instead of
  // being set inside the effect (which would be a synchronous setState).
  const [session, setSession] = useState<LiffSessionState>(() =>
    LIFF_ID
      ? { status: 'loading', mode: 'line', stage: null, token: null, forms: [] }
      : { status: 'unconfigured', mode: 'line', stage: null, token: null, forms: [] },
  )
  const [run, setRun] = useState(0)

  const retry = useCallback(() => {
    // Local device mode needs no LIFF config to boot (ADR 0004).
    if (!LIFF_ID && !isLocalDeviceBrowser()) return
    // Drop the cached boot so a rejected init can actually be retried.
    bootPromise = null
    setSession({ status: 'loading', mode: 'line', stage: null, token: null, forms: [] })
    setRun((n) => n + 1)
  }, [])

  const applyStatus = useCallback(
    (next: Extract<LiffStatus, 'none' | 'pending' | 'approved'>) => {
      setSession((prev) => ({ ...prev, status: next }))
    },
    [],
  )

  // Bootstrap: LIFF init is an external system, so it belongs in an effect.
  // Every setState sits in a .then or setTimeout callback, never in the
  // effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false

    // Local device (ADR 0004): skip the SDK entirely, because there is no
    // LINE session on this machine. The POST asks for the status the same
    // way a phone would; the server recognizes the machine from the request
    // headers alone and answers approved without a token. Runs before the
    // LIFF_ID guard because local mode needs no LIFF configuration.
    if (isLocalDeviceBrowser()) {
      postJson('/api/liff/status', null).then((data) => {
        if (cancelled) return
        if (!data) {
          setSession({ status: 'error', mode: 'local', stage: 'api', token: null, forms: [] })
          return
        }
        setSession({
          status: statusFrom(data.status),
          mode: data.mode === 'local' ? 'local' : 'line',
          stage: null,
          token: null,
          forms: data.forms ?? [],
        })
      })
      return () => {
        cancelled = true
      }
    }

    if (!LIFF_ID) return

    Promise.race([bootFromLiff(LIFF_ID), timeoutBoot()])
      .then((boot) => {
        if (cancelled) return
        if (boot.phase === 'timeout') {
          setSession({ status: 'error', mode: 'line', stage: 'init-timeout', token: null, forms: [] })
          return
        }
        if (boot.phase === 'no-token') {
          // LINE has no session for this LIFF app yet; ask for a login.
          // Inside LINE this navigates away. If we are still here a second
          // later, the redirect did not happen, so say what to do instead
          // of hanging on the loading screen.
          liff.login()
          setTimeout(() => {
            if (!cancelled)
              setSession({ status: 'outside-line', mode: 'line', stage: null, token: null, forms: [] })
          }, 1000)
          return
        }
        return postJson('/api/liff/status', boot.token).then((data) => {
          if (cancelled) return
          if (!data) {
            setSession({ status: 'error', mode: 'line', stage: 'api', token: boot.token, forms: [] })
            return
          }
          setSession({
            status: statusFrom(data.status),
            mode: 'line',
            stage: null,
            token: boot.token,
            forms: data.forms ?? [],
          })
        })
      })
      .catch(() => {
        // liff.init rejected: bad LIFF id, network failure, unsupported
        // browser. postJson never throws, so this catch is init only.
        if (!cancelled)
          setSession({ status: 'error', mode: 'line', stage: 'init-failed', token: null, forms: [] })
      })

    return () => {
      cancelled = true
    }
  }, [run])

  return (
    <LiffSessionContext.Provider value={{ ...session, retry, applyStatus }}>
      {children}
    </LiffSessionContext.Provider>
  )
}

export function useLiffSession(): LiffSessionContextValue {
  const value = useContext(LiffSessionContext)
  if (!value) {
    throw new Error('useLiffSession must be used inside LiffSessionProvider')
  }
  return value
}

// Shared POST helper for the /api/liff endpoints: returns the parsed JSON
// body or null on any failure (network, timeout, non-2xx), so callers map
// "no data" onto the error notice without special cases.
export async function postJson(
  path: string,
  // null token: the local device status call. The server decides from the
  // request headers, not from a token (ADR 0004), so the body stays empty.
  token: LiffToken | null,
): Promise<{ status?: string; mode?: string; forms?: string[] } | null> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token ? { token: token.value, tokenType: token.type } : {}),
    signal: AbortSignal.timeout(POST_TIMEOUT_MS),
  }).catch(() => null)
  if (!response?.ok) return null
  return response.json().catch(() => null)
}

// Reads the LINE session once init has settled: a token when LINE knows
// this user, otherwise "no-token" (this LIFF app has no login session yet).
// The shared promise keeps StrictMode's double effect mount (dev) from
// calling liff.init twice, which the SDK warns about.
let bootPromise: Promise<void> | null = null

function bootFromLiff(liffId: string): Promise<Boot> {
  bootPromise ??= liff.init({ liffId })
  return bootPromise.then((): Boot => {
    const idToken = liff.getIDToken()
    if (idToken) {
      return { phase: 'token', token: { value: idToken, type: 'idToken' } }
    }
    const accessToken = liff.getAccessToken()
    if (accessToken) {
      return { phase: 'token', token: { value: accessToken, type: 'accessToken' } }
    }
    return { phase: 'no-token' }
  })
}

// Boot outcome once liff.init settles (or its deadline expires).
type Boot =
  | { phase: 'timeout' }
  | { phase: 'no-token' }
  | { phase: 'token'; token: LiffToken }

// Resolves when init takes too long; Promise.race turns a hanging SDK into
// a visible error state instead of an eternal loading screen.
function timeoutBoot(): Promise<Boot> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ phase: 'timeout' }), INIT_TIMEOUT_MS)
  })
}

function statusFrom(value: string | undefined): LiffStatus {
  if (value === 'pending') return 'pending'
  if (value === 'approved') return 'approved'
  return 'none'
}
