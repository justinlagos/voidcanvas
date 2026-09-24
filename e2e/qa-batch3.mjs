// B03 brand builder persistence, B16 handoff fonts inline.
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
import fs from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []
const ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`); if (!cond) process.exitCode = 1 }
const browser = await chromium.launch()
const errors = []
const c = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true })
const page = await c.newPage()
page.on('pageerror', e => errors.push(e.message))
const googleReqs = []
page.on('request', r => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) googleReqs.push(r.url()) })

async function openBuilder() {
  await page.goto(`${BASE}/studio`)
  await page.click('button:has-text("Guideline builder")')
  await page.waitForSelector('input[placeholder="e.g. Northbound"]')
}
await openBuilder()
await page.fill('input[placeholder="e.g. Northbound"]', 'Oke Drinks')
await page.fill('input[placeholder="What it stands for"]', 'Cold and honest')
await page.setInputFiles('input[accept="image/*,.svg"]', FIX.logo)
await page.waitForTimeout(800)
// move the second page down one place
const moveBtn = await page.$('button[aria-label^="Move Principles down"], button[aria-label*="down"]')
if (moveBtn) await moveBtn.click()
await page.waitForTimeout(900) // debounce
const orderBefore = await page.$$eval('nav button[aria-label*="Page "]', els => els.map(e => e.getAttribute('aria-label')).slice(0, 4))
await page.reload()
await page.waitForTimeout(500)
// Studio home again after reload (view state is not in the URL); reopen the builder
await page.click('button:has-text("Guideline builder")')
await page.waitForSelector('input[placeholder="e.g. Northbound"]')
await page.waitForTimeout(1200)
const name = await page.inputValue('input[placeholder="e.g. Northbound"]')
const tag = await page.inputValue('input[placeholder="What it stands for"]')
ok('B03 name survives reload', name === 'Oke Drinks', name)
ok('B03 tagline survives reload', tag === 'Cold and honest', tag)
ok('B03 restored banner shown', !!(await page.$('[data-brand-restored]')))
const orderAfter = await page.$$eval('nav button[aria-label*="Page "]', els => els.map(e => e.getAttribute('aria-label')).slice(0, 4))
ok('B03 page order survives reload', JSON.stringify(orderBefore) === JSON.stringify(orderAfter), `${orderBefore.join('|')} vs ${orderAfter.join('|')}`)
const h1 = await page.textContent('h1')
ok('B03 header shows brand', h1.includes('Oke Drinks'), h1)
// logo restored: the Identity tab shows the logo file name or a remove control; check via the store-driven checks: look for an <img>/canvas in the Identity tab
const logoShown = await page.evaluate(() => !!document.querySelector('aside canvas, aside img'))
ok('B03 logo survives reload', logoShown)
await page.screenshot({ path: OUT('b03_after_reload.png') })

// B16 handoff
await page.click('button[role=tab]:has-text("Export")')
googleReqs.length = 0
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('button:has-text("HTML handoff")')])
const path = OUT('handoff.html')
await dl.saveAs(path)
const html = fs.readFileSync(path, 'utf8')
const hasLink = /fonts\.googleapis\.com/.test(html)
const faces = (html.match(/@font-face/g) || []).length
const dataFonts = (html.match(/data:font\/woff2;base64,/g) || []).length
ok('B16 handoff has no Google link', !hasLink, `font-faces ${faces}, inlined ${dataFonts}, size ${(html.length / 1024).toFixed(0)} KB`)
ok('B16 handoff has inlined fonts', dataFonts >= 2)
// open the file offline and check the fonts resolve
const off = await browser.newContext()
const p2 = await off.newPage()
await off.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort())
await p2.goto('file://' + path)
await p2.waitForTimeout(800)
const loaded = await p2.evaluate(async () => { const fams = Array.from(new Set(Array.from(document.fonts).map(f => f.family))); for (const f of fams) await document.fonts.load(`16px ${f}`).catch(() => {}); return Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family) })
ok('B16 handoff fonts load offline', loaded.length >= 1, loaded.join(', '))
await off.close()

// Start over clears
await page.click('[data-brand-restored] button:has-text("Start over")')
await page.click('[data-brand-restored] button:has-text("Clear and start over")')
await page.waitForTimeout(800)
await page.reload(); await page.click('button:has-text("Guideline builder")'); await page.waitForSelector('input[placeholder="e.g. Northbound"]'); await page.waitForTimeout(800)
ok('B03 start over clears the draft', (await page.inputValue('input[placeholder="e.g. Northbound"]')) === '' && !(await page.$('[data-brand-restored]')))

await browser.close()
console.log(out.join('\n'))
if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 5).join('\n')); process.exitCode = 1 } else console.log('no page errors')
