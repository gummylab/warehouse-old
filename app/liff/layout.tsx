import { LiffCenter } from './liff-center'
import { LiffGate } from './liff-gate'
import { LiffSessionProvider } from './liff-session-context'

// Every page under /liff is a LINE user surface: the provider resolves the
// LINE session once per load and the gate steers non-approved users to the
// authorization screen. Client-side on purpose: the identity token only
// exists in the browser (ADR 0003). LiffCenter centers the gate's notices
// in the space above them.
export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiffSessionProvider>
      <main className="flex flex-1 flex-col">
        <LiffCenter>
          <LiffGate>{children}</LiffGate>
        </LiffCenter>
      </main>
    </LiffSessionProvider>
  )
}
