// U1 appearance combinations — drives the REAL renderer (engine.ts) and samples pixels, so the
// rules in unified/appearance.ts are checked where they actually matter: on the canvas.
// Covers combinations the single-rule unit tests cannot:
//   1. Pass-through group blending: a multiply child blends against the backdrop behind the group.
//   2. Isolation from group opacity: the same child composites inside the group, then the group fades.
//   3. Nested groups: nested group opacities multiply, and hiding the outer group hides its children.
//   4. Group mask over an isolated group: the mask is applied to what the group makes, then the group fades.
//   5. Ordered effects: the effect stack runs top-to-bottom, so the same two effects in the other order differ.
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const out = []
const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' — ' + i : ''}`); console.log(out[out.length - 1]); if (!c) process.exitCode = 1 }
const pass = (n, i = '') => ok(n, true, i)
const fail = (n, i = '') => ok(n, false, i)

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)))

await page.goto(BASE + '/editor?unified=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__voidEditor && window.__vcPixels && window.__vcFx, null, { timeout: 60000 })
await page.waitForTimeout(800)

const E = (fn, arg) => page.evaluate(fn, arg)
const pixel = (x, y) => E(async ([x, y]) => { const d = await window.__vcPixels({ x, y, w: 1, h: 1 }); return d ? [d[0], d[1], d[2]] : null }, [x, y])
const region = (x, y, w, h) => E(async ([x, y, w, h]) => {
  const d = await window.__vcPixels({ x, y, w, h }); if (!d) return null
  const m = [0, 0, 0]
  for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2] }
  return m.map(v => v / (d.length / 4))
}, [x, y, w, h])
const near = (a, t, tol = 6) => !!a && Math.abs(a[0] - t[0]) <= tol && Math.abs(a[1] - t[1]) <= tol && Math.abs(a[2] - t[2]) <= tol
const newDoc = (W, H) => E(([W, H]) => { window.__voidEditor.getState().newDoc({ name: 'Appearance combos', width: W, height: H, background: '#ffffff' }) }, [W, H])

// ── 1 & 2. Pass-through vs isolated group blending ────────────────────────────────
// A grey backdrop fills the board. Inside a group, a red multiply child covers the middle.
// Pass-through: multiply meets the backdrop -> (128,0,0). Isolated (group opacity 0.5): the
// child composites on its own, then the whole group fades over grey -> (191,64,64).
await newDoc(400, 300)
const passGroup = await E(() => {
  const s = window.__voidEditor.getState()
  s.addShape('rect', 0, 0, 400, 300, { fill: '#808080', name: 'Backdrop' })
  const child = s.addShape('rect', 100, 100, 200, 200, { fill: '#ff0000', name: 'Multiply child', blend: 'multiply' })
  s.setActive(child)
  s.groupSelected()
  const g = window.__voidEditor.getState().groups.slice(-1)[0]
  s.updateGroup(g.id, { blend: 'pass', opacity: 1 }, 'Pass through')
  return g.id
})
const passthroughPx = await pixel(200, 200)
if (near(passthroughPx, [128, 0, 0])) {
  pass('pass-through group: multiply child blends against the backdrop behind the group', `rgb=${passthroughPx.join(',')}`)
} else {
  fail('pass-through group: multiply child blends against the backdrop behind the group', `rgb=${JSON.stringify(passthroughPx)}`)
}

await E(id => window.__voidEditor.getState().updateGroup(id, { opacity: 0.5 }, 'Group opacity'), passGroup)
const isolatedPx = await pixel(200, 200)
if (near(isolatedPx, [191, 64, 64]) && passthroughPx[0] !== isolatedPx[0]) {
  pass('isolated group (opacity): child composites inside the group, then the group fades', `rgb=${isolatedPx.join(',')}`)
} else {
  fail('isolated group (opacity): child composites inside the group, then the group fades', `rgb=${JSON.stringify(isolatedPx)} (pass-through was ${JSON.stringify(passthroughPx)})`)
}

// ── 3. Nested groups: opacities multiply, hiding the outer hides its children ──────
await newDoc(300, 300)
const nested = await E(() => {
  const s = window.__voidEditor.getState()
  const r = s.addShape('rect', 50, 50, 100, 100, { fill: '#000000', name: 'Inner box' })
  s.setActive(r); s.groupSelected()
  const inner = window.__voidEditor.getState().groups.slice(-1)[0].id
  s.updateGroup(inner, { opacity: 0.5 }, 'Inner opacity')
  s.setActive(r); s.groupSelected()
  const outer = window.__voidEditor.getState().groups.find(g => g.id !== inner)
  if (outer) s.updateGroup(outer.id, { opacity: 0.5 }, 'Outer opacity')
  return { inner, outer: outer ? outer.id : null, groupCount: window.__voidEditor.getState().groups.length }
})
const nestedPx = await pixel(100, 100)
if (nested.outer && nested.groupCount === 2 && near(nestedPx, [191, 191, 191])) {
  pass('nested groups: inner 50% x outer 50% multiplies to 25% over white', `rgb=${nestedPx.join(',')}`)
} else {
  fail('nested groups: inner 50% x outer 50% multiplies to 25% over white', JSON.stringify({ nested, rgb: nestedPx }))
}

await E(id => window.__voidEditor.getState().updateGroup(id, { visible: false }, 'Hide outer'), nested.outer)
const hiddenPx = await pixel(100, 100)
if (near(hiddenPx, [255, 255, 255])) {
  pass('nested groups: hiding the outer group hides the child and reveals the backdrop', `rgb=${hiddenPx.join(',')}`)
} else {
  fail('nested groups: hiding the outer group hides the child and reveals the backdrop', `rgb=${JSON.stringify(hiddenPx)}`)
}
await E(id => window.__voidEditor.getState().updateGroup(id, { visible: true }, 'Show outer'), nested.outer)

// ── 4. Group mask over an isolated group ──────────────────────────────────────────
// The group is isolated (opacity 0.5) and masked away on the left half. Left samples the
// backdrop; right samples black faded 50% over white.
await newDoc(300, 300)
const masked = await E(() => {
  const s = window.__voidEditor.getState()
  const r = s.addShape('rect', 50, 50, 200, 200, { fill: '#000000', name: 'Masked box' })
  s.setActive(r); s.groupSelected()
  const g = window.__voidEditor.getState().groups.slice(-1)[0].id
  s.updateGroup(g, { opacity: 0.5 }, 'Group opacity')
  const c = document.createElement('canvas'); c.width = 300; c.height = 300
  const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 300, 300); x.clearRect(0, 0, 150, 300)
  s.updateGroup(g, { mask: c, maskEnabled: true, maskAt: { x: 0, y: 0 } }, 'Group mask')
  return g
})
const maskedLeft = await pixel(100, 150)
const maskedRight = await pixel(200, 150)
if (near(maskedLeft, [255, 255, 255]) && near(maskedRight, [127, 127, 127])) {
  pass('group mask + isolation: masked half is hidden, the rest fades as a group', `left=${maskedLeft.join(',')} right=${maskedRight.join(',')}`)
} else {
  fail('group mask + isolation: masked half is hidden, the rest fades as a group', JSON.stringify({ left: maskedLeft, right: maskedRight }))
}

// ── 5. Ordered effects: the stack runs in declared order ──────────────────────────
// Same two effects, opposite order, on a grey field with a dark band: blur then halftone
// is not the same picture as halftone then blur. Compare pixel by pixel, since averaging
// over the whole frame can hide a change that only moves the dots.
const buildOrdered = async (first, second) => {
  await newDoc(240, 240)
  return E(([first, second]) => {
    const s = window.__voidEditor.getState()
    s.addShape('rect', 0, 0, 240, 240, { fill: '#c8c8c8', name: 'Field' })
    const band = s.addShape('rect', 40, 40, 160, 160, { fill: '#202020', name: 'Band' })
    const fx = window.__vcFx.newEffect
    s.addEffect([{ type: 'layer', id: band }], fx(first[0], first[1]), 'First')
    s.addEffect([{ type: 'layer', id: band }], fx(second[0], second[1]), 'Second')
    return band
  }, [first, second])
}
const frame = (x, y, w, h) => E(async ([x, y, w, h]) => { const d = await window.__vcPixels({ x, y, w, h }); return d ? Array.from(d) : null }, [x, y, w, h])
const meanAbsDiff = (a, b) => { if (!a || !b || a.length !== b.length) return 0; let s = 0, n = 0; for (let i = 0; i < a.length; i += 4) { s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3 } return n ? s / n : 0 }
await buildOrdered(['voidEffect', 'halftone'], ['blur', null])
const halftoneThenBlur = await frame(0, 0, 240, 240)
await buildOrdered(['blur', null], ['voidEffect', 'halftone'])
const blurThenHalftone = await frame(0, 0, 240, 240)
const orderDelta = meanAbsDiff(halftoneThenBlur, blurThenHalftone)
if (orderDelta > 1) {
  pass('ordered effects: halftone→blur and blur→halftone render differently', `mean per-channel diff=${orderDelta.toFixed(2)}`)
} else {
  fail('ordered effects: halftone→blur and blur→halftone render differently', `mean per-channel diff=${orderDelta.toFixed(2)}`)
}

if (pageErrors.length === 0) pass('no uncaught browser errors during appearance combinations')
else fail('no uncaught browser errors during appearance combinations', pageErrors.slice(0, 3).join(' | '))

await browser.close()
const failed = out.filter(l => l.startsWith('FAIL')).length
console.log(`\nAPPEARANCE-COMBOS: ${out.length - failed}/${out.length} passed`)
