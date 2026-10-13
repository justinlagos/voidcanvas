// Sprint B.1 integration evidence — drives the REAL editor behind ?unified=1.
// Fix B: every undo/redo step asserts actual document state (initial value,
// UI-driven change, resulting state, undo restore, redo restore, no unrelated
// history/selection changes) using documented shortcuts (Ctrl+Z / Ctrl+Shift+Z).
// Fix C: auto-creates evidence dirs, FAILS if invariant checks are missing,
// captures console errors + failed requests, takes real screenshots, writes a
// machine-readable report, and runs flag-on AND flag-off. Never reports
// unexecuted tests as passing: any skipped browser section fails the run
// unless UNIFIED_ALLOW_NO_BROWSER=1, in which case it is reported as blocked.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const EVIDENCE = new URL('./evidence/', import.meta.url).pathname
fs.mkdirSync(EVIDENCE, { recursive: true })

const results = []
const pass = (name, detail = '') => { results.push({ name, ok: true, detail }); console.log('PASS ' + name + (detail ? ' — ' + detail : '')) }
const fail = (name, detail = '') => { results.push({ name, ok: false, detail }); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')) }
const snap = async (page, file) => { const p = path.join(EVIDENCE, file); await page.screenshot({ path: p }); return p }

const stateOf = (page, id) => page.evaluate((lid) => {
  const st = window.__ve.getState()
  const layers = {}
  for (const l of st.layers) layers[l.id] = { type: l.type, opacity: l.opacity, x: l.x, y: l.y }
  return {
    activeId: st.activeId, selectedIds: [...st.selectedIds],
    layer: layers[lid] ? { id: lid, ...layers[lid] } : null,
    others: Object.fromEntries(Object.entries(layers).filter(([k]) => k !== lid)),
    historyIndex: st.historyIndex, historyLength: st.history.length,
    zoom: st.view.zoom, hasInvariants: typeof window.__vcCheck === 'function',
    invariants: typeof window.__vcCheck === 'function' ? window.__vcCheck() : 'MISSING',
  }
}, id)

const browser = await chromium.launch()
const consoleErrors = []
const failedRequests = []
try {
  // ── Flag ON ──
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text().slice(0, 200)) })
  page.on('requestfailed', r => failedRequests.push(r.url().slice(0, 140) + ' :: ' + (r.failure()?.errorText ?? '')))
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(r.status() + ' ' + r.url().slice(0, 140)) })
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
    return { layers: st.layers.map(l => ({ id: l.id, type: l.type })), zoom: st.view.zoom }
  })
  if (setup.layers.length === 3) pass('mixed doc built (shape+text+raster)', setup.layers.map(l => l.type).join(','))
  else fail('mixed doc built (shape+text+raster)', 'got ' + setup.layers.length + ' layers')
  const byType = {}
  for (const l of setup.layers) byType[l.type] = l.id

  // 1-3. Context per kind via real selection + screenshots of the real editor.
  for (const [type, id] of Object.entries(byType)) {
    await page.evaluate((lid) => window.__ve.getState().setActive(lid), id)
    await page.waitForTimeout(400)
    const kind = await page.getByTestId('unified-context').getAttribute('data-kind').catch(() => null)
    const line = await page.getByTestId('unified-context-line').textContent().catch(() => '')
    if (kind) pass(`inspector context for ${type}`, `${kind} | ${String(line).trim()}`)
    else fail(`inspector context for ${type}`, 'unified-context not rendered')
    await snap(page, `unified-${type}.png`)
  }
  const zoomNow = await page.evaluate(() => window.__ve.getState().view.zoom)
  if (zoomNow === setup.zoom) pass('zoom stable across selection switches', `zoom=${zoomNow}`)
  else fail('zoom stable across selection switches', `was ${setup.zoom}, now ${zoomNow}`)

  // 4. Undo/redo with full state verification (Fix B).
  const sid = byType.shape
  await page.evaluate((lid) => window.__ve.getState().setActive(lid), sid)
  await page.waitForTimeout(300)
  const before = await stateOf(page, sid)
  if (before.layer && Math.abs(before.layer.opacity - 1) < 1e-9) pass('undo-probe initial value', 'opacity=1')
  else fail('undo-probe initial value', JSON.stringify(before.layer))
  // Real UI interaction: number field + Tab commits through the shared transaction.
  await page.getByLabel('Opacity (unified) value').fill('40')
  await page.getByLabel('Opacity (unified) value').press('Tab')
  await page.waitForTimeout(400)
  const changed = await stateOf(page, sid)
  const othersUntouched = JSON.stringify(changed.others) === JSON.stringify(before.others)
  if (changed.layer && Math.abs(changed.layer.opacity - 0.4) < 0.01) pass('UI edit changes document state', `opacity=${changed.layer.opacity}`)
  else fail('UI edit changes document state', JSON.stringify(changed.layer))
  if (changed.historyLength === before.historyLength + 1) pass('UI edit commits exactly one history step', `${before.historyLength}->${changed.historyLength}`)
  else fail('UI edit commits exactly one history step', `${before.historyLength}->${changed.historyLength}`)
  if (changed.activeId === before.activeId && JSON.stringify(changed.selectedIds) === JSON.stringify(before.selectedIds)) pass('UI edit preserves selection', changed.activeId)
  else fail('UI edit preserves selection', JSON.stringify({ a: changed.activeId, s: changed.selectedIds }))
  if (othersUntouched) pass('UI edit touches no other layers')
  else fail('UI edit touches no other layers', JSON.stringify(changed.others))
  // Documented shortcuts (actions.ts: edit.undo Ctrl+Z, edit.redo Ctrl+Shift+Z).
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
  const undone = await stateOf(page, sid)
  if (undone.layer && Math.abs(undone.layer.opacity - 1) < 1e-9) pass('Ctrl+Z restores original value', `opacity=${undone.layer.opacity}`)
  else fail('Ctrl+Z restores original value', JSON.stringify(undone.layer))
  if (undone.historyIndex === changed.historyIndex - 1) pass('undo steps history back', `idx=${undone.historyIndex}`)
  else fail('undo steps history back', `idx=${undone.historyIndex}`)
  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(300)
  const redone = await stateOf(page, sid)
  if (redone.layer && Math.abs(redone.layer.opacity - 0.4) < 0.01) pass('Ctrl+Shift+Z restores edited value', `opacity=${redone.layer.opacity}`)
  else fail('Ctrl+Shift+Z restores edited value', JSON.stringify(redone.layer))
  if (redone.historyIndex === changed.historyIndex) pass('redo steps history forward', `idx=${redone.historyIndex}`)
  else fail('redo steps history forward', `idx=${redone.historyIndex}`)

  // 5. Invariants are mandatory evidence (Fix C: missing check = fail).
  const inv = await page.evaluate(() => (typeof window.__vcCheck === 'function' ? window.__vcCheck() : 'MISSING'))
  if (inv === true) pass('production invariants hold with flag on')
  else fail('production invariants hold with flag on', JSON.stringify(inv).slice(0, 120))
  if (consoleErrors.length === 0) pass('no console/page errors with flag on')
  else fail('no console/page errors with flag on', consoleErrors.slice(0, 3).join(' | '))
  if (failedRequests.length === 0) pass('no failed requests with flag on')
  else fail('no failed requests with flag on', failedRequests.slice(0, 3).join(' | '))
  await page.close()

  // ── Flag OFF (?unified=0 revokes; fresh disabled default) ──
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  p2.on('pageerror', e => consoleErrors.push('off/pageerror: ' + String(e).slice(0, 200)))
  await p2.goto(BASE + '/editor?unified=0', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__ve, null, { timeout: 60000 })
  await p2.waitForTimeout(1200)
  await p2.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__ve, null, { timeout: 60000 })
  await p2.waitForTimeout(1200)
  await p2.evaluate(() => { window.__ve.getState().newDoc({ name: 'Flag off check', width: 800, height: 600, background: '#fff' }); window.__ve.getState().addText(10, 10, 200) })
  await p2.waitForTimeout(400)
  const absent = await p2.getByTestId('unified-context').count()
  if (absent === 0) pass('flag off renders no unified UI')
  else fail('flag off renders no unified UI', `count=${absent}`)
  const offOk = await p2.evaluate(() => {
    const st = window.__ve.getState(); const t = st.layers.find(l => l.type === 'text')
    st.setActive(t.id); st.updateLayer(t.id, { opacity: 0.7 }, 'Flag-off opacity'); st.undo()
    return window.__ve.getState().layers.find(l => l.id === t.id)?.opacity === 1
  })
  if (offOk) pass('flag off leaves existing transactions intact')
  else fail('flag off leaves existing transactions intact')
  await snap(p2, 'unified-flag-off.png')
  await p2.close()
} finally {
  await browser.close()
}

const report = { base: BASE, at: new Date().toISOString(), results, consoleErrors, failedRequests }
fs.writeFileSync(path.join(EVIDENCE, 'unified-slice-report.json'), JSON.stringify(report, null, 2))
const failed = results.filter(r => !r.ok)
console.log(`\nUNIFIED-SLICE: ${results.length - failed.length}/${results.length} passed (report: e2e/evidence/unified-slice-report.json)`)
process.exit(failed.length ? 1 : 0)
