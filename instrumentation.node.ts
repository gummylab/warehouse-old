// Node.js-only process hooks. Imported dynamically from instrumentation.ts
// so Turbopack does not statically analyze Node APIs in the Edge bundle.
import { closeDb, getDb } from './lib/db'

export function registerNodeHooks() {
  const shutdown = (signal: string) => {
    console.log(`[shutdown] ${signal} received — closing database`)
    try {
      const db = getDb()
      db.pragma('wal_checkpoint(TRUNCATE)')
    } catch (error) {
      console.error('[shutdown] checkpoint failed:', error)
    }
    try {
      closeDb()
    } catch (error) {
      console.error('[shutdown] closeDb failed:', error)
    }
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Surface unhandled errors instead of dying silently.
  process.on('uncaughtException', (error) => {
    console.error('[fatal] uncaughtException:', error)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandledRejection:', reason)
  })
}
