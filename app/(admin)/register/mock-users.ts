import { type RegisterUser } from './columns'

// Temporary stand-in until the user API exists: swap the import in page.tsx
// for a real fetch when it lands, then delete this file.
export const mockUsers: RegisterUser[] = [
  {
    id: 'U-0001',
    displayName: 'สมชาย ใจดี',
    // No URL: renders the letter fallback, no network needed. Add a picture
    // URL here to test the avatar image path.
    status: 'pending',
    requestedAt: '2026-10-15T09:30:00+07:00',
  },
]
