'use client'

import { ImageIcon, LayoutDashboardIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import Banner from '@/components/banner'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from 'cn'

// Single responsibility: render main nav in content and user entry in footer.
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open } = useSidebar()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className={cn(open ? 'py-4' : 'py-2')}>
        <Banner />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="แดชบอร์ด" render={<Link href="/" />}>
              <LayoutDashboardIcon />
              <span>แดชบอร์ด</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="จัดการรูปภาพออเดอร์" render={<Link href="/order-images" />}>
              <ImageIcon />
              <span>จัดการรูปภาพออเดอร์</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="จัดการผู้ใช้" render={<Link href="/register" />}>
              <UsersIcon />
              <span>จัดการผู้ใช้</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
