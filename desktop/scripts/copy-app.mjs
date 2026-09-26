// Copy the static export (.next-desktop) into desktop/app, which the Electron app serves offline.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const from = path.join(root, '.next-desktop')
const to = path.join(root, 'desktop', 'app')
if (!fs.existsSync(path.join(from, 'editor.html'))) { console.error('No desktop export found. Run: DESKTOP=1 next build'); process.exit(1) }
fs.rmSync(to, { recursive: true, force: true })
fs.cpSync(from, to, { recursive: true, filter: src => !/[\\/](sw\.js|cache)$/.test(src) })
console.log(`Copied the app into ${path.relative(root, to)}`)
