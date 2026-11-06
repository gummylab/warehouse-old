import type { LineWalkPoint } from '@/lib/db/types'

// SQL only returns buckets that have rows. The chart needs every bucket in the
// window, in order, so a gap is a zero-value point and the axis stays
// continuous.
export function fillLineWalkTrend(
  buckets: string[],
  rows: LineWalkPoint[],
): LineWalkPoint[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]))
  return buckets.map(
    (bucket) => byBucket.get(bucket) ?? { bucket, people: 0, amount: 0 },
  )
}
