import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

import { AuthorizationClient } from './authorization-client'

export const metadata: Metadata = {
  title: PAGE_TITLES['/liff/authorization'],
}

// Static shell: identity is resolved in the browser (see
// authorization-client.tsx), so the server renders the same markup for
// everyone. The outer liff layout already provides the <main> wrapper.
export default function AuthorizationPage() {
  return <AuthorizationClient />
}
