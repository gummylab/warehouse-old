import { revalidateTag } from 'next/cache'

// Safe wrapper: revalidateTag throws when called outside a request context
// (e.g., in unit tests). Swallow the error so mutations still succeed.
export function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max')
  } catch {
    // No request context — skip invalidation (tests, background tasks).
  }
}
