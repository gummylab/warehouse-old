'use client'

import { useOptimistic, useState } from 'react'

import { InboxIcon, UserCheckIcon } from 'lucide-react'

import { DataTable } from '@/components/data-table/data-table'
import { EmptyState } from '@/components/layout/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type RegisterUser } from '@/lib/db/types'

import { columns } from './columns'
import { pendingColumns } from './pending-columns'
import { RegisterDecisionProvider } from './register-decision-context'

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
  // The last refused decision. It lives here rather than next to the
  // button, because a refused decision puts its row back and the button
  // that reported it has already unmounted with the row it removed.
  const [error, setError] = useState<string | null>(null)

  // The rows the operator sees. A decided row leaves the table on the
  // click, before the server has answered, and the server's revalidated
  // payload replaces these rows once it arrives (or puts the row back if
  // the write was refused).
  //
  // useOptimistic only accepts updates made inside a transition or an
  // action, so removeUser is called from the buttons' own action, never
  // from an event handler.
  const [optimisticUsers, removeOptimistic] = useOptimistic(
    [...approvedUsers, ...pendingUsers],
    (users, id: string) => users.filter((user) => user.id !== id),
  )

  const approved = optimisticUsers.filter((user) => user.status === 'approved')
  const pending = optimisticUsers.filter((user) => user.status === 'pending')

  return (
    <RegisterDecisionProvider
      value={{
        removeUser: removeOptimistic,
        reportError: setError,
      }}
    >
      {error && (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
        <DataTable
          columns={tab === 'pending' ? pendingColumns : columns}
          data={tab === 'pending' ? pending : approved}
          searchColumn="displayName"
          searchSlot={
            <TabsList>
              <TabsTrigger value="approved">ผู้ใช้ที่อนุมัติแล้ว</TabsTrigger>
              <TabsTrigger value="pending">รอตรวจสอบ ({pending.length})</TabsTrigger>
            </TabsList>
          }
          emptySlot={
            // The two tabs mean different things, so they get different
            // messages instead of the table's generic "ไม่พบข้อมูล".
            <EmptyState
              variant="page"
              bordered
              icon={tab === 'pending' ? <InboxIcon /> : <UserCheckIcon />}
              title={
                tab === 'pending'
                  ? 'ไม่มีคำขอรอตรวจสอบ'
                  : 'ยังไม่มีผู้ใช้ที่อนุมัติแล้ว'
              }
              description={
                tab === 'pending'
                  ? 'คำขอใหม่จะปรากฏที่นี่เมื่อพนักงานขอสิทธิ์ผ่าน LINE'
                  : 'เมื่ออนุมัติคำขอ ผู้ใช้จะย้ายมาแสดงในแท็บนี้'
              }
            />
          }
        />
      </Tabs>
    </RegisterDecisionProvider>
  )
}
