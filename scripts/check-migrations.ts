// Fails the build when `lib/db/schema.ts` and the generated SQL under
// `drizzle/` have drifted apart.
//
// The check runs the same command a developer runs (`drizzle-kit generate`)
// and compares the folder before and after. When the schema already matches,
// the generator writes nothing and the two fingerprints are equal. When it
// does not, the generator writes a new migration and the build stops, so the
// missing migration is caught here instead of at `migrate()` or at the first
// query that reads a column nobody created.
//
// Fingerprints compare file contents only, never names: the generator picks a
// random suffix (`0001_neat_gargoyle.sql`), so a name-based comparison would
// always report a difference.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle')

// The generator reads no stdin: a rename prompt would otherwise wait for an
// answer that never comes and hang the build. With stdin ignored the prompt
// fails fast, and the message below tells the developer to resolve it by hand.
const GENERATE_TIMEOUT_MS = 120_000

function fingerprint(dir: string, base = dir): Map<string, string> {
  const files = new Map<string, string>()
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      for (const [path, hash] of fingerprint(full, base)) files.set(path, hash)
    } else if (entry.isFile()) {
      files.set(
        relative(base, full).split('\\').join('/'),
        createHash('sha256').update(readFileSync(full)).digest('hex'),
      )
    }
  }
  return files
}

function describeChanges(
  before: Map<string, string>,
  after: Map<string, string>,
): string[] {
  const changes: string[] = []
  for (const [path, hash] of after) {
    if (!before.has(path)) changes.push(`added    drizzle/${path}`)
    else if (before.get(path) !== hash) changes.push(`changed  drizzle/${path}`)
  }
  for (const path of before.keys()) {
    if (!after.has(path)) changes.push(`removed  drizzle/${path}`)
  }
  return changes.sort()
}

const before = fingerprint(MIGRATIONS_DIR)
const generate = Bun.spawnSync([process.execPath, 'x', 'drizzle-kit', 'generate'], {
  stdin: 'ignore',
  stdout: 'inherit',
  stderr: 'inherit',
  timeout: GENERATE_TIMEOUT_MS,
})

// A null exit code means the process was killed, which in practice is the
// timeout above. Either way the schema was never checked.
if (generate.exitCode !== 0) {
  console.error(
    generate.exitCode === null
      ? `[db:check] drizzle-kit generate did not finish within ${GENERATE_TIMEOUT_MS / 1000}s. Run \`bun run db:generate\` directly.`
      : '[db:check] drizzle-kit generate failed. Fix the error above before building.',
  )
  process.exit(1)
}

const changes = describeChanges(before, fingerprint(MIGRATIONS_DIR))
if (changes.length === 0) {
  console.log('[db:check] drizzle/ matches lib/db/schema.ts')
  process.exit(0)
}

console.error('')
console.error('[db:check] lib/db/schema.ts changed but the migration was never generated:')
for (const line of changes) console.error(`  ${line}`)
console.error('')
console.error('[db:check] The build stopped before Next.js started.')
console.error('[db:check] Review the generated file, commit it with the schema change,')
console.error('[db:check] then run the build again.')
process.exit(1)
