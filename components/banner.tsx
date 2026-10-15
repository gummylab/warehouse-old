import { WarehouseIcon } from 'lucide-react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'

export default function Banner() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="hover:bg-foreground hover:text-background active:bg-foreground active:text-background cursor-default bg-foreground text-background"
          render={
            <div>
              <WarehouseIcon />
              <span className="text-base font-semibold">Warehouse Dashboard</span>
            </div>
          }></SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}