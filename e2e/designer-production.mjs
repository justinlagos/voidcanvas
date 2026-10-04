import { chromium } from 'playwright'
import { existsSync, writeFileSync } from 'node:fs'
import { writePsdBuffer } from 'ag-psd'
const browser = await chromium.launch(),
  p = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = []
p.on('pageerror', (e) => errors.push(e.message))
const E = (f, a) => p.evaluate(f, a),
  run = (id) => E((id) => window.__vcRun(id), id)
const ok = (name, value) => {
  console.log(`${value ? 'PASS' : 'FAIL'} ${name}`)
  if (!value) process.exitCode = 1
}
await p.goto((process.env.BASE ?? 'http://localhost:3123') + '/editor')
await p.waitForFunction(() => window.__voidEditor && window.__vcRun)
const fresh = async (background = null) => {
  await E((background) => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Designer production QA', width: 320, height: 240, background })
    s.setView({ zoom: 1, panX: 100, panY: 100 })
  }, background)
  await p.waitForTimeout(120)
}
const pixels = (rect) => E((r) => window.__vcPixels(r), rect)
// Multiple selected text regions on repeating diagonal texture, matching the reported design.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addBlank()
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 240
  const x = c.getContext('2d'),
    im = x.createImageData(320, 240)
  for (let y = 0; y < 240; y++)
    for (let xx = 0; xx < 320; xx++)
      im.data.set((xx + y) % 12 < 3 ? [135, 24, 35, 255] : [90, 13, 26, 255], (y * 320 + xx) * 4)
  x.putImageData(im, 0, 0)
  window.__clean = Array.from(im.data)
  const m = document.createElement('canvas')
  m.width = 320
  m.height = 240
  const mx = m.getContext('2d')
  mx.fillStyle = '#fff'
  for (const b of [
    [75, 55, 75, 20],
    [80, 115, 95, 20],
  ]) {
    mx.fillRect(...b)
    x.fillStyle = '#ffe614'
    x.fillRect(...b)
  }
  window.__original = c
  window.__sourceId = s.active().id
  s.updateLayer(s.active().id, { canvas: c })
  s.setSelection(m)
})
await run('retouch.selection')
await p.getByRole('button', { name: 'Apply repair', exact: true }).waitFor()
await p.waitForFunction(
  () => !document.querySelector('[role="status"]')?.textContent?.includes('Finding clean'),
)
await p.getByRole('button', { name: 'Apply repair', exact: true }).click()
await p.waitForFunction(() => window.__voidEditor.getState().layers.length === 2)
ok(
  'repair produces a separate layer and leaves source identity intact',
  await E(() => {
    const s = window.__voidEditor.getState()
    return s.layers[0].canvas === window.__original && s.layers[1].name === 'Remove selected area patch'
  }),
)
ok(
  'two selected text areas repaired with exact repeating texture; no outside changes',
  await E(async () => {
    const s = window.__voidEditor.getState(),
      a = await window.__vcPixels({ x: 0, y: 0, w: 320, h: 240 }),
      m = s.selection.getContext('2d').getImageData(0, 0, 320, 240).data,
      b = window.__original.getContext('2d').getImageData(0, 0, 320, 240).data
    return a.every((v, i) => v === (m[(i >> 2) * 4 + 3] ? window.__clean[i] : b[i]))
  }),
)
await run('edit.undo')
ok('repair undo removes only patch', await E(() => window.__voidEditor.getState().layers.length === 1))
await run('edit.redo')
// Draw Inside creates live clip relationships for painting and vectors.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addShape('ellipse', 80, 60, 100, 100)
  window.__host = s.active().id
})
await run('draw.inside')
await E(() => {
  const s = window.__voidEditor.getState()
  s.addBlank()
  const c = s.active().canvas.getContext('2d')
  c.fillStyle = '#f00'
  c.fillRect(0, 0, 320, 240)
  s.updateLayer(s.active().id, { canvas: s.active().canvas }, 'Test paint')
})
ok(
  'new paint inherits Draw Inside host',
  await E(() => window.__voidEditor.getState().active().clipId === window.__host),
)
let a = await pixels({ x: 0, y: 0, w: 320, h: 240 })
ok(
  'Draw Inside clips pixels outside ellipse',
  a[(20 * 320 + 20) * 4 + 3] === 0 && a[(110 * 320 + 130) * 4] === 255,
)
await E(() => window.__voidEditor.getState().updateLayer(window.__host, { x: 160 }, 'Move host'))
a = await pixels({ x: 0, y: 0, w: 320, h: 240 })
ok('live clip follows moved host', a[(110 * 320 + 100) * 4 + 3] === 0 && a[(110 * 320 + 210) * 4] === 255)
await E(() => window.__voidEditor.getState().addShape('rect', 0, 0, 320, 240))
ok(
  'new vector inherits same host',
  await E(() => window.__voidEditor.getState().active().clipId === window.__host),
)
await run('draw.exit')
ok('Draw Inside has explicit exit', await E(() => window.__voidEditor.getState().drawInsideId === null))
ok('Draw Inside maintains document invariants', await E(() => window.__vcCheck().length === 0))
// Editable embedded text source and nested edit/return.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addText(60, 80)
  s.updateLayer(s.active().id, { text: 'Editable', fontFamily: 'sans-serif', fontSize: 30 })
  window.__voidEditor.setState({ editingTextId: null })
  window.__parentId = s.doc.id
  window.__smartLayer = s.active().id
})
await run('smart.convert')
await p.waitForFunction(() => !!window.__voidEditor.getState().active()?.smart)
ok(
  'smart conversion embeds portable source',
  await E(() => window.__voidEditor.getState().active().smart.contents instanceof Blob),
)
ok(
  'smart painting requires explicit rasterization',
  await E(() => window.__voidEditor.getState().ensurePaintable() === null),
)
await run('smart.edit')
await p.waitForFunction(() => !!window.__voidEditor.getState().doc?.smartParent)
ok(
  'nested contents retain editable text',
  await E(() => window.__voidEditor.getState().active().type === 'text'),
)
await E(() => {
  const s = window.__voidEditor.getState()
  s.updateLayer(s.active().id, { text: 'Changed' }, 'Change smart source')
})
await run('smart.apply')
await p.waitForFunction(() => window.__voidEditor.getState().doc?.id === window.__parentId)
await p.waitForTimeout(200)
await run('smart.edit')
await p.waitForFunction(() => !!window.__voidEditor.getState().doc?.smartParent)
ok(
  'saved smart contents reopen with edited text',
  await E(() => window.__voidEditor.getState().active().text === 'Changed'),
)
await run('smart.apply')
await p.waitForFunction(() => window.__voidEditor.getState().doc?.id === window.__parentId)
// Sampling on an empty destination distinguishes lower artwork from layers above.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addBlank()
  let c = s.active().canvas.getContext('2d')
  c.fillStyle = '#0f0'
  c.fillRect(0, 0, 320, 240)
  s.updateLayer(s.active().id, { canvas: s.active().canvas })
  s.addBlank()
  window.__emptyRetouch = s.active().id
  s.addBlank()
  c = s.active().canvas.getContext('2d')
  c.fillStyle = '#00f'
  c.fillRect(0, 0, 320, 240)
  s.updateLayer(s.active().id, { canvas: s.active().canvas })
  s.setActive(window.__emptyRetouch)
  const m = document.createElement('canvas')
  m.width = 320
  m.height = 240
  m.getContext('2d').fillRect(100, 100, 20, 20)
  s.setSelection(m)
})
await run('retouch.selection')
await p.getByRole('button', { name: 'Apply repair', exact: true }).waitFor()
await p.waitForFunction(
  () => !document.querySelector('[role="status"]')?.textContent?.includes('Finding clean'),
)
const previewPixel = () =>
  p
    .getByRole('dialog')
    .locator('canvas')
    .evaluate((c) => Array.from(c.getContext('2d').getImageData(10, 10, 1, 1).data))
let sample = await previewPixel()
ok('all-layer healing samples artwork above an empty destination', sample[2] === 255 && sample[1] === 0)
await p.getByLabel('Repair sample').selectOption('below')
await p.waitForFunction(
  () => !document.querySelector('[role="status"]')?.textContent?.includes('Finding clean'),
)
sample = await previewPixel()
ok('current-and-below healing excludes artwork above destination', sample[1] === 255 && sample[2] === 0)
await p.getByLabel('Repair sample').selectOption('current')
await p.waitForFunction(
  () => !document.querySelector('[role="status"]')?.textContent?.includes('Finding clean'),
)
ok(
  'current-only empty layer refuses a fabricated repair',
  await p.getByRole('button', { name: 'Apply repair', exact: true }).isDisabled(),
)
await p.getByRole('button', { name: 'Cancel', exact: true }).click()
// Explicit scale/fixed policies remain predictable as live text geometry changes.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addText(20, 40)
  s.updateLayer(s.active().id, { text: 'Mask', fontSize: 30, fontFamily: 'sans-serif' })
  window.__voidEditor.setState({ editingTextId: null })
  const a = window.__vcLayerSize(s.active()),
    m = document.createElement('canvas')
  m.width = a.w
  m.height = a.h
  m.getContext('2d').fillRect(0, 0, m.width / 2, m.height)
  s.updateLayer(s.active().id, { mask: m, maskResize: 'scale' })
  window.__maskStart = [m.width, m.height]
  s.updateLayer(s.active().id, { fontSize: 60 })
})
ok(
  'linked scale policy resizes mask with type dimensions',
  await E(() => {
    const l = window.__voidEditor.getState().active(),
      b = window.__vcLayerSize(l)
    return (
      l.mask.width === Math.round(b.w) &&
      l.mask.height === Math.round(b.h) &&
      l.mask.width > window.__maskStart[0]
    )
  }),
)
await E(() => {
  const s = window.__voidEditor.getState(),
    l = s.active()
  window.__fixedSize = [l.mask.width, l.mask.height]
  s.updateLayer(l.id, { maskResize: 'fixed' })
  s.updateLayer(l.id, { fontSize: 30 })
})
ok(
  'fixed policy retains mask pixel dimensions',
  await E(() => {
    const m = window.__voidEditor.getState().active().mask
    return m.width === window.__fixedSize[0] && m.height === window.__fixedSize[1]
  }),
)

// Tip presets save all brush dynamics and restore from their named button.
await run('brush.presets')
await p.getByRole('button', { name: 'Chalk', exact: true }).click()
await p.getByLabel('Preset name').fill('QA Chalk')
await p.getByRole('button', { name: 'Save preset', exact: true }).click()
await p.getByRole('button', { name: 'Done', exact: true }).click()
await E(() => window.__voidEditor.getState().setOption('tip', 'round'))
await run('brush.presets')
await p.getByRole('button', { name: 'QA Chalk', exact: true }).click()
ok(
  'saved preset restores textured tip and spacing',
  await E(() => {
    const o = window.__voidEditor.getState().options
    return o.tip === 'chalk' && o.spacing === 0.08
  }),
)
await p.getByRole('button', { name: 'Done', exact: true }).click()
// Unlinked mask stationary in document space as the artwork moves.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addShape('rect', 50, 50, 120, 100)
  const m = document.createElement('canvas')
  m.width = 120
  m.height = 100
  m.getContext('2d').fillRect(0, 0, 60, 100)
  s.updateLayer(s.active().id, { mask: m, maskEnabled: true })
})
await run('mask.settings')
await p.getByRole('checkbox', { name: 'Linked to layer' }).uncheck()
await p.getByRole('button', { name: 'Apply', exact: true }).click()
await E(() =>
  window.__voidEditor
    .getState()
    .updateLayer(window.__voidEditor.getState().active().id, { x: 80 }, 'Move masked layer'),
)
a = await pixels({ x: 0, y: 0, w: 320, h: 240 })
ok(
  'unlinked mask stays stationary when host moves',
  a[(80 * 320 + 90) * 4 + 3] === 255 && a[(80 * 320 + 130) * 4 + 3] === 0,
)
await run('mask.settings')
await p.getByRole('checkbox', { name: 'Linked to layer' }).check()
await p.getByRole('button', { name: 'Apply', exact: true }).click()
const after = await pixels({ x: 0, y: 0, w: 320, h: 240 })
ok('relink keeps mask appearance', JSON.stringify(a) === JSON.stringify(after))
// Pattern rendering uses the same styles engine as export.
await fresh()
await E(() => window.__voidEditor.getState().addShape('rect', 50, 50, 140, 120))
await run('style.patternOverlay')
await p.getByRole('button', { name: 'OK', exact: true }).click()
a = await pixels({ x: 50, y: 50, w: 140, h: 120 })
ok('pattern overlay renders repeated tile', new Set(a.filter((_, i) => i % 4 === 0)).size > 1)
const parity = await E(() => window.__vcParity())
ok('pattern preview/export parity', parity.mean < 1)
// Reversible deformation preview Apply/Cancel and source persistence.
await fresh()
await E(() => {
  const s = window.__voidEditor.getState()
  s.addBlank()
  const x = s.active().canvas.getContext('2d')
  x.fillStyle = '#fff'
  x.fillRect(0, 0, 320, 240)
  x.fillStyle = '#f00'
  x.fillRect(100, 60, 50, 120)
  s.updateLayer(s.active().id, { canvas: s.active().canvas })
  window.__liquifyOriginal = s.active().canvas
})
await run('filter.liquify')
await p.getByLabel('Liquify preview').waitFor()
await p.waitForTimeout(300)
let rect = await p.getByLabel('Liquify preview').boundingBox()
await p.mouse.move(rect.x + 125, rect.y + 120)
await p.mouse.down()
await p.mouse.move(rect.x + 155, rect.y + 120, { steps: 6 })
await p.mouse.up()
await p.getByRole('button', { name: 'Cancel', exact: true }).click()
ok(
  'Liquify cancel changes no document pixels',
  await E(() => window.__voidEditor.getState().active().canvas === window.__liquifyOriginal),
)
await run('filter.liquify')
await p.waitForTimeout(300)
rect = await p.getByLabel('Liquify preview').boundingBox()
await p.mouse.move(rect.x + 125, rect.y + 120)
await p.mouse.down()
await p.mouse.move(rect.x + 155, rect.y + 120, { steps: 6 })
await p.mouse.up()
await p.getByRole('button', { name: 'Apply', exact: true }).click()
await p.waitForFunction(() => !!window.__voidEditor.getState().active()?.liquify)
ok(
  'Liquify preserves original and reversible dabs',
  await E(() => {
    const l = window.__voidEditor.getState().active()
    return (
      l.liquify.source === window.__liquifyOriginal &&
      l.liquify.strokes.length > 0 &&
      l.canvas !== l.liquify.source
    )
  }),
)
await run('filter.liquify')
await p.getByRole('button', { name: 'Reset', exact: true }).click()
await p.getByRole('button', { name: 'Apply', exact: true }).click()
await p.waitForFunction(() => window.__voidEditor.getState().active()?.liquify?.strokes.length === 0)
ok(
  'Liquify reset restores original pixels',
  await E(() => {
    const l = window.__voidEditor.getState().active()
    return l.canvas.toDataURL() === l.liquify.source.toDataURL()
  }),
)
// Real ICC CMYK transform and an independently decoded print file.
const profile = process.env.CMYK_PROFILE ?? '/usr/share/color/icc/ghostscript/default_cmyk.icc'
if (existsSync(profile)) {
  await run('view.proof')
  await p.getByLabel('Printer ICC profile').setInputFiles(profile)
  await p.waitForFunction(() => !!window.__voidEditor.getState().doc?.proof, {}, { timeout: 20000 })
  ok(
    'valid CMYK ICC produces enabled canvas proof',
    await E(() => window.__voidEditor.getState().doc.proof.enabled),
  )
  const download = p.waitForEvent('download')
  await p.getByRole('button', { name: 'Export CMYK TIFF', exact: true }).click()
  const file = await download
  await file.saveAs('/tmp/voidcanvas-print-qa.tif')
  ok('ICC CMYK TIFF downloads successfully', (await file.failure()) === null)
  await p.getByRole('button', { name: 'Done', exact: true }).click()
} else console.log('SKIP printer transform: set CMYK_PROFILE to a CMYK ICC fixture')
// Preserve a live clipping host, positioned mask, imported pattern tile and smart text in the portable file.
await E(() => {
  const s = window.__voidEditor.getState()
  s.addShape('ellipse', 160, 50, 90, 90)
  const host = s.active(),
    m = document.createElement('canvas')
  m.width = 90
  m.height = 90
  m.getContext('2d').fillRect(0, 0, 45, 90)
  const tile = document.createElement('canvas')
  tile.width = tile.height = 8
  const x = tile.getContext('2d')
  x.fillStyle = '#f00'
  x.fillRect(0, 0, 8, 8)
  x.fillStyle = '#ff0'
  x.fillRect(0, 0, 4, 8)
  s.updateLayer(host.id, {
    mask: m,
    maskLinked: false,
    maskMatrix: [1, 0, 0, 1, 160, 50],
    styles: {
      order: ['patternOverlay'],
      patternOverlay: {
        on: true,
        opacity: 1,
        blend: 'source-over',
        pattern: 'lines',
        asset: tile.toDataURL(),
        scale: 100,
        angle: 15,
        offsetX: 2,
        offsetY: 3,
      },
    },
  })
  window.__portableHost = host.id
})
await run('draw.inside')
await E(() => {
  const s = window.__voidEditor.getState()
  s.addText(170, 75)
  s.updateLayer(s.active().id, { text: 'Portable source', fontSize: 24 })
  window.__voidEditor.setState({ editingTextId: null })
})
await run('smart.convert')
await p.waitForFunction(() => !!window.__voidEditor.getState().active()?.smart)
await run('draw.exit')
// Portable source/mask/deformation/proof metadata round trip through an actual .void file.
const download = p.waitForEvent('download')
await run('file.void')
const file = await download
await file.saveAs('/tmp/voidcanvas-designer-qa.void')
await fresh()
await E(() => {
  window.showOpenFilePicker = async () => {
    throw new Error('QA uses the file input fallback')
  }
})
const chooser = p.waitForEvent('filechooser')
await run('file.open')
;(await chooser).setFiles('/tmp/voidcanvas-designer-qa.void')
await p.waitForFunction(() => !!window.__voidEditor.getState().layers[0]?.liquify)
ok(
  '.void restores original Liquify source and dabs',
  await E(() => window.__voidEditor.getState().layers[0].liquify.source instanceof HTMLCanvasElement),
)
ok(
  '.void restores smart source and its live clip',
  await E(() => {
    const s = window.__voidEditor.getState(),
      l = s.layers.find((l) => l.smart)
    return l.smart.contents instanceof Blob && l.clipId === window.__portableHost
  }),
)
ok(
  '.void restores unlinked mask and imported tile',
  await E(() => {
    const l = window.__voidEditor.getState().layers.find((l) => l.id === window.__portableHost)
    return (
      l.mask instanceof HTMLCanvasElement &&
      l.maskLinked === false &&
      l.maskMatrix[4] === 160 &&
      l.styles.patternOverlay.asset.startsWith('data:image/png')
    )
  }),
)
ok('.void preserves ICC proof settings', await E(() => !!window.__voidEditor.getState().doc.proof))
// PSD import retains original smart-source bytes and turns its embedded pattern into a live style.
const pd = new Uint8ClampedArray(64 * 64 * 4)
for (let i = 0; i < 64 * 64; i++) pd.set([20, 80, 180, 255], i * 4)
const pt = new Uint8Array(8 * 8 * 4)
for (let i = 0; i < 64; i++) pt.set(i % 8 < 4 ? [255, 0, 0, 255] : [255, 255, 0, 255], i * 4)
const sourcePsd = writePsdBuffer(
  {
    width: 64,
    height: 64,
    imageData: { width: 64, height: 64, data: pd },
    children: [{ name: 'Embedded pixels', left: 0, top: 0, imageData: { width: 64, height: 64, data: pd } }],
  },
  { generateThumbnail: false },
)
const sid = '11111111-1111-1111-1111-111111111111',
  pid = '22222222-2222-2222-2222-222222222222'
const placed = {
  width: 64,
  height: 64,
  imageData: { width: 64, height: 64, data: pd },
  patterns: [{ id: pid, name: 'QA tile', x: 0, y: 0, bounds: { x: 0, y: 0, w: 8, h: 8 }, data: pt }],
  linkedFiles: [{ id: sid, name: 'source.psd', data: sourcePsd }],
  children: [
    {
      name: 'Smart pattern',
      left: 0,
      top: 0,
      imageData: { width: 64, height: 64, data: pd },
      placedLayer: {
        id: sid,
        type: 'raster',
        width: 64,
        height: 64,
        transform: [0, 0, 64, 0, 64, 64, 0, 64],
      },
      effects: {
        patternOverlay: {
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          scale: 100,
          pattern: { name: 'QA tile', id: pid },
          phase: { x: 2, y: 3 },
          align: true,
        },
      },
    },
  ],
}
writeFileSync('/tmp/voidcanvas-smart-pattern.psd', writePsdBuffer(placed, { generateThumbnail: false }))
const pc = p.waitForEvent('filechooser')
await run('file.open')
await (await pc).setFiles('/tmp/voidcanvas-smart-pattern.psd')
await p.waitForFunction(
  () =>
    window.__voidEditor.getState().doc?.name === 'voidcanvas-smart-pattern' &&
    !!window.__voidEditor.getState().layers[0]?.smart,
)
await p.getByRole('button', { name: 'Got it', exact: true }).click()
ok(
  'PSD smart source original bytes retained',
  await E(() => {
    const l = window.__voidEditor.getState().layers[0]
    return l.smart.original instanceof Blob && l.smart.editOriginal && l.smart.originalName === 'source.psd'
  }),
)
ok(
  'PSD pattern tile and phase import as editable style',
  await E(() => {
    const st = window.__voidEditor.getState().layers[0].styles.patternOverlay
    return st.asset.startsWith('data:image/png') && st.offsetX === 2 && st.offsetY === 3
  }),
)
a = await pixels({ x: 0, y: 0, w: 64, h: 64 })
ok(
  'PSD pattern draws original tile colours',
  a.some((v, i) => i % 4 === 0 && v === 255),
)
await run('smart.edit')
await p.waitForFunction(() => !!window.__voidEditor.getState().doc?.smartParent)
ok(
  'native embedded PSD opens real source layers',
  await E(() => window.__voidEditor.getState().layers[0].name === 'Embedded pixels'),
)
await run('smart.apply')
await p.waitForFunction(() => !window.__voidEditor.getState().doc?.smartParent)

ok('no browser runtime errors', errors.length === 0)
if (errors.length) console.log(errors)
await p.screenshot({ path: '/tmp/voidcanvas-designer-qa.png' })
await browser.close()
