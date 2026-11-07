import { Suspense } from 'react'
import type { Metadata } from 'next'

import { listUsers } from '@/lib/db/users'
import { PAGE_TITLES } from '@/lib/page-titles'

import { RegisterView } from './register-view'

export const metadata: Metadata = {
  title: PAGE_TITLES['/register'],
}

export default function RegisterPage() {
  // The queue read is a cached read that can suspend while the cache fills
  // on a cold start. cacheComponents refuses to prerender a route that
  // suspends without a boundary, so the table gets its own Suspense: the
  // shell renders immediately and the rows stream in.
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterUsers />
    </Suspense>
  )
}

async function RegisterUsers() {
  const users = await listUsers()
  const approvedUsers = users.filter((user) => user.status === 'approved')
  const pendingUsers = users.filter((user) => user.status === 'pending')

  return <RegisterView approvedUsers={approvedUsers} pendingUsers={pendingUsers} />
}

function RegisterFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      กำลังโหลด…
    </div>
  )
}
