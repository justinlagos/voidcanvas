// Focused designer muscle-memory checks: editable Free Transform, exact layer
// cycling, cross-board duplication and drag-to-colour. Requires running editor.
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3123'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
let failed = false
const ok = (name, valid) => {
  console.log(`${valid ? 'PASS' : 'FAIL'} ${name}`)
  if (!valid) failed = true
}
page.on('pageerror', e => { console.error('Browser error', e.message); failed = true })
try {
  await page.goto(BASE + '/editor')
  await page.waitForFunction(() => window.__voidEditor && window.__vcRun, null, { timeout: 30000 })

  const before = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Transform must remain editable', width: 320, height: 240, background: '#fff' })
    const id = s.addShape('rect', 45, 55, 60, 80, { fill: '#cc3333' })
    s.setActive(id)
    const state = window.__voidEditor.getState()
    window.__vcRun('edit.freeTransform')
    return { id, history: state.historyIndex, started: !!window.__voidEditor.getState().transform }
  })
  ok('transform opens on selected layer', before.started)
  await page.keyboard.press('Enter')
  let result = await page.evaluate(id => {
    const s = window.__voidEditor.getState(), l = s.layers.find(x => x.id === id)
    return { remainsShape: l?.type === 'shape', selected: s.activeId === id, noTransform: !s.transform, history: s.historyIndex }
  }, before.id)
  ok('Enter without changing transform retains editability and history', result.remainsShape && result.selected && result.noTransform && result.history === before.history)

  const startedScale = await page.evaluate(id => {
    const store = window.__voidEditor
    store.getState().setActive(id)
    window.__vcRun('edit.freeTransform')
    const t = store.getState().transform
    if (!t) return false
    const cx = (t.quad[0].x + t.quad[2].x) / 2
    const cy = (t.quad[0].y + t.quad[2].y) / 2
    store.setState({ transform: { ...t, quad: t.quad.map(q => ({ x: cx + (q.x - cx) * 1.5, y: cy + (q.y - cy) * 1.5 })) } })
    return true
  }, before.id)
  ok('rectangular free transform starts', startedScale)
  await page.keyboard.press('Enter')
  result = await page.evaluate(id => {
    const s = window.__voidEditor.getState(), l = s.layers.find(x => x.id === id)
    return { editable: l?.type === 'shape', scale: l?.scaleX, transformed: !s.transform }
  }, before.id)
  ok('ordinary scaling preserves shape type and editable geometry', result.editable && result.transformed && Math.abs(result.scale - 1.5) < 0.005)

  const repeat = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    const original = s.addShape('rect', 160, 60, 40, 50, { fill: '#4bb6e5' })
    s.setActive(original)
    window.__vcRun('edit.repeatTransform')
    const out = window.__voidEditor.getState().layers.find(l => l.id === original)
    return out?.type === 'shape' && Math.abs(out.scaleX - 1.5) < 0.005 &&
      Math.abs(out.scaleY - 1.5) < 0.005
  })
  ok('repeat last transform scales another editable layer', repeat)

  const board = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Artboard relative position', width: 320, height: 240, background: '#fff' })
    s.addFrame({ name: 'Story', width: 360, height: 640 })
    const frames = window.__voidEditor.getState().doc.frames
    s.setActiveFrame(frames[0].id)
    const id = s.addShape('rect', frames[0].x + 31, frames[0].y + 42, 70, 56)
    s.setActive(id)
    window.__vcRun('layer.duplicateToBoard')
    const state = window.__voidEditor.getState()
    const dest = frames[1], source = state.layers.find(l => l.id === id), copy = state.active()
    return {
      correct: copy?.id !== id && copy?.frameId === dest.id && copy?.type === source?.type &&
        Math.abs(copy.x - dest.x - (source.x - frames[0].x)) < 0.01 &&
        Math.abs(copy.y - dest.y - (source.y - frames[0].y)) < 0.01,
      selected: state.selectedIds.includes(copy?.id),
    }
  })
  ok('duplicate to next artboard preserves board-local coordinates', board.correct && board.selected)

  const clipping = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Clip by dropping', width: 320, height: 240, background: '#fff' })
    const host = s.addShape('rect', 40, 40, 80, 90, { fill: '#a0a0a0' })
    const cut = s.addShape('ellipse', 140, 50, 70, 70, { fill: '#24abf9' })
    s.clipLayerOnto(cut, host)
    const cs = window.__voidEditor.getState()
    const index = cs.layers.findIndex(x => x.id === host)
    const clipped = cs.layers[index + 1]?.id === cut && cs.layers[index + 1]?.clipId === host
    cs.undo()
    const undone = window.__voidEditor.getState().layers.find(x => x.id === cut)?.clipId == null
    window.__voidEditor.getState().redo()
    const redone = window.__voidEditor.getState().layers.find(x => x.id === cut)?.clipId === host
    return { clipped, undone, redone }
  })
  ok('layer clipping is one undoable step', clipping.clipped && clipping.undone && clipping.redone)

  // Use a real modifier click on the canvas, not a direct store call.
  const overlapping = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Overlapping layers', width: 320, height: 240, background: '#fff' })
    const below = s.addShape('rect', 35, 35, 105, 95, { fill: '#ff9900' })
    const above = s.addShape('rect', 45, 45, 105, 95, { fill: '#1144dd' })
    s.setActive(above); s.setTool('move'); s.setOption('autoSelect', true)
    return { below, above }
  })
  // Stage restores the canvas view after opening a new document. Let that
  // settle, then set and read the actual pan/zoom used by the pointer handlers.
  await page.waitForTimeout(350)
  const cursor = await page.evaluate(ids => {
    const s = window.__voidEditor.getState()
    s.setView({ zoom: 1, panX: 110, panY: 110 })
    const view = window.__voidEditor.getState().view
    const box = document.querySelector('[aria-label="Design canvas"]').getBoundingClientRect()
    return { ...ids, x: box.left + view.panX + 65 * view.zoom, y: box.top + view.panY + 65 * view.zoom }
  }, overlapping)
  await page.keyboard.down('Control')
  await page.mouse.click(cursor.x, cursor.y)
  await page.keyboard.up('Control')
  let chosen = await page.evaluate(() => window.__voidEditor.getState().activeId)
  if (chosen !== cursor.below) console.log('Ctrl-click debug', { chosen, cursor, view: await page.evaluate(() => window.__voidEditor.getState().view) })
  ok('Ctrl-click selects underlying layer', chosen === cursor.below)
  await page.keyboard.down('Control')
  await page.mouse.click(cursor.x, cursor.y)
  await page.keyboard.up('Control')
  chosen = await page.evaluate(() => window.__voidEditor.getState().activeId)
  ok('second Ctrl-click cycles back to top layer', chosen === cursor.above)

  const colour = await page.evaluate(() => {
    const host = document.querySelector('[aria-label="Design canvas"]')
    const p = host.getBoundingClientRect(), view = window.__voidEditor.getState().view
    const dt = new DataTransfer()
    dt.setData('text/vc-color', '#22dd77')
    const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: p.left + view.panX + 65 * view.zoom, clientY: p.top + view.panY + 65 * view.zoom })
    host.dispatchEvent(event)
    const s = window.__voidEditor.getState(), l = s.layers.find(x => x.id === s.activeId)
    return { recoloured: l?.type === 'shape' && l.fill === '#22dd77', active: l?.id, fill: l?.type === 'shape' ? l.fill : null, view }
  })
  if (!colour.recoloured) console.log('Drop debug', colour)
  ok('dropping swatch recolours exact shape layer', colour.recoloured)
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
