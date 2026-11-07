// Graceful shutdown + process-level hooks.
// Runs once on server startup (Next.js instrumentation hook).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { registerNodeHooks } = await import('./instrumentation.node')
  registerNodeHooks()
}
