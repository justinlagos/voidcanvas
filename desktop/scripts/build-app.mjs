// Build the web app as a static export for the desktop app, copy it in, and bundle the fonts.
// Cross-platform (Windows shells cannot set DESKTOP=1 inline).
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
run('npx', ['next', 'build'], { DESKTOP: '1' })
run(process.execPath, ['desktop/scripts/copy-app.mjs'])
run(process.execPath, ['desktop/scripts/fetch-fonts.mjs'])
