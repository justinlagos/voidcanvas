// UX phase D: the desktop Editor's Simple workspace and progressive disclosure.
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
await p.goto(`${BASE}/editor`); await p.waitForTimeout(800)
await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2500)
const ws = await p.evaluate(() => JSON.parse(localStorage.getItem('vc-ui-v1') || '{}'))
ok('D workspace: Simple is the default', ws.workspace?.name === 'Simple', ws.workspace?.name)
ok('D workspace: no icon strip', !(await p.$('button[aria-label="Navigator"]')))
ok('D workspace: rulers off by default', ws.showRulers === false)
ok('D options: Move settings folded', !!(await p.$('button:has-text("Move settings")')) && !(await p.$('text=Auto-select')))
await p.click('button:has-text("Move settings")'); await p.waitForTimeout(200)
ok('D options: Move settings open on request', !!(await p.$('text=Auto-select')))
await p.keyboard.press('Escape'); await p.mouse.move(700, 700); await p.waitForTimeout(200)
ok('D properties: Layer section folded on a plain layer', (await p.$eval('[data-section="Layer"] button', el => el.getAttribute('aria-expanded'))) === 'false')
ok('D properties: Position folded', (await p.$eval('[data-section="Position"] button', el => el.getAttribute('aria-expanded'))) === 'false')
ok('D layers: header folded', (await p.$eval('button:has-text("Blend, opacity and locks")', el => el.getAttribute('aria-expanded'))) === 'false')
const fb = await p.$$('[data-floating] > button, [data-floating] > div > button[aria-label="More"]')
ok('D floating bar: three actions plus More for a photo', fb.length === 3, String(fb.length))
ok('D status bar: no memory readout on a small design', !(await p.$('text=MB in use')))
// text layer: level 0 type controls, More type options folded
await p.keyboard.press('t'); await p.mouse.click(600, 450); await p.waitForTimeout(300); await p.keyboard.type('Big Sale'); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
ok('D properties: text shows font and colour first', !!(await p.$('[data-section="Type"] select')) && !!(await p.$('button:has-text("More type options")')))
ok('D properties: spacing hidden until asked', !(await p.$('text=Letter spacing')))
await p.click('button:has-text("More type options")'); await p.waitForTimeout(200)
ok('D properties: spacing appears on request', !!(await p.$('text=Letter spacing')))
// Essentials still available and sticks
await p.keyboard.press('Control+k'); await p.waitForTimeout(200); await p.keyboard.type('Essentials'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
ok('D workspace: Essentials one command away, strip back', !!(await p.$('button[aria-label="Navigator"]')))
await p.reload(); await p.waitForTimeout(1200)
const ws2 = await p.evaluate(() => JSON.parse(localStorage.getItem('vc-ui-v1') || '{}'))
ok('D workspace: choice sticks after reload', ws2.workspace?.name === 'Essentials', ws2.workspace?.name)
await p.screenshot({ path: OUT('ux_d_desktop.png') })
await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
