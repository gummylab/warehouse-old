import { Suspense } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { PageBody } from '@/components/layout/page-body'
import { PageFooter } from '@/components/layout/page-footer'
import { SkipLink } from '@/components/layout/skip-link'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import AdminGate from './admin-gate'
import { AppHeader } from './app-header'

// Dashboard chrome: sidebar + header + content + footer. The root layout
// stays minimal so pages outside (admin) can opt out of this shell.
//
// SidebarInset is already a <main>, so the page body is a div inside it, not
// a second main element. PageBody owns the gutter and the flex-1 height the
// data table needs.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      {/* First focusable element in the DOM, before the sidebar links. */}
      <SkipLink />
      <AppSidebar />
      <SidebarInset className="flex min-h-svh flex-col">
        {/* AppHeader reads usePathname; the fallback keeps the sticky bar's
            height while the title streams in on a prerendered route. */}
        <Suspense
          fallback={
            <div className="h-16 shrink-0 border-b bg-background/80" />
          }>
          <AppHeader />
        </Suspense>

        <PageBody id="main-content" fill>
          {/* The gate reads the request headers, which is runtime data, so
              it needs a boundary. It also keeps the admin pages out of the
              static shell for anyone but the machine running the server. */}
          <Suspense fallback={null}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </PageBody>

        <PageFooter>โหมดเครื่องผู้ดูแลระบบ</PageFooter>
      </SidebarInset>
    </SidebarProvider>
  )
}
