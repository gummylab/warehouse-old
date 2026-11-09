import { revalidatePath, revalidateTag } from 'next/cache'

// Expire the tag for the very next read instead of leaving stale content in
// place. The 'max' profile is stale-while-revalidate: the first read after a
// write is answered from the old entry while the new one builds, which is
// exactly the delay the operator sees after saving from the phone. `expire: 0`
// makes that read a blocking revalidate (docs: revalidateTag).
//
// The wrapper exists because revalidateTag throws outside a request context
// (unit tests call the data layer directly). Swallow the error so mutations
// still succeed.
export function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch {
    // No request context — skip invalidation (tests, background tasks).
  }
}

// Same guard for the path sweep. revalidatePath('/path', 'layout') also
// purges the Client Cache, which is the only way to drop an RSC payload the
// browser prefetched before the data underneath it changed.
export function safeRevalidatePath(
  path: string,
  type?: 'page' | 'layout',
): void {
  try {
    revalidatePath(path, type)
  } catch {
    // No request context — skip invalidation (tests, background tasks).
  }
}
