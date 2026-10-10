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

  const board = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Artboard relative position', width: 320, height: 240, background: '#fff' })
    s.addFrame({ name: 'Story', width: 360, height: 640 })
    const frames = s.doc.frames
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

  // Use a real modifier click on the canvas, not a direct store call.
  const cursor = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Overlapping layers', width: 320, height: 240, background: '#fff' })
    const below = s.addShape('rect', 35, 35, 105, 95, { fill: '#ff9900' })
    const above = s.addShape('rect', 45, 45, 105, 95, { fill: '#1144dd' })
    s.setActive(above); s.setTool('move'); s.setOption('autoSelect', true)
    s.setView({ zoom: 1, panX: 110, panY: 110 })
    const box = document.querySelector('[aria-label="Design canvas"]').getBoundingClientRect()
    return { below, above, x: box.left + 110 + 65, y: box.top + 110 + 65 }
  })
  await page.keyboard.down('Control')
  await page.mouse.click(cursor.x, cursor.y)
  await page.keyboard.up('Control')
  ok('Ctrl-click selects underlying layer', await page.evaluate(id => window.__voidEditor.getState().activeId === id, cursor.below))
  await page.keyboard.down('Control')
  await page.mouse.click(cursor.x, cursor.y)
  await page.keyboard.up('Control')
  ok('second Ctrl-click cycles back to top layer', await page.evaluate(id => window.__voidEditor.getState().activeId === id, cursor.above))

  const colour = await page.evaluate(() => {
    const host = document.querySelector('[aria-label="Design canvas"]')
    const p = host.getBoundingClientRect(), dt = new DataTransfer()
    dt.setData('text/vc-color', '#22dd77')
    const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: p.left + 175, clientY: p.top + 175 })
    host.dispatchEvent(event)
    const s = window.__voidEditor.getState(), l = s.layers.find(x => x.id === s.activeId)
    return l?.type === 'shape' && l.fill === '#22dd77'
  })
  ok('dropping swatch recolours exact shape layer', colour)
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
