'use client'

import { useState } from 'react'

import { DataTable } from '@/components/data-table/data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type RegisterUser } from '@/lib/db/users'

import { columns } from './columns'
import { pendingColumns } from './pending-columns'

interface RegisterViewProps {
  approvedUsers: RegisterUser[]
  pendingUsers: RegisterUser[]
}

// Single table whose columns/data swap with the selected tab. The tab switcher
// sits at the right end of the search row (searchSlot) instead of its own row,
// so it stays mounted across switches — no focus loss, no duplicated triggers.
export function RegisterView({ approvedUsers, pendingUsers }: RegisterViewProps) {
  // Open the queue first when work is waiting, the registry otherwise.
  const [tab, setTab] = useState<'approved' | 'pending'>(
    pendingUsers.length > 0 ? 'pending' : 'approved',
  )

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
      <DataTable
        columns={tab === 'pending' ? pendingColumns : columns}
        data={tab === 'pending' ? pendingUsers : approvedUsers}
        searchColumn="displayName"
        searchSlot={
          <TabsList>
            <TabsTrigger value="approved">ผู้ใช้ที่อนุมัติแล้ว</TabsTrigger>
            <TabsTrigger value="pending">
              รอตรวจสอบ ({pendingUsers.length})
            </TabsTrigger>
          </TabsList>
        }
      />
    </Tabs>
  )
}
