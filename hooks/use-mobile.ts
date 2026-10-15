import * as React from "react"

const MOBILE_BREAKPOINT = 768

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Subscribe to matchMedia via useSyncExternalStore instead of useEffect + setState.
// Calling setState synchronously in an effect triggers cascading renders;
// useSyncExternalStore lets React read the external MediaQueryList directly.
// Server snapshot is false since there is no viewport during SSR.
const subscribe = (onStoreChange: () => void) => {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches

const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
