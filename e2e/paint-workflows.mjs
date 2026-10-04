// Real pointer input and pixel assertions for selection, mask and retouch workflows.
import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []; p.on('pageerror', e => errors.push(e.message))
const ok = (name, value) => { console.log(`${value ? 'PASS' : 'FAIL'} ${name}`); if (!value) process.exitCode = 1 }
const E = (f, a) => p.evaluate(f, a)
await p.goto((process.env.BASE || 'http://localhost:3123') + '/editor')
await p.waitForFunction(() => window.__voidEditor && window.__vcRun)
const fresh = async () => {
  await E(() => { const s = window.__voidEditor.getState(); s.newDoc({ name: 'Paint QA', width: 400, height: 400, background: '#ffffff' }); s.setView({ zoom: 1, panX: 100, panY: 100 }); s.setFg('#ff0000'); s.setOption('size', 100); s.setOption('hardness', 1); s.setOption('smoothing', 0); s.setOption('opacity', 1); s.setOption('flow', 1) })
  await p.waitForTimeout(80)
}
const point = (x, y) => E(([x, y]) => { const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(), v = window.__voidEditor.getState().view; return { x: r.left + v.panX + x * v.zoom, y: r.top + v.panY + y * v.zoom } }, [x, y])
const dab = async (x, y, move = false) => { const a = await point(x, y); await p.mouse.move(a.x, a.y); await p.mouse.down(); if (move) await p.mouse.move(a.x + 50, a.y, { steps: 20 }); await p.mouse.up(); await p.waitForTimeout(80) }
const alpha = (x, y, mask = false) => E(([x, y, mask]) => { const l = window.__voidEditor.getState().active(); return (mask ? l.mask : l.canvas).getContext('2d').getImageData(x, y, 1, 1).data[3] }, [x, y, mask])
const leaks = () => E(() => { const s = window.__voidEditor.getState(), a = s.active().canvas.getContext('2d').getImageData(0, 0, 400, 400).data, m = s.selection.getContext('2d').getImageData(0, 0, 400, 400).data; let leaks = 0, painted = 0; for (let i = 3; i < a.length; i += 4) { if (a[i]) painted++; if (!m[i] && a[i]) leaks++ } return { leaks, painted } })
const rectangleSelection = async (soft = false) => E(soft => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); x.fillStyle = soft ? 'rgba(255,255,255,0.5)' : '#fff'; x.fillRect(100, 100, 100, 100); window.__voidEditor.getState().setSelection(c) }, soft)

// The screenshot's exact sequence: load text pixels, new layer, oversized brush dab and drag.
await fresh()
await E(() => { const s = window.__voidEditor.getState(); s.addText(70, 100); s.updateLayer(window.__voidEditor.getState().activeId, { text: '100%', fontSize: 100, fontFamily: 'sans-serif' }); window.__voidEditor.setState({ editingTextId: null }); window.__vcRun('sel.layer'); s.addBlank(); s.setOption('size', 191); s.setTool('brush') })
await dab(160, 145)
let v = await leaks(); ok('text selection contains a single oversized dab', v.leaks === 0 && v.painted > 0)
await dab(180, 145, true)
v = await leaks(); ok('text selection contains the whole dragged stroke', v.leaks === 0 && v.painted > 0)
await p.screenshot({ path: '/tmp/voidcanvas-selection-qa.png' })
await E(() => window.__voidEditor.getState().undo())
ok('undo retains selection and the first contained stroke', (await leaks()).leaks === 0)
await E(() => window.__voidEditor.getState().redo())
ok('redo retains contained paint', (await leaks()).leaks === 0)

// First dab is constrained in the live preview, before pointer-up.
await fresh(); await rectangleSelection()
await E(() => { const s = window.__voidEditor.getState(); s.addBlank(); s.setTool('brush') })
let a = await point(100, 150); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.waitForTimeout(80)
let pixel = await E(() => window.__vcPixels({ x: 80, y: 150, w: 1, h: 1 }))
ok('live first dab never previews outside the selection', pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255)
await p.mouse.up(); ok('committed first dab matches preview', await alpha(80, 150) === 0)

await fresh(); await rectangleSelection(true)
await E(() => { const s = window.__voidEditor.getState(); s.addBlank(); s.setTool('brush') })
await dab(125, 150, true)
ok('soft selection retains half coverage after many pointer moves', Math.abs(await alpha(125, 150) - 128) <= 2)
const historyBeforeOutside = await E(() => window.__voidEditor.getState().history.length)
await dab(280, 280); ok('click entirely outside selection adds no paint', await alpha(280, 280) === 0)
ok('click entirely outside selection adds no undo step', await E(() => window.__voidEditor.getState().history.length) === historyBeforeOutside)

// Masks preserve live text and vector geometry. Brush coordinates are converted into local mask space.
for (const kind of ['shape', 'text']) {
  await fresh()
  await E(kind => { const s = window.__voidEditor.getState(); if (kind === 'shape') s.addShape('rect', 100, 100, 160, 100, { fill: '#ff0000' }); else { s.addText(100, 100); s.updateLayer(window.__voidEditor.getState().activeId, { text: 'MASK', fontSize: 65, fontFamily: 'sans-serif' }) } window.__voidEditor.setState({ editingTextId: null }); s.updateLayer(window.__voidEditor.getState().activeId, { rotation: 0.4, scaleX: 1.2, scaleY: 1.2 }); s.addMask(window.__voidEditor.getState().activeId); s.setTool('brush'); s.setFg('#000000'); s.setOption('size', 30) }, kind)
  const center = await E(() => { const s = window.__voidEditor.getState(), l = s.active(), z = window.__vcLayerSize(l); return { x: l.x + z.w * l.scaleX / 2, y: l.y + z.h * l.scaleY / 2, lx: Math.floor(z.w / 2), ly: Math.floor(z.h / 2), x0: l.x, rotation: l.rotation } })
  await dab(center.x, center.y)
  ok(`${kind} mask: black hides at the transformed pointer location`, await alpha(center.lx, center.ly, true) === 0)
  ok(`${kind} mask: object stays editable and transform stays intact`, await E(([kind, c]) => { const l = window.__voidEditor.getState().active(); return l.type === kind && l.x === c.x0 && l.rotation === c.rotation && l.scaleX === 1.2 }, [kind, center]))
  await E(() => window.__voidEditor.getState().setFg('#808080')); await dab(center.x, center.y)
  ok(`${kind} mask: grey makes partial visibility`, Math.abs(await alpha(center.lx, center.ly, true) - 128) <= 2)
  await E(() => window.__voidEditor.getState().setFg('#ffffff')); await dab(center.x, center.y)
  ok(`${kind} mask: white reveals again`, await alpha(center.lx, center.ly, true) === 255)
  await E(() => window.__voidEditor.getState().setTool('eraser')); await dab(center.x, center.y)
  ok(`${kind} mask: eraser hides without rasterizing`, await alpha(center.lx, center.ly, true) === 0)
}

// Alpha lock applies to previews, fills and erasure.
await fresh()
await E(() => { const s = window.__voidEditor.getState(); s.addBlank(); const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#00ff00'; x.fillRect(100, 100, 100, 100); s.updateLayer(window.__voidEditor.getState().activeId, { canvas: c, lockAlpha: true }); s.setTool('brush') })
a = await point(100, 150); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.waitForTimeout(80)
pixel = await E(() => window.__vcPixels({ x: 80, y: 150, w: 1, h: 1 }))
ok('alpha lock preview does not grow beyond existing pixels', pixel[1] === 255)
await p.mouse.up(); ok('alpha lock commit does not grow beyond existing pixels', await alpha(80, 150) === 0)
await E(() => window.__voidEditor.getState().fillSelection('#0000ff'))
ok('store fill respects alpha lock', await alpha(80, 150) === 0 && await alpha(150, 150) === 255)
await E(() => window.__voidEditor.getState().setTool('fill')); await dab(280, 280)
ok('bucket fill respects alpha lock', await alpha(280, 280) === 0)
await E(() => window.__voidEditor.getState().setTool('eraser')); await dab(150, 150)
ok('eraser respects alpha lock', await alpha(150, 150) === 255)

// Locked type and adjustments cannot silently create paint layers or masks.
for (const kind of ['text', 'adjustment']) {
  await fresh()
  await E(kind => { const s = window.__voidEditor.getState(); if (kind === 'text') s.addText(100, 100); else s.addAdjustment('invert'); window.__voidEditor.setState({ editingTextId: null }); s.updateLayer(window.__voidEditor.getState().activeId, { locked: true }); s.setTool('brush') }, kind)
  await dab(150, 150)
  ok(`${kind}: locked paint makes no layer or mask`, await E(() => { const s = window.__voidEditor.getState(); return s.layers.length === 1 && !s.active().mask }))
}

// Clone into a separate layer samples visible content instead of an empty destination.
await fresh()
await E(() => { const s = window.__voidEditor.getState(); s.addShape('rect', 50, 50, 80, 80, { fill: '#00ff00' }); s.addBlank(); s.setTool('clone'); s.setOption('size', 30); s.setOption('sampleAll', true); window.__voidEditor.setState({ cloneSource: { x: 90, y: 90 } }) })
await dab(260, 260)
ok('clone sample all layers paints onto an empty retouch layer', await E(() => { const px = window.__voidEditor.getState().active().canvas.getContext('2d').getImageData(260, 260, 1, 1).data; return px[1] === 255 && px[3] === 255 }))
await fresh(); ok('clone source resets for a new document', await E(() => window.__voidEditor.getState().cloneSource === null))

// Vector path painting uses the same pixel selection boundary.
for (const action of ['path.fill', 'path.stroke', 'path.strokeTaper']) {
  await fresh(); await rectangleSelection()
  await E(() => { const s = window.__voidEditor.getState(); s.addBlank(); const node = (x, y) => ({ x, y, inX: x, inY: y, outX: x, outY: y }); s.setDoc({ paths: [{ id: 'qa', name: 'QA', subpaths: [{ closed: true, nodes: [node(50, 150), node(250, 150), node(250, 250), node(50, 250)] }] }] }); window.__voidEditor.setState({ activePathId: 'qa' }) })
  await E(action => window.__vcRun(action), action)
  v = await leaks(); ok(`${action} respects selection`, v.leaks === 0 && v.painted > 0)
}
// Healing and the removal fallback may feather their patches, but the selection remains the final boundary.
for (const tool of ['heal', 'remove']) {
  await fresh(); await rectangleSelection()
  await E(tool => {
    const s = window.__voidEditor.getState(); s.addBlank()
    const c = document.createElement('canvas'); c.width = c.height = 400
    const x = c.getContext('2d'); x.fillStyle = '#339955'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#aa2255'; x.fillRect(90, 138, 40, 24)
    s.updateLayer(window.__voidEditor.getState().activeId, { canvas: c }); s.setOption('size', 30); s.setTool(tool)
    window.__paintBefore = Array.from(x.getImageData(0, 0, 400, 400).data)
    window.confirm = () => false // Exercise the existing local patch fallback without downloading a model.
  }, tool)
  await dab(105, 150); await p.waitForFunction(()=>window.__voidEditor.getState().layers.length===2)
  const changes = await E(async () => {
    const s = window.__voidEditor.getState(), now = await window.__vcPixels({x:0,y:0,w:400,h:400}), sel = s.selection.getContext('2d').getImageData(0, 0, 400, 400).data
    let inside = 0, outside = 0
    for (let i = 0; i < now.length; i += 4) if (now[i] !== window.__paintBefore[i] || now[i + 1] !== window.__paintBefore[i + 1] || now[i + 2] !== window.__paintBefore[i + 2]) { if (sel[i + 3]) inside++; else outside++ }
    return { inside, outside }
  })
  ok(`${tool} changes pixels inside the selection`, changes.inside > 0)
  ok(`${tool} leaves every pixel outside the selection unchanged`, changes.outside === 0)
}
ok('no page errors', errors.length === 0)
if (errors.length) console.log(errors)
await b.close()
