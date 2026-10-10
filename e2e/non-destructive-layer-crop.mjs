// Editable, source-preserving layer crop regression. Unlike Image > Crop,
 // this command must never change the document size or delete hidden pixels.
import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } })
const BASE = process.env.BASE || 'http://localhost:3123'
let failed = false
const check = (label, yes) => {
  console.log(`${yes ? 'PASS' : 'FAIL'} ${label}`)
  if (!yes) failed = true
}
page.on('pageerror', err => { failed = true; console.error('PAGE ERROR', err.message) })
try {
  await page.goto(BASE + '/editor')
  await page.waitForFunction(() => window.__voidEditor && window.__vcRun, null, { timeout: 30000 })
  const first = await page.evaluate(() => {
    const store = window.__voidEditor, s = () => store.getState()
    s().newDoc({ name: 'Live crop', width: 320, height: 240, background: null })
    const id = s().addShape('rect', 20, 20, 220, 190, { fill: '#f00000' })
    const select = document.createElement('canvas')
    select.width = 320; select.height = 240
    const c = select.getContext('2d')
    c.fillStyle = '#fff'; c.fillRect(60, 60, 80, 90)
    s().setActive(id)
    s().setSelection(select)
    const before = { x: s().active().x, w: s().active().w, h: s().active().h, history: s().historyIndex }
    window.__vcRun('layer.cropToSelection')
    const l = s().active()
    return { id, before, after: { x: l.x, w: l.w, h: l.h, type: l.type, vm: !!l.vmask, nodes: l.vmask?.subpaths[0]?.nodes.length, docW: s().doc.width, history: s().historyIndex }, passes: s().doc.width === 320 && l.w === before.w && l.h === before.h && l.x === before.x && l.type === 'shape' && l.vmask?.enabled && l.vmask.subpaths[0].nodes.length === 4 }
  })
  check('crop adds an editable mask without replacing source geometry or resizing document', first.passes)
  const pixels = await page.evaluate(() => {
    const rgba = (x, y) => {
      const p = window.__vcPixels({ x, y, w: 1, h: 1 })
      return p ? Array.from(p).slice(0, 4) : null
    }
    return { inside: rgba(80, 80), outside: rgba(40, 40), other: rgba(160, 80) }
  })
  check('crop renders selected region but hides outside pixels', !!pixels.inside && pixels.inside[3] > 245 && pixels.outside?.[3] === 0 && pixels.other?.[3] === 0)

  const toggleAndHistory = await page.evaluate(id => {
    const store = window.__voidEditor, s = () => store.getState()
    const source = s().layers.find(l => l.id === id)
    s().updateLayer(id, { vmask: { ...source.vmask, enabled: false } }, 'Toggle crop visibility')
    const disabled = !s().layers.find(l => l.id === id).vmask.enabled
    s().undo()
    const restored = s().layers.find(l => l.id === id).vmask.enabled
    s().undo()
    const removed = !s().layers.find(l => l.id === id).vmask
    s().redo()
    const redo = !!s().layers.find(l => l.id === id).vmask?.enabled
    s().setActive(id)
    window.__vcRun('vmask.delete')
    const recover = s().layers.find(l => l.id === id)
    return { disabled, restored, removed, redo, recover: !recover.vmask && recover.type === 'shape' && recover.w === 220 }
  }, first.id)
  check('crop toggle, undo/redo and delete restore original editable content', Object.values(toggleAndHistory).every(Boolean))

  const protects = await page.evaluate(id => {
    const store = window.__voidEditor, s = () => store.getState()
    s().setActive(id)
    const vm = { enabled: true, subpaths: [{ closed: true, nodes: [{ x: 0, y: 0, inX: 0, inY: 0, outX: 0, outY: 0 }] }] }
    s().updateLayer(id, { vmask: vm }, 'Existing vector mask')
    const before = JSON.stringify(s().active().vmask)
    window.__vcRun('layer.cropToSelection')
    return before === JSON.stringify(s().active().vmask)
  }, first.id)
  check('existing user vector mask cannot be silently overwritten', protects)

  const rotated = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Rotated crop', width: 320, height: 240, background: null })
    const id = s.addShape('rect', 65, 50, 160, 100, { fill: '#33ff00' })
    s.updateLayer(id, { rotation: Math.PI / 6 }, 'Rotate source')
    const mask = document.createElement('canvas')
    mask.width = 320; mask.height = 240
    const x = mask.getContext('2d')
    x.fillStyle = '#fff'; x.fillRect(105, 80, 70, 60)
    s.setSelection(mask)
    s.setActive(id)
    window.__vcRun('layer.cropToSelection')
    const layer = window.__voidEditor.getState().active()
    const pts = layer.vmask?.subpaths[0].nodes
    return {
      remainsEditable: layer.type === 'shape' && Math.abs(layer.rotation - Math.PI / 6) < 0.001,
      transformed: !!pts && pts.some(p => Math.abs(p.x - 105) > 0.5),
      source: layer.w === 160 && layer.h === 100
    }
  })
  check('rotated layer crop maps document rectangle to local path while preserving rotation', Object.values(rotated).every(Boolean))
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
