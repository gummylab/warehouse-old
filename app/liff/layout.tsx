import { LiffGate } from './liff-gate'
import { LiffSessionProvider } from './liff-session-context'

// Every page under /liff is a LINE user surface: the provider resolves the
// LINE session once per load and the gate steers non-approved users to the
// authorization screen. Client-side on purpose: the identity token only
// exists in the browser (ADR 0003).
//
// The <main> lives here, above the gate, so the loading and error notices
// still sit inside a main landmark. The authorization and form layouts are
// plain divs; a second main inside this one would be invalid.
export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiffSessionProvider>
      <main className="flex flex-1 flex-col">
        <LiffGate>{children}</LiffGate>
      </main>
    </LiffSessionProvider>
  )
}
