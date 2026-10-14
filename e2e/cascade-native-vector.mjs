// Browser gate for native source replacement and variant-local vector edits.
// Deliberate conflicts must preserve pixels/paths and remain visible on re-sync.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const pageErrors = []
page.on('pageerror', e => pageErrors.push(e.message))
const VE = (fn, arg) => page.evaluate(fn, arg)
try {
  await page.goto(BASE + '/editor')
  await page.waitForFunction(() => !!window.__voidEditor, null, { timeout: 45000 })
  await VE(() => {
    const s = window.__voidEditor.getState()
    const cv = colour => {
      const c = document.createElement('canvas'); c.width = 32; c.height = 32
      const g = c.getContext('2d'); g.fillStyle = colour; g.fillRect(0, 0, 32, 32); return c
    }
    const asset = id => ({ id, parentId: null, title: id, mime: 'image/png', sha256: id + '-sha',
      width: 32, height: 32, source: 'user_upload' })
    const subpaths = x => [{ closed: true, nodes: [
      { x, y: 10, inX: x, inY: 10, outX: x, outY: 10 },
      { x: x + 30, y: 10, inX: x+30, inY: 10, outX: x+30, outY: 10 },
      { x: x + 30, y: 40, inX: x+30, inY: 40, outX: x+30, outY: 40 },
    ] }]
    const base = (id, board, srcId) => ({
      id, frameId: board, srcId, name: id, x: board === 'M' ? 50 : board === 'V' ? 700 : 1350,
      y: 50, scaleX: 1, scaleY: 1, rotation: 0, rev: 1,
      visible: true, locked: false, opacity: 1, blend: 'source-over', mask: null, maskEnabled: false,
    })
    const raster = (id, board, srcId, color, a) => ({
      ...base(id, board, srcId), type: 'raster', name: 'Photo', canvas: cv(color),
      asset: asset(a), source: 'photo', role: 'image',
    })
    const shape = (id, board, srcId, n) => ({
      ...base(id, board, srcId), name: 'Vector artwork', type: 'shape', shape: 'path',
      x: (board === 'M' ? 200 : board === 'V' ? 850 : 1500),
      y: 180, w: 80, h: 80, radius: 0, subpaths: subpaths(n),
      fill: '#135ea1', stroke: null, strokeWidth: 0, role: 'decoration',
    })
    s.loadFramed({
      id: 'cascade-native-vector', name: 'Cascade source content', width: 2000, height: 650,
      background: '#ffffff', frames: [
        { id: 'M', name: 'Master', x: 0, y: 0, width: 500, height: 500, background: '#fff' },
        { id: 'V', name: 'Untouched variant', x: 650, y: 0, width: 500, height: 500, background: '#fff', linkedFrom: 'M' },
        { id: 'W', name: 'Local override variant', x: 1300, y: 0, width: 500, height: 500, background: '#fff', linkedFrom: 'M' },
      ],
    }, [
      raster('master-image', 'M', null, '#ff0000', 'A'),
      shape('master-vector', 'M', null, 5),
      {
        ...raster('untouched-image', 'V', 'master-image', '#ff0000', 'A'),
        cascadeBase: { __assetSignature: 'A@A-sha' },
      },
      {
        ...shape('untouched-vector', 'V', 'master-vector', 5),
        cascadeBase: { __vectorPath: subpaths(5) },
        cascadeVariantBase: { subpaths: subpaths(5), w: 80, h: 80 },
      },
      {
        ...raster('custom-image', 'W', 'master-image', '#0000ff', 'LOCAL'),
        cascadeBase: { __assetSignature: 'A@A-sha' },
      },
      {
        ...shape('custom-vector', 'W', 'master-vector', 777),
        cascadeBase: { __vectorPath: subpaths(5) },
        cascadeVariantBase: { subpaths: subpaths(5), w: 80, h: 80 },
      },
    ], [], [])
    s.updateLayer('master-image', { canvas: cv('#00ff00'), asset: asset('B') }, 'Master image replacement')
    s.updateLayer('master-vector', { subpaths: subpaths(12) }, 'Master path change')
  })
  await VE(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))
  await page.getByRole('button', { name: 'Re-sync variants' }).click()
  const read = () => VE(() => {
    const st = window.__voidEditor.getState()
    const l = id => st.layers.find(x => x.id === id)
    const rgb = obj => [...obj.canvas.getContext('2d').getImageData(0, 0, 1, 1).data].slice(0, 3)
    const a = l('untouched-image'), b = l('custom-image')
    const v = l('untouched-vector'), w = l('custom-vector')
    return {
      layerIds: ['untouched-image', 'custom-image', 'untouched-vector', 'custom-vector'].every(x => !!l(x)),
      untouchedAsset: a.asset?.id, localAsset: b.asset?.id,
      masterAsset: l('master-image').asset?.id,
      untouchedPixels: rgb(a), localPixels: rgb(b),
      detached: a.canvas !== l('master-image').canvas,
      untouchedVectorPath: v.subpaths?.[0]?.nodes?.[0]?.x,
      localVectorPath: w.subpaths?.[0]?.nodes?.[0]?.x,
      imageConflicts: b.cascadeConflicts ?? [],
      vectorConflicts: w.cascadeConflicts ?? [],
      lastAction: st.history.at(-1)?.label,
    }
  })
  const after = await read()
  const expect = (yes, label, info) => {
    if (!yes) throw new Error(label + ': ' + JSON.stringify(info))
    console.log('PASS ' + label)
  }
  expect(after.layerIds, 'existing variant identities retained', after)
  expect(after.untouchedAsset === 'B' && after.masterAsset === 'B' && after.detached,
    'native replacement propagates with detached variant pixels', after)
  expect(after.untouchedPixels[1] === 255 && after.untouchedPixels[0] === 0,
    'untouched variant has real new master pixels', after)
  expect(after.localAsset === 'LOCAL' && after.localPixels[2] === 255,
    'local raster override preserves blue pixels and asset', after)
  expect(after.untouchedVectorPath !== 5 && Number.isFinite(after.untouchedVectorPath),
    'untouched vector path inherits updated target-local geometry', after)
  expect(after.localVectorPath === 777 && after.vectorConflicts.includes('vector path'),
    'designer vector path preserved with conflict notice', after)
  expect(after.imageConflicts.includes('asset'), 'local image conflict recorded', after)
  expect(after.lastAction === 'Update linked variants', 'one undoable sync transaction', after)
  // Repeated refresh must not silently clear outstanding conflicts.
  await page.getByRole('button', { name: 'Re-sync variants' }).click()
  const twice = await read()
  expect(twice.imageConflicts.includes('asset') && twice.vectorConflicts.includes('vector path'),
    'conflicts persist after repeated refresh', twice)
  const review = page.getByRole('region', { name: 'Cascade conflicts' })
  await review.waitFor({ state: 'visible' })
  const reviewText = await review.textContent() ?? ''
  expect(reviewText.includes('asset') && reviewText.includes('vector path'),
    'designer can review unresolved image and vector conflicts from Boards', reviewText)
  await VE(() => window.__voidEditor.getState().undo())
  const undone = await read()
  expect(undone.untouchedAsset === 'B' && undone.localAsset === 'LOCAL',
    'undoing second sync restores first result without altering manual work', undone)
  await review.locator('button[title="Select this object on its linked board"]').filter({ hasText: 'Photo' }).first().click()
  const target = await VE(() => {
    const st = window.__voidEditor.getState()
    return { activeId: st.activeId, activeFrameId: st.activeFrameId }
  })
  expect(target.activeId === 'custom-image' && target.activeFrameId === 'W',
    'conflict review selects the local object and linked board', target)
  // UI decisions must be genuine one-step store/history edits.
  await VE(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))
  await page.getByRole('button', { name: 'Keep variant vector path for Vector artwork' }).click()
  const kept = await read()
  expect(kept.localVectorPath === 777 && !kept.vectorConflicts.includes('vector path'),
    'Keep variant preserves local vector and clears only its conflict', kept)
  await page.getByRole('button', { name: 'Use master asset for Photo' }).click()
  const adopted = await read()
  expect(adopted.localAsset === 'B' && adopted.localPixels[1] === 255 &&
    !adopted.imageConflicts.includes('asset') && adopted.layerIds,
    'Use master adopts real raster pixels without changing variant IDs', adopted)
  await VE(() => window.__voidEditor.getState().undo())
  const reversed = await read()
  expect(reversed.localAsset === 'LOCAL' && reversed.localPixels[2] === 255 &&
    reversed.imageConflicts.includes('asset'),
    'Undo restores the original local asset and pending conflict', reversed)
  await VE(() => window.__voidEditor.getState().redo())
  const redone = await read()
  expect(redone.localAsset === 'B' && !redone.imageConflicts.includes('asset'),
    'Redo reapplies master-pixel conflict resolution', redone)
  // Persist resolved conflicts through save/reopen; new U1 store must not
  // reintroduce references or duplicate the selected layer.
  await page.waitForFunction(() => !!window.__vcAssets?.saveVoid, null, { timeout: 15000 })
  const saved = await VE(async () => window.__vcAssets.saveVoid())
  expect(saved?.b64 && saved.len > 1000, 'editable document saves after conflict decisions', saved?.len)
  await VE(() => window.__voidEditor.getState().closeDoc())
  await VE(b64 => window.__vcAssets.openVoid(b64), saved.b64)
  const reopened = await read()
  expect(reopened.localAsset === 'B' && reopened.localVectorPath === 777 &&
    !reopened.imageConflicts.includes('asset') && !reopened.vectorConflicts.includes('vector path'),
    '.void round-trip preserves both explicit conflict resolutions', reopened)
  expect(pageErrors.length === 0, 'no uncaught browser errors', pageErrors)
  console.log('CASCADE NATIVE/VECTOR browser acceptance complete')
} finally { await browser.close() }
