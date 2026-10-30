import { Suspense } from 'react'

import { AppNavbarLabel } from '@/components/app-navbar-label'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

import AdminGate from './admin-gate'

// Dashboard chrome: sidebar + header. Root layout stays minimal so future
// non-admin pages can opt out of this shell.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="my-2" />
            <AppNavbarLabel />
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4">
          {/* The gate reads the request headers, which is runtime data, so
              it needs a boundary. It also keeps the admin pages out of the
              static shell for anyone but the machine running the server. */}
          <Suspense fallback={null}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
