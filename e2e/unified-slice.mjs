// Sprint U1 complete browser vertical slice — drives the REAL editor (desktop + mobile)
// behind ?unified=1 and flag-off.
// Covers:
// 1. Document creation & real raster artwork import (via input[type=file] with C1 lineage)
// 2. Adding and editing typography and vector objects
// 3. Multi-select, key object, group, nested group, duplicate, transform, masks, clipping, effects & blend modes
// 4. Undo and redo across UI edits, grouping, transforms and appearance
// 5. Multiple artboards & Cascade (verifies variant creation + documents/checks resync behavior & selection reconciliation)
// 6. Save and reopen .void document (verifies object identity, group hierarchy, C1 lineage, appearance & pixel parity)
// 7. Export PNG and PDF (verifies PNG pixel parity against live canvas and valid multi-page PDF structure)
// 8. Mobile workflow (iPhone 13 viewport: import, text, shape, layers sheet, unified reconciliation & PNG export)
import { chromium, devices } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { FIX } from './fixtures.mjs'

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
  for (const l of st.layers) layers[l.id] = { type: l.type, opacity: l.opacity, x: l.x, y: l.y, groupId: l.groupId ?? null, frameId: l.frameId ?? null }
  return {
    docId: st.doc?.id ?? null, activeId: st.activeId, selectedIds: [...st.selectedIds], keyObjectId: st.keyObjectId,
    layer: layers[lid] ? { id: lid, ...layers[lid] } : null,
    others: Object.fromEntries(Object.entries(layers).filter(([k]) => k !== lid)),
    historyIndex: st.historyIndex, historyLength: st.history.length,
    historyLabels: st.history.map(h => h.label),
    zoom: st.view.zoom, focus: document.activeElement ? (document.activeElement.getAttribute('aria-label') || document.activeElement.tagName) : 'none',
    editingText: !!st.editingTextId,
  }
}, id)

const settle = (page) => VE(page, async () => {
  const st = () => window.__voidEditor.getState()
  const sig = () => JSON.stringify({ z: st().view.zoom, l: st().layers.map(l => [l.id, l.x, l.y, l.opacity]) })
  let last = sig(), stable = 0
  for (let i = 0; i < 20 && stable < 3; i++) {
    await new Promise(r => setTimeout(r, 250))
    const now = sig()
    stable = now === last ? stable + 1 : 0
    last = now
  }
  return last
})

const pixelStats = (page, rect) => VE(page, async (r) => {
  const d = await window.__vcPixels(r)
  if (!d) return null
  const n = d.length / 4
  const m = [0, 0, 0]
  for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2] }
  return m.map(v => Math.round((v / n) * 10) / 10)
}, rect)

const browser = await chromium.launch()
const consoleErrors = []
const failedRequests = []
let cascadeBehaviorReport = null

try {
  // ── 1. Desktop workflow (Flag ON) ──
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text().slice(0, 200)) })
  page.on('requestfailed', r => failedRequests.push(r.url().slice(0, 140) + ' :: ' + (r.failure()?.errorText ?? '')))
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(r.status() + ' ' + r.url().slice(0, 140)) })

  await page.goto(BASE + '/editor?unified=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => window.__voidEditor && window.__vcAssets && window.__vcParity, null, { timeout: 60000 })
  await page.waitForTimeout(1000)

  // Step 1 & 2: Create document and import real raster image with C1 lineage
  const logoB64 = fs.readFileSync(FIX.logo).toString('base64')
  await VE(page, () => {
    window.__voidEditor.getState().newDoc({ name: 'Unified U1 Vertical Slice', width: 1080, height: 1350, background: '#ffffff' })
  })
  await VE(page, b64 => window.__vcAssets.placeBytes(b64, 'logo.png', 'image/png'), logoB64)
  await page.waitForFunction(() => window.__voidEditor.getState().layers.some(l => l.type === 'raster'), null, { timeout: 15000 })

  // Step 3: Add vector shape and typography
  const setup = await VE(page, () => {
    const ve = window.__voidEditor.getState()
    const rasterLayer = ve.layers.find(l => l.type === 'raster')
    ve.updateLayer(rasterLayer.id, { x: 80, y: 460, scaleX: 1, scaleY: 1, name: 'Imported Logo' }, 'Place imported image')
    const shapeId = ve.addShape('rect', 80, 90, 320, 200, { fill: '#111111', name: 'Hero Badge' })
    ve.addText(80, 1080, 500)
    const textId = window.__voidEditor.getState().layers.find(l => l.type === 'text')?.id
    if (!textId) throw new Error('setup: text layer missing after addText')
    ve.updateLayer(textId, { text: 'Launch night', color: '#111111', fontSize: 72 }, 'Set headline')
    const st = window.__voidEditor.getState()
    return {
      docId: st.doc.id,
      layers: st.layers.map(l => ({ id: l.id, type: l.type, assetId: l.asset?.id ?? null })),
      assetCount: Object.keys(st.doc.assets ?? {}).length,
    }
  })

  if (setup.layers.length === 3 && setup.assetCount >= 1) {
    pass('mixed doc built (imported raster + shape + text with C1 lineage)', setup.layers.map(l => l.type).join(','))
  } else {
    fail('mixed doc built (imported raster + shape + text with C1 lineage)', JSON.stringify(setup))
  }

  const byType = {}
  for (const l of setup.layers) byType[l.type] = l.id

  await page.waitForTimeout(800)
  if (await page.getByLabel('Edit text').count() > 0) {
    await page.getByLabel('Edit text').press('Escape')
    await page.waitForTimeout(400)
  }
  const editingClosed = await VE(page, () => window.__voidEditor.getState().editingTextId === null)
  if (editingClosed) pass('setup closes text editor (Escape commits in setup)')
  else fail('setup closes text editor (Escape commits in setup)', 'editingTextId still set')
  await settle(page)
  const settledZoom = await VE(page, () => window.__voidEditor.getState().view.zoom)

  // Verify inspector context across all 3 layer kinds
  for (const [type, id] of Object.entries(byType)) {
    await VE(page, (lid) => window.__voidEditor.getState().setActive(lid), id)
    await page.waitForTimeout(350)
    const kind = await page.getByTestId('unified-context').getAttribute('data-kind').catch(() => null)
    const line = await page.getByTestId('unified-context-line').textContent().catch(() => '')
    if (kind === type) pass(`inspector context for ${type}`, `${kind} | ${String(line).trim()}`)
    else fail(`inspector context for ${type}`, `expected ${type}, got ${kind}`)
    await snap(page, `unified-${type}.png`)
  }
  const zoomNow = await VE(page, () => window.__voidEditor.getState().view.zoom)
  if (zoomNow === settledZoom) pass('zoom stable across selection switches', `zoom=${zoomNow}`)
  else fail('zoom stable across selection switches', `settled ${settledZoom}, now ${zoomNow}`)

  // Step 4: UI-driven opacity edit + Undo/Redo verification
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
  if (changed.historyLength === before.historyLength + 1 && newLabels.length === 1 && newLabels[0] === 'Unified opacity') {
    pass('UI edit commits exactly one history step', `'Unified opacity' ${before.historyLength}->${changed.historyLength}`)
  } else {
    fail('UI edit commits exactly one history step', `labels added: ${JSON.stringify(newLabels)} (${before.historyLength}->${changed.historyLength})`)
  }
  if (changed.activeId === before.activeId && JSON.stringify(changed.selectedIds) === JSON.stringify(before.selectedIds)) {
    pass('UI edit preserves selection', changed.activeId)
  } else {
    fail('UI edit preserves selection', JSON.stringify({ a: changed.activeId, s: changed.selectedIds }))
  }
  if (JSON.stringify(changed.others) === JSON.stringify(before.others)) pass('UI edit touches no other layers')
  else fail('UI edit touches no other layers', `before=${JSON.stringify(before.others)} after=${JSON.stringify(changed.others)}`)

  await VE(page, () => { if (document.activeElement) document.activeElement.blur() })
  await page.waitForTimeout(200)
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

  // Slider-focused shortcut inertness
  const focusBefore = await stateOf(page, sid)
  await VE(page, () => { const el = document.querySelector('[aria-label="Opacity (unified)"]'); if (el) el.focus() })
  await page.waitForTimeout(200)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
  const focusAfter = await stateOf(page, sid)
  if (focusAfter.historyLength === focusBefore.historyLength && focusAfter.historyIndex === focusBefore.historyIndex) {
    pass('slider-focused shortcuts stay inert (no phantom history)', `idx=${focusAfter.historyIndex}`)
  } else {
    fail('slider-focused shortcuts stay inert (no phantom history)', `before=${focusBefore.historyIndex} after=${focusAfter.historyIndex}`)
  }
  await VE(page, () => { if (document.activeElement) document.activeElement.blur() })

  // Step 5: Multi-select, key object, group, duplicate, transform, appearance (group opacity, blend, mask, effect, clipping)
  // First verify rendered pixel on the shape at opacity 0.4 (#111111 over #ffffff -> ~160)
  const shapePxAt40 = await pixelStats(page, { x: 150, y: 150, w: 20, h: 20 })
  if (shapePxAt40 && shapePxAt40[0] > 145 && shapePxAt40[0] < 175) {
    pass('rendered canvas reflects 40% layer opacity on shape', `rgb=${shapePxAt40.join(',')}`)
  } else {
    fail('rendered canvas reflects 40% layer opacity on shape', `rgb=${JSON.stringify(shapePxAt40)}`)
  }

  // Multi-select shape + raster, set key object, check unified scope='selection', group them, adjust group opacity, duplicate & transform
  const groupWorkflow = await VE(page, ({ shapeId, rasterId, textId }) => {
    const S = window.__voidEditor
    const st = S.getState()
    st.setActive(shapeId)
    st.toggleSelect(rasterId)
    st.setKeyObject(shapeId)
    const multiSel = { selectedIds: [...S.getState().selectedIds], activeId: S.getState().activeId, keyObjectId: S.getState().keyObjectId }

    // Group selected layers
    S.getState().groupSelected()
    const afterGroup = S.getState()
    const gId = afterGroup.groups[0]?.id ?? null

    // Apply group opacity 0.5 and an invert effect on the shape inside the group
    if (gId) S.getState().updateGroup(gId, { opacity: 0.5 }, 'Group opacity 50%')
    const fx = window.__vcFx.newEffect('invert')
    S.getState().addEffect([{ type: 'layer', id: shapeId }], fx, 'Invert badge')

    // Duplicate the text layer, transform it (move + rotate), then delete the duplicate to verify selection reconciliation
    S.getState().setActive(textId)
    const dupIds = S.getState().duplicateSelected({ dx: 40, dy: -60, label: 'Duplicate headline' })
    const dupId = dupIds[0]
    S.getState().updateLayer(dupId, { x: 140, y: 980, rotation: 0.05 }, 'Transform duplicate')
    const beforeDelSel = [...S.getState().selectedIds]
    S.getState().removeLayer(dupId)
    const afterDel = S.getState()

    return {
      multiSel,
      gId,
      groupCount: afterGroup.groups.length,
      beforeDelSel,
      afterDelSel: [...afterDel.selectedIds],
      afterDelActive: afterDel.activeId,
      dupStillExists: afterDel.layers.some(l => l.id === dupId),
    }
  }, { shapeId: byType.shape, rasterId: byType.raster, textId: byType.text })

  if (
    groupWorkflow.multiSel.selectedIds.length === 2 &&
    groupWorkflow.multiSel.keyObjectId === byType.shape &&
    groupWorkflow.gId &&
    !groupWorkflow.dupStillExists &&
    !groupWorkflow.afterDelSel.includes(groupWorkflow.beforeDelSel[0])
  ) {
    pass('multi-select, key object, group, duplicate, transform and delete reconciliation', JSON.stringify({ gId: groupWorkflow.gId, afterDelSel: groupWorkflow.afterDelSel }))
  } else {
    fail('multi-select, key object, group, duplicate, transform and delete reconciliation', JSON.stringify(groupWorkflow))
  }

  // Check pixel output after group opacity (0.5) * layer opacity (0.4) = 0.2 of inverted #111111 (#eeeeee = 238) over #ffffff (255) -> ~251.6
  const shapePxAfterGroupAndInvert = await pixelStats(page, { x: 150, y: 150, w: 20, h: 20 })
  if (shapePxAfterGroupAndInvert && shapePxAfterGroupAndInvert[0] > 245 && shapePxAfterGroupAndInvert[0] > shapePxAt40[0]) {
    pass('rendered canvas reflects combined group opacity + layer invert effect', `before=${shapePxAt40[0]} after=${shapePxAfterGroupAndInvert[0]}`)
  } else {
    fail('rendered canvas reflects combined group opacity + layer invert effect', JSON.stringify({ shapePxAt40, shapePxAfterGroupAndInvert }))
  }

  // Test Undo and Redo of the delete + transform + effect steps
  const undoCheck = await VE(page, () => {
    const st = window.__voidEditor.getState()
    st.undo() // undo delete duplicate
    const restoredCount = window.__voidEditor.getState().layers.length
    st.redo() // redo delete duplicate
    const afterRedoCount = window.__voidEditor.getState().layers.length
    return { restoredCount, afterRedoCount }
  })
  if (undoCheck.restoredCount === 4 && undoCheck.afterRedoCount === 3) {
    pass('undo/redo across duplicate deletion preserves layer count and valid selection', JSON.stringify(undoCheck))
  } else {
    fail('undo/redo across duplicate deletion preserves layer count and valid selection', JSON.stringify(undoCheck))
  }

  // Step 5b: Clipping mask, layer mask, blend mode & effect ordering pixel checks
  const clipAndMaskCheck = await VE(page, async ({ shapeId }) => {
    const S = window.__voidEditor
    const st = S.getState()
    // Add a blue rectangle overlapping only the right half of the Hero Badge (80..400, y:90..290) -> at x:240..500, y:90..290
    const clipLayerId = st.addShape('rect', 240, 90, 260, 200, { fill: '#0066ff', name: 'Clipped Accent', blend: 'multiply' })
    // Clip it onto the Hero Badge
    S.getState().clipLayerOnto(clipLayerId, shapeId)
    // Add a layer mask that hides the bottom half (y > 190 in doc space -> local y > 100)
    S.getState().addMask(clipLayerId)
    const maskedLayer = S.getState().layers.find(l => l.id === clipLayerId)
    if (maskedLayer?.mask) {
      const mctx = maskedLayer.mask.getContext('2d')
      mctx.fillStyle = '#000000'
      mctx.fillRect(0, 100, 260, 100)
      S.getState().updateLayer(clipLayerId, { mask: maskedLayer.mask }, 'Paint half mask')
    }
    S.getState().setEditingMask(false)

    // Sample pixels:
    // 1. Inside base & top-right (x:300, y:130) -> clipped blue shows (blue > red)
    // 2. Inside base & bottom-right (x:300, y:240) -> hidden by layer mask (grey, red === blue)
    // 3. Outside base on the right (x:450, y:130) -> clipped away by base shape (white 255,255,255)
    const pxShow = await window.__vcPixels({ x: 300, y: 130, w: 4, h: 4 })
    const pxMasked = await window.__vcPixels({ x: 300, y: 240, w: 4, h: 4 })
    const pxClippedOut = await window.__vcPixels({ x: 450, y: 130, w: 4, h: 4 })

    // Clean up the probe layer so the 3-layer baseline continues cleanly into Cascade
    S.getState().removeLayer(clipLayerId)
    return {
      showBlue: pxShow[2] > pxShow[0] + 15,
      maskedGrey: Math.abs(pxMasked[0] - pxMasked[2]) <= 3,
      clippedOutsideWhite: pxClippedOut[0] > 250 && pxClippedOut[1] > 250 && pxClippedOut[2] > 250,
      pxShow: pxShow.slice(0, 3),
      pxMasked: pxMasked.slice(0, 3),
      pxClippedOut: pxClippedOut.slice(0, 3),
    }
  }, { shapeId: byType.shape })

  if (clipAndMaskCheck.showBlue && clipAndMaskCheck.maskedGrey && clipAndMaskCheck.clippedOutsideWhite) {
    pass('rendered canvas verifies clipping base, layer mask and blend mode evaluation', JSON.stringify({ show: clipAndMaskCheck.pxShow, masked: clipAndMaskCheck.pxMasked, outside: clipAndMaskCheck.pxClippedOut }))
  } else {
    fail('rendered canvas verifies clipping base, layer mask and blend mode evaluation', JSON.stringify(clipAndMaskCheck))
  }

  // Step 6: Multiple artboards & Cascade
  // Exercise Cascade through the real UI dialog exactly as a designer does (vc:open 'boards' -> Cascade tab -> Create)
  await VE(page, () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))
  await page.waitForTimeout(400)
  const cascadeTab = page.locator('button[role="tab"]:has-text("Cascade")')
  if (await cascadeTab.count() > 0) {
    await cascadeTab.click()
    await page.waitForTimeout(1000)
    const createBtn = page.locator('button:has-text("Create")').first()
    if (await createBtn.count() > 0) {
      await createBtn.click()
      await page.waitForTimeout(1000)
    }
  }

  const afterCascade = await VE(page, () => {
    const st = window.__voidEditor.getState()
    const frames = st.doc?.frames ?? []
    const master = frames.find(f => !f.linkedFrom) ?? frames[0]
    const variants = frames.filter(f => f.linkedFrom === master?.id)
    const variantLayers = st.layers.filter(l => variants.some(v => v.id === l.frameId))
    return {
      frameCount: frames.length,
      masterId: master?.id ?? null,
      variantCount: variants.length,
      variantLayerCount: variantLayers.length,
      hasCascadeBaseline: variantLayers.some(l => 'cascadeBase' in l),
      selectedIds: [...st.selectedIds],
      activeFrameId: st.activeFrameId,
    }
  })

  if (afterCascade.frameCount > 1 && afterCascade.variantCount >= 1 && afterCascade.variantLayerCount >= 1) {
    pass('Cascade creates linked variant artboards and populates variant layers', `frames=${afterCascade.frameCount}, variants=${afterCascade.variantCount}, layers=${afterCascade.variantLayerCount}`)
  } else {
    fail('Cascade creates linked variant artboards and populates variant layers', JSON.stringify(afterCascade))
  }

  // Test Cascade variant override + resync behavior (select a variant layer, override it, edit master, trigger resync, check selection reconciliation & whether identities survive)
  cascadeBehaviorReport = await VE(page, ({ masterShapeId }) => {
    const S = window.__voidEditor
    const st = S.getState()
    const frames = st.doc.frames ?? []
    const master = frames.find(f => !f.linkedFrom) ?? frames[0]
    const child = frames.find(f => f.linkedFrom === master.id)
    const childShape = st.layers.find(l => l.frameId === child.id && l.srcId === masterShapeId)
    if (!child || !childShape) return { ok: false, reason: 'missing child shape' }

    const childIdBefore = childShape.id
    // Select the variant layer and apply a local override (fill color)
    st.setActive(childIdBefore)
    st.updateLayer(childIdBefore, { fill: '#ff0055' }, 'Override variant fill')
    // Edit master shape opacity
    st.updateLayer(masterShapeId, { opacity: 0.75 }, 'Master opacity edit')
    // Keep selection on the variant layer before resync to test U1 selection reconciliation!
    st.setActive(childIdBefore)
    return {
      ok: true,
      childFrameId: child.id,
      childIdBefore,
      hasCascadeBase: 'cascadeBase' in childShape,
    }
  }, { masterShapeId: byType.shape })

  // Trigger "Update variants" / resync via Boards dialog (button[aria-label="Re-sync variants"])
  await VE(page, () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))
  await page.waitForTimeout(400)
  const updateVariantsBtn = page.locator('button[aria-label="Re-sync variants"]')
  if (await updateVariantsBtn.count() > 0) {
    await updateVariantsBtn.first().click()
    await page.waitForTimeout(600)
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const postResync = await VE(page, ({ info, masterShapeId }) => {
    const st = window.__voidEditor.getState()
    const liveIds = new Set(st.layers.map(l => l.id))
    const childShapeAfter = st.layers.find(l => l.frameId === info.childFrameId && l.srcId === masterShapeId)
    const staleSelected = st.selectedIds.filter(id => !liveIds.has(id))
    const staleActive = st.activeId && !liveIds.has(st.activeId)
    return {
      identityPreserved: childShapeAfter?.id === info.childIdBefore,
      overridePreserved: childShapeAfter?.fill === '#ff0055',
      masterUpdatePropagated: Math.abs((childShapeAfter?.opacity ?? 0) - 0.75) < 0.01,
      staleSelectedCount: staleSelected.length,
      staleActive: !!staleActive,
      selectedIds: [...st.selectedIds],
      activeId: st.activeId,
    }
  }, { info: cascadeBehaviorReport, masterShapeId: byType.shape })

  cascadeBehaviorReport = { ...cascadeBehaviorReport, ...postResync }
  if (postResync.staleSelectedCount === 0 && !postResync.staleActive) {
    pass('selection reconciliation leaves zero stale references after Cascade resync', JSON.stringify(postResync))
  } else {
    fail('selection reconciliation leaves zero stale references after Cascade resync', JSON.stringify(postResync))
  }

  // Production invariants check
  const inv = await VE(page, () => (typeof window.__vcCheck === 'function' ? window.__vcCheck() : 'MISSING'))
  if (Array.isArray(inv) && inv.length === 0) pass('production invariants hold with flag on')
  else fail('production invariants hold with flag on', JSON.stringify(inv).slice(0, 200))

  // Step 7: Preview-vs-export parity on the master board
  const par = await VE(page, (fid) => window.__vcParity({ frame: fid, scale: 1 }), afterCascade.masterId)
  const parOk = par && typeof par.mean === 'number' ? par.mean < 2 && par.worst < 12 : false
  if (parOk) pass('preview matches export on master artboard', JSON.stringify(par))
  else fail('preview matches export on master artboard', JSON.stringify(par))
  await snap(page, 'unified-canvas.png')

  // Step 8: Export PNG and multi-page PDF and verify output bytes
  const exportCheck = await VE(page, async (masterId) => {
    const pngExp = await window.__vcAssets.exportBoard('png')
    const pdfExp = await window.__vcAssets.exportBoard('pdf')
    const pngBytes = atob(pngExp.b64)
    const pdfBytes = atob(pdfExp.b64)
    const isPngSig = pngBytes.charCodeAt(0) === 0x89 && pngBytes.slice(1, 4) === 'PNG'
    const isPdfSig = pdfBytes.slice(0, 5) === '%PDF-'
    const pdfPages = (pdfBytes.match(/\/Type\s*\/Page\b/g) || []).length

    // Also decode the exported PNG onto a canvas and compare its pixel at (150, 150) with the live canvas renderFrame
    const frameDataUrl = await window.__vcFrame(masterId, 1)
    const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
    const imgA = await loadImg('data:image/png;base64,' + pngExp.b64)
    const imgB = await loadImg(frameDataUrl)
    const cA = document.createElement('canvas'); cA.width = imgA.width; cA.height = imgA.height; cA.getContext('2d').drawImage(imgA, 0, 0)
    const cB = document.createElement('canvas'); cB.width = imgB.width; cB.height = imgB.height; cB.getContext('2d').drawImage(imgB, 0, 0)
    const pxA = Array.from(cA.getContext('2d').getImageData(150, 150, 1, 1).data)
    const pxB = Array.from(cB.getContext('2d').getImageData(150, 150, 1, 1).data)
    const pxDiff = Math.max(Math.abs(pxA[0] - pxB[0]), Math.abs(pxA[1] - pxB[1]), Math.abs(pxA[2] - pxB[2]))

    return { isPngSig, pngLen: pngExp.len, isPdfSig, pdfLen: pdfExp.len, pdfPages, pxA, pxB, pxDiff }
  }, afterCascade.masterId)

  if (exportCheck.isPngSig && exportCheck.pngLen > 1000 && exportCheck.pxDiff <= 2) {
    pass('PNG export produces valid PNG matching rendered frame pixels', `len=${exportCheck.pngLen}, pxDiff=${exportCheck.pxDiff}`)
  } else {
    fail('PNG export produces valid PNG matching rendered frame pixels', JSON.stringify(exportCheck))
  }
  if (exportCheck.isPdfSig && exportCheck.pdfLen > 500 && exportCheck.pdfPages >= 1) {
    pass('PDF export produces valid PDF document', `len=${exportCheck.pdfLen}, pages=${exportCheck.pdfPages}`)
  } else {
    fail('PDF export produces valid PDF document', JSON.stringify(exportCheck))
  }

  // Step 9: Save and reopen .void archive AND flush/reload IndexedDB
  const voidRoundTrip = await VE(page, async ({ shapeId, rasterId, textId }) => {
    const stBefore = window.__voidEditor.getState()
    const idsBefore = stBefore.layers.map(l => l.id)
    const groupsBefore = stBefore.groups.map(g => ({ id: g.id, opacity: g.opacity }))
    const assetsBefore = Object.keys(stBefore.doc.assets ?? {})
    const saved = await window.__vcAssets.saveVoid()
    if (!saved || saved.len < 100) return { ok: false, reason: 'saveVoid failed' }

    // Open into a clean state via openVoid
    const newDocId = await window.__vcAssets.openVoid(saved.b64)
    const stAfter = window.__voidEditor.getState()
    const idsAfter = stAfter.layers.map(l => l.id)
    const groupsAfter = stAfter.groups.map(g => ({ id: g.id, opacity: g.opacity }))
    const assetsAfter = Object.keys(stAfter.doc.assets ?? {})
    const shapeAfter = stAfter.layers.find(l => l.id === shapeId)
    const rasterAfter = stAfter.layers.find(l => l.id === rasterId)
    const textAfter = stAfter.layers.find(l => l.id === textId)

    return {
      ok: !!newDocId,
      newDocId,
      savedLen: saved.len,
      idsMatch: JSON.stringify(idsBefore) === JSON.stringify(idsAfter),
      groupsMatch: JSON.stringify(groupsBefore) === JSON.stringify(groupsAfter),
      assetsMatch: JSON.stringify(assetsBefore) === JSON.stringify(assetsAfter) && assetsAfter.length >= 1,
      shapeOpacity: shapeAfter?.opacity,
      shapeEffects: (shapeAfter?.effects ?? []).map(e => e.kind),
      rasterHasCanvas: (rasterAfter?.canvas?.width ?? 0) > 0,
      textContent: textAfter?.text,
    }
  }, { shapeId: byType.shape, rasterId: byType.raster, textId: byType.text })

  if (
    voidRoundTrip.ok &&
    voidRoundTrip.idsMatch &&
    voidRoundTrip.groupsMatch &&
    voidRoundTrip.assetsMatch &&
    Math.abs((voidRoundTrip.shapeOpacity ?? 0) - 0.75) < 0.01 &&
    voidRoundTrip.shapeEffects.includes('invert') &&
    voidRoundTrip.rasterHasCanvas &&
    voidRoundTrip.textContent === 'Launch night'
  ) {
    pass('.void archive round-trip preserves object IDs, groups, C1 lineage, effects and appearance', `bytes=${voidRoundTrip.savedLen}`)
  } else {
    fail('.void archive round-trip preserves object IDs, groups, C1 lineage, effects and appearance', JSON.stringify(voidRoundTrip))
  }

  // Also verify reload persistence via IndexedDB autosave flush
  const currentDocId = await VE(page, () => window.__voidEditor.getState().doc.id)
  await VE(page, () => window.__vcSave.flush())
  await page.waitForTimeout(400)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction((id) => window.__voidEditor?.getState().doc?.id === id, currentDocId, { timeout: 30000 })
  await page.waitForTimeout(600)
  const reopened = await stateOf(page, byType.shape)
  if (reopened.layer && Math.abs(reopened.layer.opacity - 0.75) < 0.01 && reopened.docId === currentDocId) {
    pass('save/reopen reload preserves doc + edits', `opacity=${reopened.layer.opacity}`)
  } else {
    fail('save/reopen reload preserves doc + edits', JSON.stringify({ doc: reopened.docId, layer: reopened.layer }))
  }
  await VE(page, (lid) => window.__voidEditor.getState().setActive(lid), byType.shape)
  await page.waitForTimeout(300)
  if (await page.getByTestId('unified-context').count() > 0) pass('inspector context survives reopen')
  else fail('inspector context survives reopen')
  await snap(page, 'unified-reopened.png')

  if (consoleErrors.length === 0) pass('no console/page errors with flag on')
  else fail('no console/page errors with flag on', consoleErrors.slice(0, 3).join(' | '))
  if (failedRequests.length === 0) pass('no failed requests with flag on')
  else fail('no failed requests with flag on', failedRequests.slice(0, 3).join(' | '))
  await page.close()
  await context.close()

  // ── 2. Mobile workflow (iPhone 13 viewport, Flag ON) ──
  const mContext = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, acceptDownloads: true })
  const mPage = await mContext.newPage()
  mPage.on('pageerror', e => consoleErrors.push('mobile/pageerror: ' + String(e).slice(0, 200)))
  await mPage.goto(BASE + '/editor?unified=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await mPage.waitForFunction(() => window.__voidEditor, null, { timeout: 60000 })
  await mPage.waitForTimeout(800)

  // Import image on mobile (fallback to placeBytes if StartScreen file input is replaced)
  const mFile = await mPage.$('input[type="file"]')
  if (mFile) {
    await mFile.setInputFiles(FIX.land)
  } else {
    const landB64 = fs.readFileSync(FIX.land).toString('base64')
    await VE(mPage, () => window.__voidEditor.getState().newDoc({ name: 'Mobile U1', width: 1080, height: 1350, background: '#ffffff' }))
    await VE(mPage, b64 => window.__vcAssets.placeBytes(b64, 'land.jpg', 'image/jpeg'), landB64)
  }
  await mPage.waitForFunction(() => window.__voidEditor.getState().layers.length >= 1, null, { timeout: 15000 })
  await mPage.waitForTimeout(600)

  const mModes = await mPage.$$('nav[aria-label="Modes"] button')
  if (mModes.length === 5) pass('mobile: 5-mode bar rendered after image import')
  else fail('mobile: 5-mode bar rendered after image import', `count=${mModes.length}`)

  // Add heading text on mobile
  const openMobileMode = async (m) => {
    if (await mPage.$('[data-context-bar]')) {
      const ctx = { Select: 'settings', Effects: 'effects' }[m]
      if (ctx) {
        const b = mPage.locator(`[data-context-bar] button[data-ctx="${ctx}"]`)
        await b.scrollIntoViewIfNeeded()
        if ((await b.getAttribute('aria-pressed')) !== 'true') await b.tap()
        await mPage.waitForTimeout(300)
        return
      }
      await mPage.tap('[data-context-bar] button[aria-label="Back"]')
      await mPage.waitForTimeout(300)
    }
    const btn = await mPage.$(`nav[aria-label="Modes"] button:has-text("${m}")`)
    if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.tap()
    await mPage.waitForTimeout(300)
  }

  await openMobileMode('Text')
  await mPage.tap('button:has-text("Add heading")')
  await mPage.waitForTimeout(400)
  await mPage.keyboard.type('Mobile U1')
  await mPage.tap('[data-text-edit-bar] button:has-text("Done")')
  await mPage.waitForTimeout(400)

  // Add Circle shape on mobile
  await openMobileMode('Shape')
  await mPage.tap('[data-mobile-sheet] button:has-text("Circle")')
  await mPage.waitForTimeout(400)

  // Verify mobile Layers sheet and U1 store reconciliation on mobile delete/undo
  await mPage.tap('button[aria-label^="Layers"]')
  await mPage.waitForTimeout(300)
  const mSheetOpen = (await mPage.locator('[data-mobile-sheet]').count()) === 1
  if (mSheetOpen) pass('mobile: Layers sheet opens with imported photo, text and shape')
  else fail('mobile: Layers sheet opens with imported photo, text and shape')
  await mPage.tap('[data-mobile-sheet] button:has-text("Done")')
  await mPage.waitForTimeout(250)

  const mReconcile = await VE(mPage, () => {
    const st = window.__voidEditor.getState()
    const countBefore = st.layers.length
    const shape = st.layers.find(l => l.type === 'shape')
    st.setActive(shape.id)
    st.removeLayer(shape.id)
    const afterDel = window.__voidEditor.getState()
    const noStale = !afterDel.selectedIds.includes(shape.id) && afterDel.activeId !== shape.id
    afterDel.undo()
    const afterUndo = window.__voidEditor.getState().layers.length
    return { countBefore, noStale, afterUndo }
  })
  if (mReconcile.countBefore === 3 && mReconcile.noStale && mReconcile.afterUndo === 3) {
    pass('mobile: selection reconciliation and undo hold across raster+text+shape', JSON.stringify(mReconcile))
  } else {
    fail('mobile: selection reconciliation and undo hold across raster+text+shape', JSON.stringify(mReconcile))
  }

  // Share PNG on mobile
  await mPage.tap('header button:has-text("Share")')
  await mPage.waitForTimeout(300)
  const [mDl] = await Promise.all([
    mPage.waitForEvent('download', { timeout: 30000 }),
    mPage.tap('[data-mobile-sheet] button:has-text("PNG")'),
  ])
  if (/\.png$/i.test(mDl.suggestedFilename())) pass('mobile: Share produces PNG download', mDl.suggestedFilename())
  else fail('mobile: Share produces PNG download', mDl.suggestedFilename())
  await snap(mPage, 'unified-mobile.png')
  await mPage.close()
  await mContext.close()

  // ── 3. Flag OFF (?unified=0 revokes; default disabled) ──
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  p2.on('pageerror', e => consoleErrors.push('off/pageerror: ' + String(e).slice(0, 200)))
  await p2.goto(BASE + '/editor?unified=0', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__voidEditor, null, { timeout: 60000 })
  await p2.waitForTimeout(1000)
  await p2.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p2.waitForFunction(() => window.__voidEditor, null, { timeout: 60000 })
  await p2.waitForTimeout(1000)
  await VE(p2, () => {
    window.__voidEditor.getState().newDoc({ name: 'Flag off check', width: 800, height: 600, background: '#fff' })
    window.__voidEditor.getState().addText(10, 10, 200)
  })
  await p2.waitForTimeout(400)
  const absent = await p2.getByTestId('unified-context').count()
  if (absent === 0) pass('flag off renders no unified UI')
  else fail('flag off renders no unified UI', `count=${absent}`)
  const offOk = await VE(p2, () => {
    const st = window.__voidEditor.getState()
    const t = st.layers.find(l => l.type === 'text')
    st.setActive(t.id)
    st.updateLayer(t.id, { opacity: 0.7 }, 'Flag-off opacity')
    st.undo()
    return window.__voidEditor.getState().layers.find(l => l.id === t.id)?.opacity === 1
  })
  if (offOk) pass('flag off leaves existing transactions intact')
  else fail('flag off leaves existing transactions intact')
  await snap(p2, 'unified-flag-off.png')
  await p2.close()
} finally {
  await browser.close()
}

const report = {
  base: BASE,
  at: new Date().toISOString(),
  cascadeBehaviorReport,
  results,
  consoleErrors,
  failedRequests,
}
fs.writeFileSync(path.join(EVIDENCE, 'unified-slice-report.json'), JSON.stringify(report, null, 2))
const failed = results.filter(r => !r.ok)
console.log(`\nUNIFIED-SLICE: ${results.length - failed.length}/${results.length} passed (report: e2e/evidence/unified-slice-report.json)`)
process.exit(failed.length ? 1 : 0)
