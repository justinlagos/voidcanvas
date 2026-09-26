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
// next/font fetches Google Fonts during the build; a network blip there fails the whole build, so try twice.
const build = () => spawnSync('npx', ['next', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, DESKTOP: '1' } }).status
if (build() !== 0) { console.log('Build failed; trying once more.'); if (build() !== 0) process.exit(1) }
run(process.execPath, ['desktop/scripts/copy-app.mjs'])
run(process.execPath, ['desktop/scripts/fetch-fonts.mjs'])
