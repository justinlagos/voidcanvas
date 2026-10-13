// Local browser evidence runner: serves harness/, drives REAL Chromium,
// collects window.__c1report (real canvas pixels, real modules).
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = new URL('./evidence/', import.meta.url).pathname
fs.mkdirSync(EVIDENCE, { recursive: true })
const server = spawn('python3', ['-m', 'http.server', '8123', '--directory', 'harness'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1500))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)))
  await page.goto('http://localhost:8123/index.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForFunction(() => window.__c1report, null, { timeout: 180000 })
  const report = await page.evaluate(() => window.__c1report)
  await page.screenshot({ path: path.join(EVIDENCE, 'harness-final.png') })
  // Persist milestone renders + exports.
  for (const [name, url] of Object.entries(report.shots)) {
    const b64 = String(url).split(',')[1]
    const ext = name.endsWith('.pdf') ? 'pdf' : 'png'
    const safe = name.replace(/[^a-z0-9.-]+/gi, '-').replace(/\.(png|pdf)$/i, '')
    fs.writeFileSync(path.join(EVIDENCE, `harness-${safe}.${ext}`), Buffer.from(b64, 'base64'))
  }
  // Persist .void bytes.
  const voidArr = await page.evaluate(() => window.__c1void)
  if (voidArr) fs.writeFileSync(path.join(EVIDENCE, 'harness-poster.void'), Buffer.from(voidArr))
  fs.writeFileSync(path.join(EVIDENCE, 'native-asset-harness.json'), JSON.stringify({ at: report.at, steps: report.steps }, null, 2))
  const bad = report.steps.filter(s => !s.ok)
  console.log(`\n${report.steps.length - bad.length}/${report.steps.length} harness checks passed`)
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 5).join('\n'))
  if (bad.length || errors.length) process.exitCode = 1
} finally {
  await browser.close()
  server.kill()
}
