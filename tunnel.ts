// tunnel.ts
import { bin, install } from 'cloudflared'
import fs from 'node:fs'

/**
 * Condense a cloudflared log line to only the important parts.
 * Returns the line to print, or null to drop it entirely.
 * Dropping unfiltered lines also prevents the tunnel token
 * from leaking into logs (cloudflared prints env vars at startup).
 */
function condenseTunnelLine(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Always keep errors — they matter
  if (/\bERR\b|error=/i.test(trimmed)) return trimmed

  // "Registered tunnel connection ... location=bkk01" -> "✓ Connected (bkk01)"
  if (trimmed.includes('Registered tunnel connection')) {
    const location = trimmed.match(/location=(\S+)/)?.[1]
    return location ? `✓ Connected (${location})` : '✓ Connected'
  }

  // "Updated to new configuration config=..." -> "→ hostname → service"
  if (trimmed.includes('Updated to new configuration')) {
    const hostname = trimmed.match(/hostname\\?":\\?"([^"\\]+)/)?.[1]
    const service = trimmed.match(/service\\?":\\?"([^"\\]+)/)?.[1]
    if (hostname && service) return `→ ${hostname} → ${service}`
  }

  // Drop the rest: pre-checks, ICMP proxy, version info, env vars dump
  return null
}

/** Read a stream line-by-line and print only condensed lines. */
async function printCondensed(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const condensed = condenseTunnelLine(line)
      if (condensed) console.log(condensed)
    }
  }

  // Flush the last line if the stream ended without a trailing newline
  if (buffer) {
    const condensed = condenseTunnelLine(buffer)
    if (condensed) console.log(condensed)
  }
}

async function startTunnel() {
  // 1. เช็กว่ามี binary หรือยัง
  if (!fs.existsSync(bin)) {
    console.log('Installing cloudflared binary...')
    await install(bin)
  }

  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN

  if (!token) {
    console.error('❌ Error: CLOUDFLARE_TUNNEL_TOKEN is not defined in .env')
    process.exit(1)
  }

  console.log('🚀 Starting Cloudflare Tunnel...')

  // 2. Run cloudflared with piped output so we can filter the noise
  const proc = Bun.spawn([bin, 'tunnel', 'run', '--token', token], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  })

  // Print only condensed, important lines to keep the dev log short
  await Promise.all([printCondensed(proc.stdout), printCondensed(proc.stderr)])

  await proc.exited
}

startTunnel().catch(console.error)
