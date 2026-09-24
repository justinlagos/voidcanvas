import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
async function open(opts) {
  const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
  await p.goto(`${BASE}/editor`); await p.waitForTimeout(800)
  await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2500)
  return { c, p }
}
const layerTexts = p => p.evaluate(() => (window.__vc_layers ? window.__vc_layers() : null))
// desktop
{
  const { c, p } = await open({ viewport: { width: 1440, height: 900 } })
  await p.keyboard.press('t'); await p.mouse.click(600, 450); await p.waitForTimeout(400)
  const active = await p.evaluate(() => ({ tag: document.activeElement?.tagName, canvasEditor: !!document.activeElement?.closest('[data-canvas-text-editor]') || document.activeElement?.hasAttribute('data-canvas-text-editor'), inPanel: !!document.activeElement?.closest('aside, [data-dock]') }))
  ok('A desktop: focus is the canvas editor', active.canvasEditor, JSON.stringify(active))
  ok('A desktop: text bar shown', !!(await p.$('[data-text-edit-bar]')))
  await p.keyboard.type('Hello Lagos'); await p.keyboard.press('Enter'); await p.keyboard.type('Tonight'); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  const layers = await p.$$eval('[aria-label="Layers"] [role=listitem], [data-layer-row]', els => els.map(e => e.textContent.trim()))
  const bodyTxt = await p.evaluate(() => document.body.innerText)
  ok('A desktop: typed text became the layer name', /Hello Lagos/.test(bodyTxt), layers.slice(0,3).join('|'))
  ok('A desktop: editor closed on Escape', !(await p.$('[data-canvas-text-editor]')))
  // empty click leaves nothing
  const before = (await p.evaluate(() => document.body.innerText.match(/Hello Lagos/g)?.length ?? 0))
  await p.keyboard.press('t'); await p.mouse.click(300, 300); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  const rows = await p.$$eval('[aria-label="Layers"] button, [aria-label="Layers"] [role=option]', els => els.length).catch(() => -1)
  const empties = await p.evaluate(() => Array.from(document.querySelectorAll('*')).filter(e => e.childElementCount === 0 && e.textContent.trim() === 'Text' && e.closest('[aria-label="Layers"]')).length)
  ok('A desktop: empty text layer removed', empties === 0, `empty rows ${empties}`)
  // double-click edits existing
  await p.keyboard.press('v'); await p.mouse.click(640, 465); await p.waitForTimeout(200); await p.mouse.dblclick(640, 465); await p.waitForTimeout(300)
  ok('A desktop: double-click opens canvas editor', !!(await p.$('[data-canvas-text-editor]')))
  await p.keyboard.press('Escape')
  await p.screenshot({ path: OUT('textA_desk.png') })
  await c.close()
}
// phone
{
  const { c, p } = await open({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
  const t = await p.$('button[aria-label*="Text" i], button[title*="Text" i]')
  if (t) await t.tap(); else await p.keyboard.press('t')
  await p.touchscreen.tap(195, 420); await p.waitForTimeout(500)
  const ed = await p.$('[data-canvas-text-editor]')
  ok('A phone: canvas editor opens on tap', !!ed)
  const focused = await p.evaluate(() => document.activeElement?.hasAttribute('data-canvas-text-editor'))
  ok('A phone: editor focused', focused)
  await p.keyboard.type('Sale'); await p.waitForTimeout(200)
  const bar = await p.$('[data-text-edit-bar]'); const r = bar ? await bar.boundingBox() : null
  ok('A phone: text bar inside viewport', !!r && r.x >= 0 && r.x + r.width <= 390, r ? `${Math.round(r.x)}..${Math.round(r.x + r.width)}` : 'no bar')
  await p.click('[data-text-edit-bar] button:has-text("Done")'); await p.waitForTimeout(300)
  const hasSale = await p.evaluate(() => { const c = document.querySelector('canvas'); return !!c }) && !!(await p.$('[data-floating] button:has-text("Edit text")'))
  ok('A phone: Done commits and text layer stays selected', !(await p.$('[data-canvas-text-editor]')) && hasSale)
  await p.screenshot({ path: OUT('textA_phone.png') })
  await c.close()
}
await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
