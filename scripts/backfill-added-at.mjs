// One-off: stamp every catalog entry with the date it first appeared in git history.
// Idempotent: entries that already have addedAt are skipped. Run: node scripts/backfill-added-at.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'src/data/catalog.ts'
const raw = readFileSync(FILE, 'utf8')
const eol = raw.includes('\r\n') ? '\r\n' : '\n'
const lines = raw.replace(/\r\n/g, '\n').split('\n')
const out = []
const dist = {}
let stamped = 0
for (let i = 0; i < lines.length; i++) {
  out.push(lines[i])
  const m = lines[i].match(/^(\s+)id: '([^']+)',$/)
  if (!m) continue
  if (/addedAt:/.test(lines[i + 1] || '')) continue
  const log = execFileSync('git', ['log', '--reverse', '--format=%ad', '--date=short', `-S${lines[i].trim()}`, '--', FILE], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log)) throw new Error(`no history date for ${m[2]}: "${log}"`)
  out.push(`${m[1]}addedAt: '${log}',`)
  dist[log] = (dist[log] || 0) + 1
  stamped++
}
writeFileSync(FILE, out.join('\n').replace(/\n/g, eol))
console.log(`stamped ${stamped} entries`, dist)
