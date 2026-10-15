import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

import { type RegisterUser } from './columns'
import { mockUsers } from './mock-users'
import { RegisterView } from './register-view'

export const metadata: Metadata = {
  title: PAGE_TITLES['/register'],
}

// No backend yet: mock data stands in for the real fetch. When the user API
// exists, replace `mockUsers` with it and the status split keeps working.
const users: RegisterUser[] = mockUsers
const approvedUsers = users.filter((user) => user.status === 'approved')
const pendingUsers = users.filter((user) => user.status === 'pending')

export default function RegisterPage() {
  return <RegisterView approvedUsers={approvedUsers} pendingUsers={pendingUsers} />
}
