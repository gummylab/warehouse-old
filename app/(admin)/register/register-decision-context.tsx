'use client'

import { createContext, useContext } from 'react'

// The register screen removes a row as soon as the operator decides it:
// approving moves it out of the queue, rejecting removes it, revoking
// removes it from the approved table. The removal is optimistic, so the
// row leaves the table on the click instead of after the server round
// trip.
//
// The optimistic state lives in RegisterView, above the table. The buttons
// live inside the table's cells, and the table's column definitions are
// module-level constants, so this context is how a button reaches the
// state above it.
export type RegisterDecisionContextValue = {
  // Removes a row from the table it is in. The server's revalidated
  // payload replaces the optimistic rows once it arrives.
  removeUser: (id: string) => void
  // Swaps a row's form badges before the server answers, so the edit dialog
  // closes with the new set already visible. A refusal reverts the overlay
  // and the base row comes back unchanged.
  updateForms: (id: string, formIds: string[]) => void
  // Reports that a decision was refused. The message lives above the
  // table rather than next to the button, because the button unmounts
  // together with the row it removed.
  reportError: (message: string) => void
}

const RegisterDecisionContext = createContext<RegisterDecisionContextValue | null>(
  null,
)

export function RegisterDecisionProvider({
  value,
  children,
}: {
  value: RegisterDecisionContextValue
  children: React.ReactNode
}) {
  return (
    <RegisterDecisionContext.Provider value={value}>
      {children}
    </RegisterDecisionContext.Provider>
  )
}

export function useRegisterDecision(): RegisterDecisionContextValue {
  const value = useContext(RegisterDecisionContext)
  if (!value) {
    throw new Error(
      'useRegisterDecision must be used inside a RegisterDecisionProvider',
    )
  }
  return value
}
