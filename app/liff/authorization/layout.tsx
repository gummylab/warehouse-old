// The authorization screen is a single centred notice or button. It owns the
// centring, so the shared LIFF layout no longer has to decide layout from the
// pathname. The main landmark belongs to the LIFF layout above this one.
export default function AuthorizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
      {children}
    </div>
  )
}
