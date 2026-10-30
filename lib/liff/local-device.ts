// Local device trust (ADR 0004): a request from the machine running the
// server skips LINE verification and is treated as approved.
//
// The rule itself lives in lib/local-machine.ts, because the admin surface
// needs the same rule to decide who may write (lib/admin/authorize.ts). This
// module keeps the LIFF-facing names and adds the browser-side counterpart.

import { isLoopbackHost, isLocalMachineRequest } from '../local-machine'

// Server side: does this request come straight from the machine itself?
export function isLocalDeviceRequest(request: Request): boolean {
  return isLocalMachineRequest(request)
}

// Client side: is the page being opened on the machine itself? Guards
// window so the module also loads during server rendering.
export function isLocalDeviceBrowser(): boolean {
  return (
    typeof window !== 'undefined' && isLoopbackHost(window.location.hostname)
  )
}
