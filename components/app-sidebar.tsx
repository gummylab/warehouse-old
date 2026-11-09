'use client'

import {
  FootprintsIcon,
  ImageIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'
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
import { PAGE_TITLES } from '@/lib/page-titles'
import { cn } from 'cn'

// Single responsibility: render main nav in content and the two admin entries
// (users, settings) in the footer.
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
            <SidebarMenuButton tooltip={PAGE_TITLES['/']} render={<Link href="/" />}>
              <LayoutDashboardIcon />
              <span>{PAGE_TITLES['/']}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={PAGE_TITLES['/order-images']} render={<Link href="/order-images" />}>
              <ImageIcon />
              <span>{PAGE_TITLES['/order-images']}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={PAGE_TITLES['/line-walks']} render={<Link href="/line-walks" />}>
              <FootprintsIcon />
              <span>{PAGE_TITLES['/line-walks']}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={PAGE_TITLES['/register']} render={<Link href="/register" />}>
              <UsersIcon />
              <span>{PAGE_TITLES['/register']}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={PAGE_TITLES['/settings']} render={<Link href="/settings" />}>
              <SettingsIcon />
              <span>{PAGE_TITLES['/settings']}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
