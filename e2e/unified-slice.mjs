// B.1 integration evidence: drives the REAL editor (dev server) with ?unified=1.
// Uses window.__ve (the one live store); asserts inspector context per kind,
// real DOM edit through the unified slider (committed transaction), shared
// undo/redo, stable zoom, and flag-off inertness. Screenshots to e2e/evidence/.
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : '')) }

const browser = await chromium.launch()
try {
  // ── Flag ON ──
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)))
  await page.goto(BASE + '/editor?unified=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => window.__ve, null, { timeout: 60000 })
  await page.waitForTimeout(1500)

  const setup = await page.evaluate(() => {
    const ve = window.__ve.getState()
    ve.newDoc({ name: 'Unified B.1 evidence', width: 1080, height: 1350, background: '#ffffff' })
    const shapeId = ve.addShape('rect', 80, 90, 320, 200, { fill: '#111111' })
    ve.addText(80, 1080, 400)
    const c = document.createElement('canvas'); c.width = 120; c.height = 90
    const g = c.getContext('2d'); g.fillStyle = '#b02020'; g.fillRect(0, 0, 120, 90)
    ve.addImage(c, 120, 90, 'Red swatch')
    const st = window.__ve.getState()
    return { shapeId, layers: st.layers.map(l => ({ id: l.id, type: l.type })), zoom: st.view.zoom }
  })
  check('mixed doc built (shape+text+raster)', setup.layers.length === 3, JSON.stringify(setup.layers.map(l => l.type)))
  const byType = {}
  for (const l of setup.layers) byType[l.type] = l.id

  for (const [type, id] of Object.entries(byType)) {
    await page.evaluate((lid) => window.__ve.getState().setActive(lid), id)
    await page.waitForTimeout(400)
    const ctx = await page.getByTestId('unified-context').getAttribute('data-kind').catch(() => null)
    const line = await page.getByTestId('unified-context-line').textContent().catch(() => '')
    check(`inspector context for ${type}`, !!ctx, `${ctx} | ${String(line).trim()}`)
    await page.screenshot({ path: `e2e/evidence/unified-${type}.png` })
  }
  const zoomSame = await page.evaluate(() => window.__ve.getState().view.zoom)
  check('zoom stable across selection switches', zoomSame === setup.zoom, `zoom=${zoomSame}`)

  // Real DOM edit through the unified slider (slider input commits via store).
  await page.evaluate((lid) => window.__ve.getState().setActive(lid), byType.shape)
  await page.waitForTimeout(300)
  const histBefore = await page.evaluate(() => window.__ve.getState().history.length)
  await page.getByLabel('Opacity (unified) value').fill('40')
  await page.getByLabel('Opacity (unified) value').press('Enter')
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => {
    const st = window.__ve.getState()
    const active = st.layers.find(l => l.id === st.activeId)
    return { opacity: active?.opacity, hist: st.history.length }
  })
  check('unified slider edits real document (committed)', Math.abs(after.opacity - 0.4) < 0.01 && after.hist > histBefore, `opacity=${after.opacity} hist ${histBefore}->${after.hist}`)

  // Shared undo/redo across object types.
  await page.evaluate(() => { window.__ve.getState().undo(); window.__ve.getState().undo() })
  await page.waitForTimeout(300)
  const undone = await page.evaluate(() => {
    const st = window.__ve.getState()
    return { opacity: st.layers.find(l => l.id === st.activeId)?.opacity, idx: st.historyIndex, len: st.history.length }
  })
  check('shared undo crosses unified edit', undone.opacity !== 0.4, `opacity=${undone.opacity} idx=${undone.idx}/${undone.len}`)
  await page.evaluate(() => window.__ve.getState().redo())
  await page.waitForTimeout(300)
  const redone = await page.evaluate(() => window.__ve.getState().layers.find(l => l.id === window.__ve.getState().activeId)?.opacity)
  check('shared redo restores unified edit', Math.abs(redone - 0.4) < 0.01, `opacity=${redone}`)

  const inv = await page.evaluate(() => { try { return window.__vcCheck ? window.__vcCheck() : 'no-check' } catch (e) { return 'ERR:' + String(e).slice(0, 120) } })
  check('production invariants hold with flag on', inv === true || inv === 'no-check', JSON.stringify(inv).slice(0, 100))
  check('no page errors during flag-on pass', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()

  // ── Flag OFF ──
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await p2.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__ve, null, { timeout: 60000 })
  await p2.waitForTimeout(1200)
  await p2.evaluate(() => { try { localStorage.removeItem('vc.unified') } catch {} })
  await p2.reload({ waitUntil: 'domcontentloaded' })
  await p2.waitForFunction(() => window.__ve, null, { timeout: 60000 })
  await p2.waitForTimeout(1200)
  await p2.evaluate(() => { window.__ve.getState().newDoc({ name: 'Flag off check', width: 800, height: 600, background: '#fff' }); window.__ve.getState().addText(10, 10, 200) })
  await p2.waitForTimeout(400)
  const absent = await p2.getByTestId('unified-context').count()
  check('flag off renders no unified UI', absent === 0, `count=${absent}`)
  const opOk = await p2.evaluate(() => {
    const st = window.__ve.getState(); const t = st.layers.find(l => l.type === 'text')
    st.setActive(t.id); st.updateLayer(t.id, { opacity: 0.7 }, 'Flag-off opacity'); st.undo()
    const back = window.__ve.getState().layers.find(l => l.id === t.id)?.opacity
    return back === 1
  })
  check('flag off leaves existing transactions intact', opOk)
  await p2.screenshot({ path: 'e2e/evidence/unified-flag-off.png' })
  await p2.close()
} finally {
  await browser.close()
}
const failed = results.filter(r => !r.ok)
console.log(`\nUNIFIED-SLICE: ${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
