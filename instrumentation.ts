// Graceful shutdown + process-level hooks.
// Runs once on server startup (Next.js instrumentation hook).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { closeDb, getDb } = await import('./lib/db')

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
