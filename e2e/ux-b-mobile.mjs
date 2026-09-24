// UX phase B: the phone Editor shell. Open, understand, act, finish.
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
// Opens a mode unless it is already open (tapping an open mode closes it).
const openMode = async m => { const btn = await p.$(`nav[aria-label="Modes"] button:has-text("${m}")`); if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.tap(); await p.waitForTimeout(300) }
const inView = sel => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 })

await p.goto(`${BASE}/editor`); await p.waitForTimeout(800)
ok('B start: photo button is the first action', await inView('button:has-text("Open a photo")'))
ok('B start: no horizontal page overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2500)
ok('B doc: mode bar with five modes', (await p.$$('nav[aria-label="Modes"] button')).length === 5)
ok('B doc: no desktop options bar', !(await p.$('text=Auto-select')))
ok('B doc: no sheet open on plain open', !(await p.$('[data-mobile-sheet]')))
ok('B doc: Share reachable', await inView('header button:has-text("Share")'))
ok('B doc: no page scroll', await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1))

// Text: add heading, type, Done
await openMode('Text')
await p.tap('button:has-text("Add heading")'); await p.waitForTimeout(500)
ok('B text: canvas editor open and focused', await p.evaluate(() => document.activeElement?.hasAttribute('data-canvas-text-editor')))
ok('B text: sheet closed while typing', !(await p.$('[data-mobile-sheet]')))
await p.keyboard.type('Big Sale'); await p.tap('[data-text-edit-bar] button:has-text("Done")'); await p.waitForTimeout(400)
ok('B text: committed', !(await p.$('[data-canvas-text-editor]')))

// Select sheet on tapping a layer: tap the text
await openMode('Select')
ok('B select: sheet shows layer actions', !!(await p.$('[data-mobile-sheet] button:has-text("Edit text")')))
const dup = await p.$('[data-mobile-sheet] button:has-text("Duplicate")'); await dup.tap(); await p.waitForTimeout(300)
ok('B select: duplicate adds a layer', /3/.test(await p.$eval('button[aria-label^="Layers"]', el => el.getAttribute('aria-label'))))
ok('B select: no desktop floating bar', !(await p.$('[data-floating]')))

// Shape
await openMode('Shape')
await p.tap('[data-mobile-sheet] button:has-text("Circle")'); await p.waitForTimeout(400)
ok('B shape: circle added', /4/.test(await p.$eval('button[aria-label^="Layers"]', el => el.getAttribute('aria-label'))))

// More tools: pick brush, Done pill appears
await openMode('Select')
const more = await p.$('[data-mobile-sheet] button:has-text("More tools")'); if (more) { await more.tap(); await p.waitForTimeout(200) }
const brush = await p.$('[data-mobile-sheet] button:has-text("Brush")'); await brush.tap(); await p.waitForTimeout(300)
ok('B tools: brush picked with a Done pill', !!(await p.$('button:has-text("Done")')) && !(await p.$('[data-mobile-sheet]')))
await p.tap('button:has-text("Done")'); await p.waitForTimeout(200)

// Layers sheet
await p.tap('button[aria-label^="Layers"]'); await p.waitForTimeout(300)
ok('B layers: sheet opens', !!(await p.$('[data-mobile-sheet]')))
await p.tap('[data-mobile-sheet] button:has-text("Done")'); await p.waitForTimeout(200)

// Share: PNG download at 1x
await p.tap('header button:has-text("Share")'); await p.waitForTimeout(300)
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.tap('[data-mobile-sheet] button:has-text("PNG")')])
ok('B share: PNG produced', /\.png$/.test(dl.suggestedFilename()), dl.suggestedFilename())
await p.screenshot({ path: OUT('ux_b_phone.png') })

// Desktop unchanged: options bar still there at 1440
const d = await b.newContext({ viewport: { width: 1440, height: 900 } }); const dp = await d.newPage()
await dp.goto(`${BASE}/editor`); await dp.waitForTimeout(600); await (await dp.$('input[type=file]')).setInputFiles(FIX.land); await dp.waitForTimeout(2000)
ok('B desktop: desktop shell still in place', !!(await dp.$('text=Auto-select')) && !(await dp.$('nav[aria-label="Modes"]')))
await d.close()

await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
