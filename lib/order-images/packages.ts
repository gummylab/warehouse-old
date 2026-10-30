// Packaging vocabulary shared by the form's package select, the upload
// API's validation and the SQLite CHECK constraint on images.package.
// Display strings double as stored values — no enum translation layer like
// eu-shipment's packageMap needed ('Inner Box' stored as-is).
export const PACKAGE_OPTIONS = ['Primary', 'Inner Box', 'Sleeve Box', 'Tray', 'Carton'] as const

export type PackageName = (typeof PACKAGE_OPTIONS)[number]

export function isPackageName(value: unknown): value is PackageName {
  return typeof value === 'string' && (PACKAGE_OPTIONS as readonly string[]).includes(value)
}
