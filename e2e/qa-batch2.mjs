// Regression checks for QA batch 2 (B01, B02, B07, B11) against a local build.
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []
const ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`); if (!cond) process.exitCode = 1 }

const browser = await chromium.launch()
const errors = []
async function ctx(opts) {
  const c = await browser.newContext(opts)
  c.on('page', p => { p.on('pageerror', e => errors.push(`${opts.viewport.width}: ${e.message}`)); p.on('console', m => { if (m.type() === 'error') errors.push(`${opts.viewport.width} console: ${m.text()}`) }) })
  return c
}
async function loadEffects(page, file) {
  await page.goto(`${BASE}/effects`)
  await page.setInputFiles('input[type=file]', file)
  await page.waitForSelector('canvas[data-result-canvas]')
  await page.waitForTimeout(600)
}
const inView = async (page, sel) => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.top >= -1 && r.width > 0 })

// B01 phone
{
  const c = await ctx({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
  const page = await c.newPage()
  await loadEffects(page, FIX.land)
  const canvasW = await page.$eval('canvas[data-result-canvas]', el => el.getBoundingClientRect().width)
  ok('B01 phone canvas wide enough', canvasW >= 300, `canvas ${Math.round(canvasW)}px`)
  const hdrScroll = await page.$eval('header', el => el.scrollWidth <= el.clientWidth + 1)
  ok('B01 phone header does not scroll sideways', hdrScroll)
  ok('B01 phone Open in Editor reachable', await inView(page, '[data-mobile-actions] button[aria-label="Open in Editor"]'))
  ok('B01 phone PNG download reachable', await inView(page, '[data-mobile-actions] button:has-text("PNG")'))
  ok('B01 phone WebP download reachable', await inView(page, '[data-mobile-actions] button:has-text("WebP")'))
  ok('B01 phone controls visible', await inView(page, '[data-effects-sidebar]'))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  ok('B01 phone no horizontal page overflow', overflow)
  await page.screenshot({ path: OUT('b01_phone.png') })
  // B07 phone: canvas top inside its scroll box
  await loadEffects(page, FIX.portrait)
  const top = await page.$eval('canvas[data-result-canvas]', el => { const r = el.getBoundingClientRect(), p = el.parentElement.parentElement.getBoundingClientRect(); return r.top >= p.top - 1 })
  ok('B07 phone tall image top visible', top)
  await c.close()
}
// B01 tablet + B11
{
  const c = await ctx({ ...devices['iPad Mini'], viewport: { width: 768, height: 1024 } })
  const page = await c.newPage()
  await loadEffects(page, FIX.land)
  ok('B01 tablet Open in Editor reachable', await inView(page, '[data-mobile-actions] button[aria-label="Open in Editor"]'))
  ok('B01 tablet WebP reachable', await inView(page, '[data-mobile-actions] button:has-text("WebP")'))
  const hdrScroll = await page.$eval('header', el => el.scrollWidth <= el.clientWidth + 1)
  ok('B01 tablet header does not scroll sideways', hdrScroll)
  await page.screenshot({ path: OUT('b01_tablet.png') })
  await page.goto(`${BASE}/editor`)
  await page.waitForTimeout(800)
  // open a photo via the start screen if present
  const fi = await page.$('input[type=file]')
  if (fi) { await fi.setInputFiles(FIX.land); await page.waitForTimeout(1500) }
  const bar = await page.$eval('header', el => ({ sw: el.scrollWidth, cw: el.clientWidth, right: el.getBoundingClientRect().right }))
  ok('B11 tablet editor top bar fits', bar.sw <= bar.cw + 1 && bar.right <= 769, JSON.stringify(bar))
  const exp = await page.$('header button:has(svg.lucide-download)')
  ok('B11 tablet Export button inside viewport', exp ? await exp.evaluate(el => el.getBoundingClientRect().right <= innerWidth) : false)
  await page.screenshot({ path: OUT('b11_tablet.png') })
  await c.close()
}
// B02 + B07 desktop 1366
{
  const c = await ctx({ viewport: { width: 1366, height: 768 } })
  const page = await c.newPage()
  await loadEffects(page, FIX.portrait)
  const geo = await page.$eval('canvas[data-result-canvas]', el => { const r = el.getBoundingClientRect(), p = el.parentElement.parentElement.getBoundingClientRect(); return { top: r.top, ptop: p.top, h: r.height, ph: p.height } })
  ok('B07 desktop tall image not clipped at top', geo.top >= geo.ptop - 1 && geo.h <= geo.ph + 1, JSON.stringify(geo))
  const zoomTxt = await page.textContent('span.font-mono.w-10')
  ok('B07 default zoom is fit (<100%)', /^\d+%$/.test(zoomTxt.trim()) && parseInt(zoomTxt) < 100, zoomTxt.trim())
  await page.click('button:has-text("Halftone")').catch(() => {})
  await page.waitForTimeout(500)
  await page.click('button:has-text("Compare")')
  await page.waitForTimeout(300)
  const painted = await page.$eval('canvas[data-original-canvas]', el => { const x = el.getContext('2d'); const d = x.getImageData(0, 0, el.width, el.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) n++; return { n, w: el.width, h: el.height, vis: getComputedStyle(el).visibility } })
  ok('B02 original half is painted', painted.n > 100 && painted.vis === 'visible' && painted.w > 300, JSON.stringify(painted))
  // drag slider with touch-like pointer
  const sl = await page.$('[role=slider]')
  const r = await sl.boundingBox()
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await page.mouse.move(r.x - 150, r.y + 100, { steps: 5 }); await page.mouse.up()
  const v = await page.$eval('[role=slider]', el => +el.getAttribute('aria-valuenow'))
  ok('B02 slider drags', v < 50, `now ${v}`)
  await page.screenshot({ path: OUT('b02_compare.png') })
  await c.close()
}
// B02 slider by touch on phone
{
  const c = await ctx({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, hasTouch: true })
  const page = await c.newPage()
  await loadEffects(page, FIX.land)
  await page.click('button:has-text("Compare")')
  await page.waitForTimeout(300)
  const sl = await page.$('[role=slider]'); const r = await sl.boundingBox()
  const cdp = await c.newCDPSession(page)
  const x = r.x + r.width / 2, y = r.y + r.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 80, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const v = await page.$eval('[role=slider]', el => +el.getAttribute('aria-valuenow'))
  ok('B02 slider drags by touch', v < 50, `now ${v}`)
  await c.close()
}
await browser.close()
console.log(out.join('\n'))
if (errors.length) { console.log('PAGE ERRORS:'); console.log(errors.slice(0, 10).join('\n')); process.exitCode = 1 } else console.log('no page errors')
