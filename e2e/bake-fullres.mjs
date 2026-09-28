// Baked pixels match the export: Merge down, Flatten and Stamp visible run filter layers at document size, not
// from the 1200 px preview. And a flattened PSD (no layer records, only the composite picture) opens as one layer.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const b = await chromium.launch(); const errs = []
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
p.on('pageerror', e => errs.push(e.message))
let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

await p.goto(BASE + '/editor'); await p.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })

// A 2400 px grey square under a Halftone filter at Dot Size 44. The preview works at 1200 px, where the cell is
// floor(44 / 8) = 5 px, drawn at 10 px in the document. At document size the setting is scaled by 2: an 11 px cell.
// So a baked row of 2400 px holds about 218 dots, not 240.
const setup = () => p.evaluate(() => {
  const S = window.__voidEditor
  S.getState().newDoc({ name: 'Bake test', width: 2400, height: 2400, background: '#ffffff' })
  const c = document.createElement('canvas'); c.width = 2400; c.height = 2400
  const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 2400, 2400)
  S.getState().addLayer({ id: 'grey', name: 'Grey', type: 'raster', canvas: c, x: 0, y: 0, visible: true, locked: false, opacity: 1, blend: 'source-over', scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: false, rev: 1 }, 'Add grey')
  S.getState().addAdjustment('voidEffect', 'halftone')
  const fx = S.getState().layers[S.getState().layers.length - 1]
  S.getState().updateLayer(fx.id, { effectParams: { ...fx.effectParams, scale: 44, intensity: 50 } })
  return fx.id
})
// Dark runs along the top row of the top layer's pixels: the halftone centres its dots on the cell corners, so row 0 runs through them.
const dotsInRow = () => p.evaluate(() => {
  const S = window.__voidEditor.getState()
  const l = S.layers[S.layers.length - 1]
  const x = l.canvas.getContext('2d'); const d = x.getImageData(0, 0, l.canvas.width, 1).data
  let runs = 0, dark = false
  for (let i = 0; i < d.length; i += 4) { const v = d[i] < 128 && d[i + 3] > 0; if (v && !dark) runs++; dark = v }
  return { runs, w: l.canvas.width, type: l.type }
})

const fx = await setup()
await p.evaluate(id => window.__voidEditor.getState().mergeDown(id), fx)
let r = await dotsInRow()
ok('Merge down bakes the filter at document size', r.type === 'raster' && r.w === 2400 && r.runs >= 210 && r.runs <= 226, JSON.stringify(r))

await setup()
await p.evaluate(() => { const S = window.__voidEditor.getState(); const ids = S.layers.map(l => l.id); window.__voidEditor.setState({ selectedIds: ids }) })
await p.keyboard.press('Control+Alt+Shift+E')
await p.waitForTimeout(400)
r = await dotsInRow()
ok('Stamp visible bakes the filter at document size', r.runs >= 210 && r.runs <= 226, JSON.stringify(r))

// A board exported on its own: a filter on a board runs over that board's area, on the canvas and in export alike, so
// its dots are scaled from the board's long side, however many boards sit beside it. Adding a second board must not
// change the first board's look.
const board = await p.evaluate(() => {
  const S = window.__voidEditor
  S.getState().newDoc({ name: 'Boards test', width: 1200, height: 1200, background: '#ffffff' })
  const c = document.createElement('canvas'); c.width = 1200; c.height = 1200
  const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 1200, 1200)
  S.getState().addLayer({ id: 'grey2', name: 'Grey', type: 'raster', canvas: c, x: 0, y: 0, visible: true, locked: false, opacity: 1, blend: 'source-over', scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: false, rev: 1 }, 'Add grey')
  S.getState().addFrame({ name: 'Second', width: 1200, height: 1200 })
  const first = S.getState().doc.frames[0]
  S.getState().setActiveFrame(first.id)
  S.setState({ activeId: 'grey2', selectedIds: ['grey2'] })
  S.getState().addAdjustment('voidEffect', 'halftone')
  const fx = S.getState().layers[S.getState().layers.length - 1]
  S.getState().updateLayer(fx.id, { effectParams: { ...fx.effectParams, scale: 44, intensity: 50 }, frameId: first.id })
  const d = S.getState().doc
  return { long: Math.max(d.width, d.height), frames: d.frames.length }
})
await p.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'export' }))); await p.waitForTimeout(1200)
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download PNG")')])
const png = await (await import('node:fs')).promises.readFile(await dl.path())
const exported = await p.evaluate(async b64 => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
  const x = c.getContext('2d'); x.drawImage(bmp, 0, 0)
  const d = x.getImageData(0, 0, c.width, 1).data
  let runs = 0, dark = false
  for (let i = 0; i < d.length; i += 4) { const v = d[i] < 128; if (v && !dark) runs++; dark = v }
  return { w: c.width, runs }
}, png.toString('base64'))
// Expected cell: floor(44 x board / 1200 / 8) px with the board 1200 px: a 5 px cell, 240 dots.
const cell = Math.floor((44 * 1200 / 1200) / 8), want = Math.ceil(1200 / cell)
ok('a board exports with dots scaled like the preview', board.frames === 2 && exported.w === 1200 && Math.abs(exported.runs - want) <= 3, JSON.stringify({ board, exported, want }))

// A flat PSD: header, empty colour mode data, image resources and layer sections, then raw planar RGB.
const W = 64, H = 48
const head = Buffer.alloc(26); head.write('8BPS', 0); head.writeUInt16BE(1, 4); head.writeUInt16BE(3, 12); head.writeUInt32BE(H, 14); head.writeUInt32BE(W, 18); head.writeUInt16BE(8, 22); head.writeUInt16BE(3, 24)
const zero = Buffer.alloc(4)
const planes = Buffer.concat([Buffer.alloc(W * H, 220), Buffer.alloc(W * H, 30), Buffer.alloc(W * H, 40)])
const psd = Buffer.concat([head, zero, zero, zero, Buffer.from([0, 0]), planes])
await p.goto(BASE + '/editor'); await p.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })
await (await p.$('input[type=file]')).setInputFiles({ name: 'flat.psd', mimeType: 'image/vnd.adobe.photoshop', buffer: psd })
await p.waitForFunction(() => window.__voidEditor.getState().doc?.name === 'flat', null, { timeout: 15000 }).catch(() => {})
const flat = await p.evaluate(() => {
  const S = window.__voidEditor.getState(); const l = S.layers[0]
  if (!S.doc || !l || l.type !== 'raster') return { n: S.layers.length, doc: S.doc?.name }
  const px = l.canvas.getContext('2d').getImageData(32, 24, 1, 1).data
  return { n: S.layers.length, w: S.doc.width, h: S.doc.height, px: [px[0], px[1], px[2]] }
})
ok('a flattened PSD opens as one layer', flat.n === 1 && flat.w === 64 && flat.h === 48 && Math.abs(flat.px[0] - 220) < 3 && Math.abs(flat.px[1] - 30) < 3, JSON.stringify(flat))

ok('no page errors', errs.length === 0, errs.join(' | '))
console.log(`\n${pass} passed, ${fail} failed`)
await b.close()
process.exit(fail ? 1 : 0)
