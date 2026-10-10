// Regression: selecting a layer must never silently adjust everything below it,
// and cutting/copying selected pixels must produce a tightly bounded layer.
// Run against a dev server: BASE=http://localhost:3123 node e2e/targeted-adjustment-cut-bounds.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3123'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1380, height: 900 } })
const failures = []
const check = (name, result) => {
  console.log(`${result ? 'PASS' : 'FAIL'} ${name}`)
  if (!result) failures.push(name)
}
page.on('pageerror', e => failures.push('Browser error: ' + e.message))

try {
  await page.goto(`${BASE}/editor`)
  await page.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })
  const result = await page.evaluate(() => {
    const store = window.__voidEditor, s = () => store.getState()
    const reset = name => s().newDoc({ name, width: 320, height: 240, background: '#ffffff' })
    reset('Single adjustment scope')
    const backdrop = s().addShape('rect', 0, 0, 320, 240, { fill: '#222222' })
    const portrait = s().addShape('rect', 20, 20, 100, 120, { fill: '#d02020' })
    s().setActive(portrait)
    s().addAdjustment('brightnessContrast')
    const one = s().active()
    const selected = one?.clipId === portrait && one.reach === 'clip' &&
      s().layers.indexOf(one) === s().layers.findIndex(l => l.id === portrait) + 1 &&
      s().layers.find(l => l.id === backdrop)?.effects === undefined

    // The same action with no selected layer retains the explicit global case.
    store.setState({ selectedIds: [], activeId: null })
    s().addAdjustment('vibrance')
    const all = s().active()
    const global = all?.type === 'adjustment' && !all.clipId && !all.reach

    reset('Several exact layers')
    const a = s().addShape('rect', 0, 0, 50, 50)
    const b = s().addShape('rect', 80, 0, 50, 50)
    const c = s().addShape('rect', 160, 0, 50, 50)
    store.setState({ selectedIds: [a, b], activeId: b })
    s().addAdjustment('blur')
    const la = s().layers.find(l => l.id === a)
    const lb = s().layers.find(l => l.id === b)
    const lc = s().layers.find(l => l.id === c)
    const several = la?.effects?.length === 1 && lb?.effects?.length === 1 &&
      !!la.effects[0].link && la.effects[0].link === lb.effects[0].link &&
      !lc?.effects?.length && s().layers.length === 3

    reset('Tight cut bounds')
    const shape = s().addShape('rect', 40, 50, 100, 100, { fill: '#f02020' })
    s().setActive(shape)
    const mask = document.createElement('canvas')
    mask.width = 320; mask.height = 240
    const ctx = mask.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(55, 65, 25, 35)
    s().setSelection(mask)
    s().layerFromSelection(false)
    const out = s().active()
    const bounds = out?.type === 'raster' && out.x === 55 && out.y === 65 &&
      out.canvas.width === 25 && out.canvas.height === 35 &&
      out.canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0
    return { selected, global, several, bounds }
  })
  for (const [name, value] of Object.entries(result)) check(name, value)
} finally {
  await browser.close()
}
if (failures.length) {
  console.error('Regression failures:', failures.join(', '))
  process.exitCode = 1
}
