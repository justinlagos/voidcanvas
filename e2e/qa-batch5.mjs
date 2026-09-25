// B06 timings for every effect, main-thread responsiveness while a slider moves; B10 export sizes and look match.
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
import fs from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []
const ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`); if (!cond) process.exitCode = 1 }
const browser = await chromium.launch()
const c = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true })
const page = await c.newPage()
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(`${BASE}/effects`)
await page.setInputFiles('input[type=file]', FIX.land)
await page.waitForSelector('canvas[data-result-canvas]')
await page.waitForTimeout(800)

// Worker in use?
const usesWorker = await page.evaluate(() => performance.getEntriesByType('resource').some(r => /worker|effects/i.test(r.name) && r.initiatorType === 'other') || true)
const names = await page.$$eval('[data-effects-sidebar] button', els => els.map(e => e.textContent.trim()).filter(Boolean))

// Timing per effect: click, wait until processing settles (the Processing badge disappears), measure.
const effectButtons = await page.$$eval('[data-effects-sidebar] button', els => els.filter(e => e.querySelector('span, div') && e.getBoundingClientRect().height > 40).length)
const timings = {}
const listBtn = async name => page.locator(`[data-effects-sidebar] button:has-text("${name}")`).first()
async function settle() {
  await page.waitForTimeout(60)
  await page.waitForFunction(() => !document.body.innerText.includes('Processing'), null, { timeout: 30000 })
}
const canvasHash = () => page.$eval('canvas[data-result-canvas]', el => { const x = el.getContext('2d'); const d = x.getImageData(0, 0, el.width, el.height).data; let h = 0; for (let i = 0; i < d.length; i += 4 * 211) h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; return h })
// Warm the worker first so the first timed effect does not pay its start-up cost.
await (await listBtn('Sepia')).click(); await settle()
const effectNames = ['Bloom', 'Oil Paint', 'Watercolor', 'Blur', 'Halftone', 'Glitch', 'Pixelate', 'Motion Blur']
for (const n of effectNames) {
  const t0 = Date.now()
  await (await listBtn(n)).click()
  await settle()
  timings[n] = Date.now() - t0
}
ok('B06 Bloom under 700 ms', timings['Bloom'] < 700, JSON.stringify(timings))
ok('B06 Oil Paint under 700 ms', timings['Oil Paint'] < 700)

// Main thread stays free while Bloom slider moves: measure a rAF gap during slider input.
await (await listBtn('Bloom')).click(); await settle()
const slider = page.locator('[data-effects-sidebar] input[type=range]').first()
const box = await slider.boundingBox()
const gap = await page.evaluate(async () => {
  let worst = 0, last = performance.now()
  const tick = () => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; if (n - start < 1500) requestAnimationFrame(tick) }
  const start = performance.now(); requestAnimationFrame(tick)
  window.__gapDone = new Promise(r => setTimeout(() => r(worst), 1600))
  return 0
})
for (let i = 0; i < 12; i++) { await page.mouse.click(box.x + box.width * (0.2 + i * 0.05), box.y + box.height / 2); await page.waitForTimeout(60) }
const worst = await page.evaluate(() => window.__gapDone)
ok('B06 main thread never blocks over 250 ms during Bloom slider drags', worst < 250, `worst frame gap ${Math.round(worst)} ms`)
await settle()

// B10: download PNG, expect source size 2000x1335
await (await listBtn('Halftone')).click(); await settle()
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('header button:has-text("PNG")')])
const p = OUT('export.png'); await dl.saveAs(p)
const size = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); return [img.naturalWidth, img.naturalHeight] }, fs.readFileSync(p).toString('base64'))
ok('B10 Effects download is source size', size[0] === 2000 && size[1] === 1335, `${size[0]}x${size[1]}`)

// Look match: preview vs export downscaled, for a few size-based effects
for (const n of ['Halftone', 'ASCII', 'Mosaic', 'Oil Paint', 'Crosshatch', 'Stipple', 'Watercolor', 'Pointillism', 'Woodcut', 'Pixelate', 'Crystallize', 'Low Poly', 'Glitch', 'RGB Shift', 'Chromatic', 'Wave', 'Displace', 'CRT', 'Motion Blur', 'Slice Shift', 'Blur', 'Film Grain', 'Scanlines', 'Bloom', 'Dot Matrix']) {
  await (await listBtn(n)).click(); await settle()
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('header button:has-text("PNG")')])
  const f = OUT(`export_${n.replace(/ /g, '')}.png`); await d.saveAs(f)
  await page.screenshot({ path: OUT(`preview_${n.replace(/ /g, '')}.png`), clip: { x: 0, y: 0, width: 1, height: 1 } })
  const diff = await page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const pv = document.querySelector('canvas[data-result-canvas]')
    const c = document.createElement('canvas'); c.width = pv.width; c.height = pv.height
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height)
    const a = x.getImageData(0, 0, c.width, c.height).data, b = pv.getContext('2d').getImageData(0, 0, pv.width, pv.height).data
    // compare 8x8 block means (structure), not pixels (dot phase differs)
    const bw = 16, cols = Math.floor(c.width / bw), rows = Math.floor(c.height / bw); let tot = 0, n = 0
    for (let by = 0; by < rows; by++) for (let bx = 0; bx < cols; bx++) {
      let sa = 0, sb = 0
      for (let y = 0; y < bw; y++) for (let xx = 0; xx < bw; xx++) { const i = ((by * bw + y) * c.width + bx * bw + xx) * 4; sa += a[i] + a[i + 1] + a[i + 2]; sb += b[i] + b[i + 1] + b[i + 2] }
      tot += Math.abs(sa - sb) / (bw * bw * 3); n++
    }
    return tot / n
  }, fs.readFileSync(f).toString('base64'))
  ok(`B10 ${n} export looks like the preview (block diff < 12)`, diff < 12, `diff ${diff.toFixed(1)}`)
  if (diff >= 12) fs.copyFileSync(f, OUT(`bad_${n.replace(/ /g, '')}.png`))
}

// Quick tool
await page.goto(`${BASE}/tools/halftone`); await page.waitForTimeout(800)
await page.setInputFiles('input[type=file]', FIX.portrait); await page.waitForTimeout(1500)
const [d2] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download PNG")')])
const p2 = OUT('tool_export.png'); await d2.saveAs(p2)
const s2 = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); return [img.naturalWidth, img.naturalHeight] }, fs.readFileSync(p2).toString('base64'))
ok('B10 quick tool download is source size', s2[0] === 2000 && s2[1] === 3000, `${s2[0]}x${s2[1]}`)

await browser.close()
console.log(out.join('\n'))
if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 5).join('\n')); process.exitCode = 1 } else console.log('no page errors')
