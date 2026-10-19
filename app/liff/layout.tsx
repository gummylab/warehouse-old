import { LiffGate } from './liff-gate'
import { LocalDeviceBanner } from './local-device-banner'
import { LiffSessionProvider } from './liff-session-context'

// Every page under /liff is a LINE user surface: the provider resolves the
// LINE session once per load and the gate steers non-approved users to the
// authorization screen. Client-side on purpose: the identity token only
// exists in the browser (ADR 0003). The banner above the gate names local
// device mode when the session skipped LINE (ADR 0004).
export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiffSessionProvider>
      <main className="p-4">
        <LocalDeviceBanner />
        <LiffGate>{children}</LiffGate>
      </main>
    </LiffSessionProvider>
  )
}
