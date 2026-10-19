// Item numbering rules inherited from the old eu-shipment system (see its
// AGENTS.md): singles are multiples of 100 (100, 200, ...), varieties sit
// +10..+90 under their parent pack (110-190 under 100), max 9 per pack.
// Pure functions on purpose: the form validates with them before submitting
// and the server re-checks with the same code, so the rules cannot drift.

export const VARIETY_STEP = 10
export const TOP_ITEM_STEP = 100
export const MAX_VARIETIES_PER_PACK = 9
export const MAX_VARIETY_SPAN = 90

export function isValidItemNumber(n: number): boolean {
  return (
    Number.isInteger(n) && n >= TOP_ITEM_STEP && n % VARIETY_STEP === 0 && n % TOP_ITEM_STEP <= MAX_VARIETY_SPAN
  )
}

export function isVarietyNumber(n: number): boolean {
  return n % TOP_ITEM_STEP !== 0
}

// 110 maps to its pack 100; a multiple of 100 is its own pack.
export function parentItemNumber(n: number): number {
  return n - (n % TOP_ITEM_STEP)
}

// Next free single for an order: 100 on an empty order, else max + 100.
// `existingTopLevel` must contain only numbers of items without a parent.
export function nextSingleNumber(existingTopLevel: number[]): number {
  return existingTopLevel.length ? Math.max(...existingTopLevel) + TOP_ITEM_STEP : TOP_ITEM_STEP
}

// Next free variety under a pack: parent + 10 steps, capped at 9 children
// and +90 span. Returns null when the pack is full (same limits the old
// OrderDetailDialog disabled its add button at).
export function nextVarietyNumber(parentNumber: number, childNumbers: number[]): number | null {
  if (childNumbers.length >= MAX_VARIETIES_PER_PACK) return null
  const base = childNumbers.length ? Math.max(...childNumbers) : parentNumber
  const next = base + VARIETY_STEP
  return next - parentNumber > MAX_VARIETY_SPAN ? null : next
}
