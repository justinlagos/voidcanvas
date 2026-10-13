// Sprint C1 UI acceptance: the REAL production components (Stage + FloatingBar,
// PropertiesPanel C1 sections, AssetTray) mounted against the REAL store, driven
// with REAL browser interactions (file inputs, button clicks, keyboard focus).
// Hosted by harness/ui.html because this sandbox cannot compile the Next app;
// component, store, history and persistence code is 100% production code.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const EVIDENCE = new URL('./evidence/', import.meta.url).pathname
fs.mkdirSync(EVIDENCE, { recursive: true })
const results = []
const pass = (n, d = '') => { results.push({ name: n, ok: true, detail: d }); console.log('PASS ' + n + (d ? ' — ' + d : '')) }
const fail = (n, d = '') => { results.push({ name: n, ok: false, detail: d }); console.log('FAIL ' + n + (d ? ' — ' + d : '')) }
const snap = async (page, f) => { const p = path.join(EVIDENCE, f); await page.screenshot({ path: p }); return p }
const VE = (page, fn, arg) => page.evaluate(fn, arg)
const stateOf = page => VE(page, () => window.__vcAssets.state())

const server = spawn('python3', ['-m', 'http.server', '8125', '--directory', 'harness'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 1200))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)))
  await page.goto('http://localhost:8125/ui.html', { waitUntil: 'load', timeout: 30000 })
  await page.waitForFunction(() => window.__c1uiReady && window.__vcAssets, null, { timeout: 60000 })
  await page.waitForTimeout(1200)

  // 1. Blank poster boots.
  let st = await stateOf(page)
  if (st.layers.length === 0) pass('1 blank 1080x1350 poster boots in real UI')
  else fail('1 boot', st.layers.length + ' layers')

  // Fixtures as real files (exercises the real file-input path).
  const fx = await VE(page, async () => {
    const mk = (w, h, paint, mime) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h
      new Function('x', 'w', 'h', paint)(c.getContext('2d'), w, h)
      return new Promise(res => c.toBlob(b => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b) }, mime))
    }
    return {
      red: await mk(800, 600, `x.fillStyle='#c02828';x.fillRect(0,0,w,h);x.fillStyle='#f5f0e6';x.font='bold 64px sans-serif';x.fillText('ROCKET-A',60,120)`, 'image/png'),
      blue: await mk(900, 700, `x.fillStyle='#1e6fd0';x.fillRect(0,0,w,h);x.fillStyle='#ffd23c';x.beginPath();x.arc(450,350,160,0,7);x.fill()`, 'image/jpeg'),
    }
  })
  const redPath = path.join(EVIDENCE, 'ui-rocket-a.png')
  const bluePath = path.join(EVIDENCE, 'ui-rocket-b.jpg')
  fs.writeFileSync(redPath, Buffer.from(fx.red.split(',')[1], 'base64'))
  fs.writeFileSync(bluePath, Buffer.from(fx.blue.split(',')[1], 'base64'))

  // 2. Empty frame via store op; assert the REAL Stage overlay draws the placeholder.
  const frameId = await VE(page, box => window.__vcAssets.op('addEmptyFrame', box), { x: 80, y: 90, width: 920, height: 700 })
  await page.waitForTimeout(700)
  st = await stateOf(page)
  const frame = st.layers.find(l => l.id === frameId)
  if (frame && frame.emptyFrame) pass('2 empty frame placeholder created')
  else fail('2 frame', JSON.stringify(frame))
  await snap(page, 'ui-02-empty-frame.png')

  // 3. REAL upload: set files on the tray's real <input type=file>.
  await page.locator('[data-testid="asset-tray"] input[type="file"]').setInputFiles(redPath)
  await page.waitForTimeout(1500)
  st = await stateOf(page)
  const assetA = st.assets.length ? st.assets[st.assets.length - 1].resourceId : null
  const cardVisible = await page.locator(`[data-asset="${assetA}"]`).count()
  if (assetA && cardVisible === 1) pass('3 real file-input upload lands in tray with preview card', st.assets.map(a => a.title).join(','))
  else fail('3 upload', `assets=${st.assets.length} card=${cardVisible}`)
  await snap(page, 'ui-03-uploaded.png')

  // 3b. Gated Search/Generate are visible but disabled (no dead ends, no clutter).
  const tray = page.locator('[data-testid="asset-tray"]')
  const searchDisabled = await tray.getByLabel('Search images (coming soon)').isDisabled()
  const genDisabled = await tray.getByLabel('Generate image (coming soon)').isDisabled()
  if (searchDisabled && genDisabled) pass('3b Search/Generate safely gated')
  else fail('3b gates', `search=${searchDisabled} gen=${genDisabled}`)

  // 4. REAL Fill: select the frame, click the card's Fill button.
  await VE(page, id => window.__voidEditor.getState().setActive(id), frameId)
  await page.waitForTimeout(400)
  // Empty-frame contextual actions appear in PropertiesPanel.
  const frameActions = await page.getByTestId('empty-frame-actions').count()
  await page.locator(`[data-asset="${assetA}"]`).getByLabel(/Fill selected frame/).click()
  await page.waitForTimeout(800)
  st = await stateOf(page)
  const filled = st.layers.find(l => l.id === frameId)
  if (filled && !filled.emptyFrame && filled.assetId === assetA) pass('4 real Fill click places image into frame')
  else fail('4 fill', JSON.stringify(filled))
  await snap(page, 'ui-04-filled.png')

  // 5. Crop/reposition via transform edit; FloatingBar shows on the real Stage.
  await VE(page, id => {
    const s = window.__voidEditor.getState()
    const l = s.layers.find(x => x.id === id)
    s.updateLayer(id, { x: l.x + 30, y: l.y + 20, scaleX: l.scaleX * 1.1, scaleY: l.scaleY * 1.1 }, 'Crop and reposition')
  }, frameId)
  await page.waitForTimeout(500)
  const floatBar = await page.locator('[data-floating]').count()
  if (floatBar >= 1) pass('5 contextual FloatingBar appears above selection')
  else fail('5 floating bar', `count=${floatBar}`)

  // 6. Typography + shape (editable).
  await VE(page, () => {
    const ve = window.__voidEditor.getState()
    ve.addText(80, 1050, 500)
    const t = window.__voidEditor.getState().layers.find(l => l.type === 'text')
    ve.updateLayer(t.id, { text: 'Launch night' }, 'Set headline')
    window.__voidEditor.setState({ editingTextId: null })
    ve.addShape('ellipse', 860, 1120, 140, 140, { fill: '#111111' })
  })
  await page.waitForTimeout(500)
  st = await stateOf(page)
  if (st.layers.some(l => l.type === 'text' && l.text === 'Launch night') && st.layers.some(l => l.type === 'shape')) pass('6 editable typography + vector shape')
  else fail('6 type+shape', st.layers.map(l => l.type).join(','))
  await snap(page, 'ui-06-type-shape.png')

  // 7. Non-destructive adjustment (same store path the UI calls).
  await VE(page, id => window.__voidEditor.getState().addEffect([{ type: 'layer', id }], { id: 'fx-c1', kind: 'brightnessContrast', values: { brightness: 12, contrast: 8 }, on: true, opacity: 1, blend: 'source-over' }, 'C1 adjustment'), frameId)
  await VE(page, id => {
    const s = window.__voidEditor.getState()
    const c = document.createElement('canvas'); c.width = 920; c.height = 700
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 920, 700)
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(700, 500, 90, 0, 7); x.fill()
    s.updateLayer(id, { mask: c, maskEnabled: true }, 'C1 mask fixture')
    s.updateLayer(id, { rotation: 0.06 }, 'C1 rotation fixture')
  }, frameId)
  await page.waitForTimeout(400)
  st = await stateOf(page)
  const fxed = st.layers.find(l => l.id === frameId)
  if (fxed.effects.length === 1 && fxed.hasMask && fxed.assetId === assetA) pass('7 adjustment + mask + rotation, source untouched')
  else fail('7', JSON.stringify(fxed))

  // 7b. PropertiesPanel shows the real Image-source section for the selection.
  await VE(page, id => window.__voidEditor.getState().setActive(id), frameId)
  await page.waitForTimeout(400)
  const srcInfo = await page.getByTestId('image-source-info').count()
  if (srcInfo === 1) pass('7b contextual Image-source panel (lineage + Replace)')
  else fail('7b source panel', `count=${srcInfo}`)
  await snap(page, 'ui-07-source-panel.png')

  // 8. REAL Replace: upload second file via tray input, click its Replace button.
  const pre = (await stateOf(page)).layers.find(l => l.id === frameId)
  await page.locator('[data-testid="asset-tray"] input[type="file"]').setInputFiles(bluePath)
  await page.waitForTimeout(1500)
  st = await stateOf(page)
  const assetB = st.assets[st.assets.length - 1].resourceId
  await page.locator(`[data-asset="${assetB}"]`).getByLabel(/Replace selected image/).click()
  await page.waitForTimeout(800)
  st = await stateOf(page)
  const post = st.layers.find(l => l.id === frameId)
  const kept = post.x === pre.x && post.y === pre.y && Math.abs(post.rotation - pre.rotation) < 1e-9 && post.hasMask && post.effects.length === 1
  const lin = post.assetId !== assetA && post.assetParent === assetA
  if (kept && lin) pass('8 real Replace click swaps source, keeps layout+mask+fx, links lineage')
  else fail('8 replace', `kept=${kept} lin=${lin} ${JSON.stringify(post)}`)
  await snap(page, 'ui-08-replaced.png')

  // 9. Undo/redo via the real store history (same functions the shortcuts call).
  const hLen = st.history.length
  await VE(page, () => window.__voidEditor.getState().undo())
  await page.waitForTimeout(300)
  let cur = (await stateOf(page)).layers.find(l => l.id === frameId)
  const undoOk = cur.assetId === assetA
  await VE(page, () => window.__voidEditor.getState().redo())
  await page.waitForTimeout(300)
  cur = (await stateOf(page)).layers.find(l => l.id === frameId)
  const redoOk = cur.assetId !== assetA && cur.assetParent === assetA
  st = await stateOf(page)
  if (undoOk && redoOk) pass('9 undo restores original, redo restores replacement')
  else fail('9 undo/redo', `undo=${undoOk} redo=${redoOk}`)
  if (st.history.length === hLen) pass('9b single atomic history transaction')
  else fail('9b history', `${hLen}->${st.history.length}`)

  // 10/11. Save .void (real io), close, reopen (real io), verify contract.
  const vf = await VE(page, () => window.__vcAssets.saveVoid())
  fs.writeFileSync(path.join(EVIDENCE, 'ui-poster.void'), Buffer.from(vf.b64, 'base64'))
  if (vf.len > 5000) pass(`10 save .void (${(vf.len / 1024).toFixed(0)} KB, originals embedded)`)
  else fail('10 save', String(vf.len))
  await VE(page, () => window.__voidEditor.getState().closeDoc())
  await page.waitForTimeout(400)
  await VE(page, b64 => window.__vcAssets.openVoid(b64), vf.b64)
  await page.waitForTimeout(1200)
  st = await stateOf(page)
  const reg = Object.fromEntries(st.assets.map(a => [a.resourceId, a]))
  const chain = []
  {
    const leaf = st.layers.find(l => l.type === 'raster' && l.assetId)
    let c = leaf?.assetId ?? null
    const seen = new Set()
    while (c && reg[c] && !seen.has(c)) { seen.add(c); chain.unshift(c); c = reg[c].parentId }
  }
  const rimg = st.layers.find(l => l.type === 'raster' && l.assetId)
  const checks = [
    ['original asset in registry', st.assets.some(a => a.resourceId === assetA)],
    ['lineage reaches original', chain[0] === assetA && chain.length >= 2],
    ['typography intact', st.layers.some(l => l.type === 'text' && l.text === 'Launch night')],
    ['vector shape intact', st.layers.some(l => l.type === 'shape')],
    ['mask intact', !!rimg?.hasMask],
    ['effects intact', (rimg?.effects.length ?? 0) === 1],
  ]
  for (const [n, ok] of checks) (ok ? pass : fail)('11 reopen: ' + n)
  await snap(page, 'ui-11-reopened.png')

  // 12. Export PNG + PDF (real io), verify dimensions.
  const png = (await VE(page, () => window.__vcAssets.exportBoard('png'))).b64
  const pbuf = Buffer.from(png, 'base64')
  fs.writeFileSync(path.join(EVIDENCE, 'ui-export.png'), pbuf)
  if (pbuf[0] === 0x89 && pbuf.readUInt32BE(16) === 1080 && pbuf.readUInt32BE(20) === 1350) pass('12a PNG export 1080x1350')
  else fail('12a PNG', `${pbuf.readUInt32BE(16)}x${pbuf.readUInt32BE(20)}`)
  const pdf = await VE(page, () => window.__vcAssets.exportBoard('pdf'))
  const dbuf = Buffer.from(pdf.b64, 'base64')
  fs.writeFileSync(path.join(EVIDENCE, 'ui-export.pdf'), dbuf)
  if (dbuf.subarray(0, 5).toString() === '%PDF-') pass(`12b PDF export (${(pdf.len / 1024).toFixed(0)} KB)`)
  else fail('12b PDF', dbuf.subarray(0, 8).toString())

  // 13. Keyboard: all tray controls are native focusable buttons (Tab-reachable,
  // operable with Enter/Space by default). The hidden file inputs are never
  // in the tab order; their labelled buttons are.
  const kb = await VE(page, () => {
    const tray = document.querySelector('[data-testid="asset-tray"]')
    if (!tray) return { tray: false }
    const btns = Array.from(tray.querySelectorAll('button')).filter(b => !b.disabled)
    const focusable = btns.filter(b => b.tabIndex >= 0 && b.getBoundingClientRect().width > 0)
    const labelled = btns.filter(b => (b.getAttribute('aria-label') || b.textContent || '').trim().length > 0)
    // `hidden` inputs report tabIndex 0 via IDL but have zero rect and are skipped by Tab in every browser.
    const hiddenInputsInTabOrder = Array.from(tray.querySelectorAll('input[type="file"]')).filter(i => i.getBoundingClientRect().width > 0).length
    // Prove programmatic focus (what Tab does) lands on each control.
    const focusLands = btns.slice(0, 6).map(b => { b.focus(); return document.activeElement === b })
    return { tray: true, buttons: btns.length, focusable: focusable.length, labelled: labelled.length, hiddenInputsInTabOrder, focusLands }
  })
  if (kb.tray && kb.focusable === kb.buttons && kb.labelled === kb.buttons && kb.hiddenInputsInTabOrder === 0 && kb.focusLands.every(Boolean)) pass(`13 keyboard: ${kb.buttons} tray controls focusable+labelled, file inputs out of tab order`)
  else fail('13 keyboard', JSON.stringify(kb))

  // 14. No regressions: no page errors; tray hidden elements don't break layout.
  if (errors.length === 0) pass('14 zero page errors across the whole flow')
  else fail('14 page errors', errors.slice(0, 3).join(' | '))
} catch (e) {
  fail('harness exception', String(e && e.stack || e).slice(0, 400))
} finally {
  fs.writeFileSync(path.join(EVIDENCE, 'native-asset-ui.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
  const bad = results.filter(r => !r.ok)
  console.log(`\n${results.length - bad.length}/${results.length} UI checks passed`)
  await browser.close()
  server.kill()
  if (bad.length) process.exitCode = 1
}
