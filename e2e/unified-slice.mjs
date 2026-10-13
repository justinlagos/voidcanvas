// Sprint B.1 integration evidence — drives the REAL editor behind ?unified=1.
// Uses window.__voidEditor / __vcCheck / __vcParity / __vcSave: the same hooks
// the existing production e2e suite uses (all available in production builds).
// Covers: mixed doc, per-kind inspector context, UI-driven edit with full
// state verification, documented Ctrl+Z / Ctrl+Shift+Z undo/redo, preview-vs-
// export parity, flush+reload save/reopen, flag-off inertness. Writes a
// machine-readable report; any unexecuted section fails the run.
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
const VE = (page, fn, arg) => page.evaluate(fn, arg)

const stateOf = (page, id) => VE(page, (lid) => {
  const st = window.__voidEditor.getState()
  const layers = {}
  for (const l of st.layers) layers[l.id] = { type: l.type, opacity: l.opacity, x: l.x, y: l.y }
  return {
    docId: st.doc?.id ?? null, activeId: st.activeId, selectedIds: [...st.selectedIds],
    layer: layers[lid] ? { id: lid, ...layers[lid] } : null,
    others: Object.fromEntries(Object.entries(layers).filter(([k]) => k !== lid)),
    historyIndex: st.historyIndex, historyLength: st.history.length,
    historyLabels: st.history.map(h => h.label),
    zoom: st.view.zoom,
  }
}, id)

// The editor settles async after doc creation (auto-fit etc). Poll until the
// view + layers stop moving, then baseline: assertions must never race setup.
const settle = (page) => VE(page, async () => {
  const st = () => window.__voidEditor.getState()
  const sig = () => JSON.stringify({ z: st().view.zoom, l: st().layers.map(l => [l.id, l.x, l.y, l.opacity]) })
  let last = sig(), stable = 0
  for (let i = 0; i < 20 && stable < 3; i++) {
    await new Promise(r => setTimeout(r, 300))
    const now = sig()
    stable = now === last ? stable + 1 : 0
    last = now
  }
  return last
})

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
  await page.waitForFunction(() => window.__voidEditor, null, { timeout: 60000 })
  await page.waitForTimeout(1500)

  const setup = await VE(page, () => {
    const ve = window.__voidEditor.getState()
    ve.newDoc({ name: 'Unified B.1 evidence', width: 1080, height: 1350, background: '#ffffff' })
    const shapeId = ve.addShape('rect', 80, 90, 320, 200, { fill: '#111111' })
    ve.addText(80, 1080, 400)
    const textId = window.__voidEditor.getState().layers.find(l => l.type === 'text')?.id
    if (!textId) throw new Error('setup: text layer missing after addText')
    ve.updateLayer(textId, { text: 'Launch night' }, 'Set headline')
    void 0 // headline text set above; the open inline editor is closed below
    const c = document.createElement('canvas'); c.width = 120; c.height = 90
    const g = c.getContext('2d'); g.fillStyle = '#b02020'; g.fillRect(0, 0, 120, 90)
    ve.addImage(c, 120, 90, 'Red swatch')
    const st = window.__voidEditor.getState()
    return { docId: st.doc.id, layers: st.layers.map(l => ({ id: l.id, type: l.type })), zoom: st.view.zoom }
  })
  if (setup.layers.length === 3) pass('mixed doc built (shape+text+raster)', setup.layers.map(l => l.type).join(','))
  else fail('mixed doc built (shape+text+raster)', 'got ' + setup.layers.length + ' layers')
  const byType = {}
  for (const l of setup.layers) byType[l.type] = l.id
  // addText leaves the canvas text editor open (it autofocuses); close it
  // with Escape exactly as a designer would, so its 'Edit text' commit lands
  // in setup rather than in the probe window.
  // The editor becomes closable ~60ms after mount (ready gate); wait past
  // it, then Escape. Fail hard if the session does not end — an editor that
  // cannot be closed would be a product defect, not test noise.
  await page.waitForTimeout(1000)
  if (await page.getByLabel('Edit text').count() > 0) {
    await page.getByLabel('Edit text').press('Escape')
    await page.waitForTimeout(400)
  }
  const editingClosed = await VE(page, () => window.__voidEditor.getState().editingTextId === null)
  if (editingClosed) pass('setup closes text editor (Escape commits in setup)')
  else fail('setup closes text editor (Escape commits in setup)', 'editingTextId still set')
  await settle(page)
  const settledZoom = await VE(page, () => window.__voidEditor.getState().view.zoom)

  for (const [type, id] of Object.entries(byType)) {
    await VE(page, (lid) => window.__voidEditor.getState().setActive(lid), id)
    await page.waitForTimeout(400)
    const kind = await page.getByTestId('unified-context').getAttribute('data-kind').catch(() => null)
    const line = await page.getByTestId('unified-context-line').textContent().catch(() => '')
    if (kind) pass(`inspector context for ${type}`, `${kind} | ${String(line).trim()}`)
    else fail(`inspector context for ${type}`, 'unified-context not rendered')
    await snap(page, `unified-${type}.png`)
  }
  const zoomNow = await VE(page, () => window.__voidEditor.getState().view.zoom)
  if (zoomNow === settledZoom) pass('zoom stable across selection switches', `zoom=${zoomNow}`)
  else fail('zoom stable across selection switches', `settled ${settledZoom}, now ${zoomNow}`)

  // UI-driven edit with full state verification.
  const sid = byType.shape
  await VE(page, (lid) => window.__voidEditor.getState().setActive(lid), sid)
  await page.waitForTimeout(300)
  const before = await stateOf(page, sid)
  if (before.layer && Math.abs(before.layer.opacity - 1) < 1e-9) pass('undo-probe initial value', 'opacity=1')
  else fail('undo-probe initial value', JSON.stringify(before.layer))
  await page.getByLabel('Opacity (unified) value').fill('40')
  await page.getByLabel('Opacity (unified) value').press('Tab')
  await page.waitForTimeout(400)
  const changed = await stateOf(page, sid)
  if (changed.layer && Math.abs(changed.layer.opacity - 0.4) < 0.01) pass('UI edit changes document state', `opacity=${changed.layer.opacity}`)
  else fail('UI edit changes document state', JSON.stringify(changed.layer))
  const newLabels = changed.historyLabels.slice(before.historyLength)
  if (changed.historyLength === before.historyLength + 1 && newLabels.length === 1 && newLabels[0] === 'Unified opacity') pass('UI edit commits exactly one history step', `'Unified opacity' ${before.historyLength}->${changed.historyLength}`)
  else fail('UI edit commits exactly one history step', `labels added: ${JSON.stringify(newLabels)} (${before.historyLength}->${changed.historyLength})`)
  if (changed.activeId === before.activeId && JSON.stringify(changed.selectedIds) === JSON.stringify(before.selectedIds)) pass('UI edit preserves selection', changed.activeId)
  else fail('UI edit preserves selection', JSON.stringify({ a: changed.activeId, s: changed.selectedIds }))
  if (JSON.stringify(changed.others) === JSON.stringify(before.others)) pass('UI edit touches no other layers')
  else fail('UI edit touches no other layers', `before=${JSON.stringify(before.others)} after=${JSON.stringify(changed.others)}`)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
  const undone = await stateOf(page, sid)
  if (undone.layer && Math.abs(undone.layer.opacity - 1) < 1e-9) pass('Ctrl+Z restores original value', `opacity=${undone.layer.opacity}`)
  else fail('Ctrl+Z restores original value', JSON.stringify(undone.layer))
  if (undone.historyIndex === changed.historyIndex - 1) pass('undo steps history back', `idx=${undone.historyIndex}`)
  else fail('undo steps history back', `idx=${undone.historyIndex} labels=${JSON.stringify(undone.historyLabels)}`)
  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(300)
  const redone = await stateOf(page, sid)
  if (redone.layer && Math.abs(redone.layer.opacity - 0.4) < 0.01) pass('Ctrl+Shift+Z restores edited value', `opacity=${redone.layer.opacity}`)
  else fail('Ctrl+Shift+Z restores edited value', JSON.stringify(redone.layer))
  if (redone.historyIndex === changed.historyIndex) pass('redo steps history forward', `idx=${redone.historyIndex}`)
  else fail('redo steps history forward', `idx=${redone.historyIndex} labels=${JSON.stringify(redone.historyLabels)}`)

  // Invariants (array semantics, as the existing suite asserts).
  const inv = await VE(page, () => (typeof window.__vcCheck === 'function' ? window.__vcCheck() : 'MISSING'))
  if (Array.isArray(inv) && inv.length === 0) pass('production invariants hold with flag on')
  else fail('production invariants hold with flag on', JSON.stringify(inv).slice(0, 200))

  // Preview-vs-export parity on the real canvas.
  const par = await VE(page, () => window.__vcParity({ scale: 1 }))
  const parOk = par && typeof par.mean === 'number' ? par.mean < 2 && par.worst < 12 : false
  if (parOk) pass('preview matches export', JSON.stringify(par).slice(0, 120))
  else fail('preview matches export', JSON.stringify(par).slice(0, 200))
  await snap(page, 'unified-canvas.png')

  // Real save/reopen: flush autosave, reload, confirm identity + state.
  await VE(page, () => window.__vcSave.flush())
  await page.waitForTimeout(400)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction((id) => window.__voidEditor?.getState().doc?.id === id, setup.docId, { timeout: 30000 })
  await page.waitForTimeout(600)
  const reopened = await stateOf(page, sid)
  if (reopened.layer && Math.abs(reopened.layer.opacity - 0.4) < 0.01 && reopened.docId === setup.docId) pass('save/reopen preserves doc + edits', `opacity=${reopened.layer.opacity}`)
  else fail('save/reopen preserves doc + edits', JSON.stringify({ doc: reopened.docId, layer: reopened.layer }))
  await VE(page, (lid) => window.__voidEditor.getState().setActive(lid), sid)
  await page.waitForTimeout(300)
  if (await page.getByTestId('unified-context').count() > 0) pass('inspector context survives reopen')
  else fail('inspector context survives reopen')
  await snap(page, 'unified-reopened.png')

  if (consoleErrors.length === 0) pass('no console/page errors with flag on')
  else fail('no console/page errors with flag on', consoleErrors.slice(0, 3).join(' | '))
  if (failedRequests.length === 0) pass('no failed requests with flag on')
  else fail('no failed requests with flag on', failedRequests.slice(0, 3).join(' | '))
  await page.close()

  // ── Flag OFF (?unified=0 revokes; default disabled) ──
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  p2.on('pageerror', e => consoleErrors.push('off/pageerror: ' + String(e).slice(0, 200)))
  await p2.goto(BASE + '/editor?unified=0', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__voidEditor, null, { timeout: 60000 })
  await p2.waitForTimeout(1200)
  await p2.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__voidEditor, null, { timeout: 60000 })
  await p2.waitForTimeout(1200)
  await VE(p2, () => { window.__voidEditor.getState().newDoc({ name: 'Flag off check', width: 800, height: 600, background: '#fff' }); window.__voidEditor.getState().addText(10, 10, 200) })
  await p2.waitForTimeout(400)
  const absent = await p2.getByTestId('unified-context').count()
  if (absent === 0) pass('flag off renders no unified UI')
  else fail('flag off renders no unified UI', `count=${absent}`)
  const offOk = await VE(p2, () => {
    const st = window.__voidEditor.getState(); const t = st.layers.find(l => l.type === 'text')
    st.setActive(t.id); st.updateLayer(t.id, { opacity: 0.7 }, 'Flag-off opacity'); st.undo()
    return window.__voidEditor.getState().layers.find(l => l.id === t.id)?.opacity === 1
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
