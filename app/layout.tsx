import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Metadata, Viewport } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'

// Kanit supports Thai + Latin — single font for the whole app
const kanit = Kanit({
  subsets: ['latin', 'thai'],
  // Only the weights the UI actually uses. Light and black would add bytes
  // to every page for no visible difference.
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Warehouse Dashboard',
    template: '%s | Warehouse Dashboard',
  },
  description: 'ระบบจัดการรูปภาพออเดอร์สำหรับโรงงาน',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // LINE's in-app browser injects safe-area CSS variables into <html>
    // before React hydrates; suppress the resulting attribute mismatch
    // (React's recommended fix for third-party DOM mutation).
    <html
      lang="th"
      className={cn('h-full', 'antialiased', 'font-sans', kanit.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}