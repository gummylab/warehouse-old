import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

import { type RegisterUser } from './columns'
import { RegisterView } from './register-view'

export const metadata: Metadata = {
  title: PAGE_TITLES['/register'],
}

// No backend yet: replace with a real fetch when the user API exists, then
// the status split below keeps working as-is.
const users: RegisterUser[] = []
const approvedUsers = users.filter((user) => user.status === 'approved')
const pendingUsers = users.filter((user) => user.status === 'pending')

export default function RegisterPage() {
  return <RegisterView approvedUsers={approvedUsers} pendingUsers={pendingUsers} />
}
