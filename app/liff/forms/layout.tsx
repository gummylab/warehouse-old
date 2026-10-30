// The form routes read top to bottom: no vertical centring. Each page owns
// its padding through FormPage or PageBody, so this layout stays structural.
// The main landmark belongs to the LIFF layout above this one.
export default function FormsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex flex-1 flex-col">{children}</div>
}
