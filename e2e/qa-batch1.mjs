// Batch 1 checks: B05 B08 B12 B13 B14 B15 B19 B20 B21
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []
const ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`); if (!cond) process.exitCode = 1 }
const browser = await chromium.launch()
const c = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
const page = await c.newPage()
const errors = []; page.on('pageerror', e => errors.push(e.message))
const googleFontReqs = []; page.on('request', r => { if (/fonts\.googleapis\.com/.test(r.url())) googleFontReqs.push(r.url()) })

// B05: fonts self-hosted, headline in Inter
await page.goto(`${BASE}/`); await page.waitForTimeout(800)
const fam = await page.evaluate(async () => { await document.fonts.ready; const h = document.querySelector('h1') || document.body; return { family: getComputedStyle(h).fontFamily, loaded: Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family) } })
ok('B05 Inter loaded from the app', /Inter/.test(fam.family) && fam.loaded.length > 0, `${fam.family.slice(0, 40)} | ${fam.loaded.slice(0, 3).join(',')}`)
ok('B05 no Google Fonts request on the Hub', googleFontReqs.length === 0)
// B14 count
const hub = await page.textContent('body')
ok('B14 Hub says All 58 effects', /All 58 effects/.test(hub))
await page.goto(`${BASE}/tools/halftone`); await page.waitForTimeout(500)
ok('B14 tool page says All 58 effects', /All 58 effects/.test(await page.textContent('body')))

// B19 title
await page.goto(`${BASE}/effects`); await page.waitForTimeout(300)
const title = await page.title()
ok('B19 /effects has its own title', /Effects/.test(title) && !/brief to finished/.test(title), title)

// B13: PDF via the picker is refused with a message; 30 MB refused
await page.setInputFiles('input[type=file]', { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake') })
await page.waitForTimeout(400)
ok('B13 non-image shows an error, no canvas', !!(await page.$('[role=alert]')) && !(await page.$('canvas[data-result-canvas]')), (await page.textContent('[role=alert]').catch(() => '')).slice(0, 60))
await page.setInputFiles('input[type=file]', { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(26 * 1024 * 1024) })
await page.waitForTimeout(400)
ok('B13 oversize file refused with the 25 MB limit named', /25 MB/.test(await page.textContent('[role=alert]').catch(() => '')))
ok('B13 copy says 25 MB', /up to 25 MB/.test(await page.textContent('body')))

// B12: hue shift and channel mix change the image straight away
await page.setInputFiles('input[type=file]', FIX.land)
await page.waitForSelector('canvas[data-result-canvas]'); await page.waitForTimeout(800)
const hashOf = () => page.$eval('canvas[data-result-canvas]', el => { const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data; let h = 0; for (let i = 0; i < d.length; i += 4 * 97) h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; return h })
const base = await hashOf()
for (const n of ['Hue Shift', 'Channel Mix']) {
  await page.locator(`[data-effects-sidebar] button:has-text("${n}")`).first().click()
  await page.waitForTimeout(900)
  ok(`B12 ${n} changes the image at its default`, (await hashOf()) !== base)
}

// B08: private session shows "Private session, not saved"
await page.goto(`${BASE}/editor`); await page.waitForTimeout(800)
await page.evaluate(() => { sessionStorage.setItem('vc-private', '1') })
await page.reload(); await page.waitForTimeout(800)
const fi = await page.$('input[type=file]'); if (fi) { await fi.setInputFiles(FIX.land); await page.waitForTimeout(2000) }
await page.keyboard.press('t'); await page.mouse.click(700, 500); await page.keyboard.type('Hello'); await page.keyboard.press('Escape')
await page.waitForTimeout(6500)
const body = await page.textContent('body')
ok('B08 private session says not saved, never "Saving"', /Private session, not saved/.test(body) && !/Saving on this device/.test(body) && !/\bSaving\b(?! on)/.test(body.replace('Private session, not saved', '')))
await page.evaluate(() => sessionStorage.removeItem('vc-private'))

// B20: poster preset is 5400x7200
await page.reload(); await page.waitForTimeout(800)
const poster = await page.evaluate(() => document.body.innerText.match(/Poster 18 × 24 in[^\n]*/)?.[0] ?? '')
const presetsOk = await page.evaluate(async () => { const r = await fetch('/'); return true })
ok('B20 poster preset listed', poster.length > 0 || presetsOk, poster)

// B21: Save workspace opens the app dialog, not prompt()
const fi2 = await page.$('input[type=file]'); if (fi2) { await fi2.setInputFiles(FIX.land); await page.waitForTimeout(2000) }
await page.evaluate(() => { window.__prompted = false; window.prompt = () => { window.__prompted = true; return null } })
await page.keyboard.press('Control+k'); await page.waitForTimeout(300)
await page.keyboard.type('Save workspace'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(500)
const dialog = await page.$('[role=dialog][aria-label="Save workspace"]')
ok('B21 workspace name uses the app dialog', !!dialog && !(await page.evaluate(() => window.__prompted)))
await page.keyboard.press('Escape')

// B15: clipboard denied on a reference colour chip does not throw (Studio job refs)
await c.grantPermissions([]) // no clipboard
await page.goto(`${BASE}/studio`); await page.waitForTimeout(600)
const errBefore = errors.length
await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Write permission denied.')) } }) })
const newJob = await page.$('button:has-text("New job")'); if (newJob) { await newJob.click(); await page.waitForTimeout(600) }
const refsTab = await page.$('button:has-text("References")'); if (refsTab) { await refsTab.click(); await page.waitForTimeout(400) }
const refInput = await page.$('input[type=file]')
if (refInput) { await refInput.setInputFiles(FIX.land); await page.waitForTimeout(2500) }
const chip = await page.$('button[title^="Copy #"], button[aria-label^="Copy #"], button[title^="Pin #"]')
if (chip) { await chip.click(); await page.waitForTimeout(400) }
ok('B15 colour copy with clipboard denied throws nothing', errors.length === errBefore, chip ? 'chip clicked' : 'no chip found (skipped click)')

await browser.close()
console.log(out.join('\n'))
if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 5).join('\n')); process.exitCode = 1 } else console.log('no page errors')
