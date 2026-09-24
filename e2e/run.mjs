// Runs every QA regression check against a local production build.
// Usage: npm run build && npm run e2e   (starts `next start` on port 3123, or set BASE to an existing server)
import { spawn } from 'node:child_process'
const BASE = process.env.BASE || 'http://localhost:3123'
let server = null
if (!process.env.BASE) {
  server = spawn('npx', ['next', 'start', '-p', '3123'], { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) { try { await fetch(BASE); break } catch { await new Promise(r => setTimeout(r, 1000)) } }
}
let failed = false
for (const f of ['qa-batch1', 'qa-batch2', 'qa-batch3', 'qa-batch5', 'ux-a-text']) {
  console.log(`\n== ${f}`)
  const code = await new Promise(r => spawn(process.execPath, [`e2e/${f}.mjs`], { stdio: 'inherit', env: { ...process.env, BASE } }).on('exit', r))
  if (code) failed = true
}
server?.kill()
process.exit(failed ? 1 : 0)
