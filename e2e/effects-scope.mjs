// Effect scope: effects on one layer, on a selection (linked), on a group as one image, on a board and on the
// whole design, with children left out of a group's effects and adjustment layers that reach only their group or
// the layer below. Each case from the brief's night session is checked by its pixels, then through undo, redo,
// save and reload, and export. A parity pass then compares the canvas preview with the export for 30
// combinations of effect and scope. Last, the Effects page: stacking, and sending effects to an open design.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept())
const E = (f, a) => p.evaluate(f, a)
const wait = ms => p.waitForTimeout(ms)

const BG = [240, 240, 240], RED = [208, 32, 32], BLUE = [32, 64, 208], GREEN = [16, 160, 64]

/** A fresh design: a light background, Portrait (red), Texture (blue) and Logo (green). */
const scene = (name, o = {}) => E(([name, o]) => {
  const S = window.__voidEditor, s = () => S.getState()
  s().newDoc({ name, width: 800, height: 600, background: '#ffffff' })
  if (o.boards) s().addFrame({ name: 'Second', width: 800, height: 600 })
  const f0 = s().doc.frames?.[0]
  if (f0) s().setActiveFrame(f0.id)
  const x = f0 ? f0.x : 0, y = f0 ? f0.y : 0
  const bg = s().addShape('rect', x, y, 800, 600, { fill: '#f0f0f0', name: 'Background' })
  const portrait = s().addShape('rect', x + 100, y + 100, 200, 300, { fill: '#d02020', name: 'Portrait' })
  const texture = s().addShape('rect', x + (o.overlap ? 200 : 350), y + 100, 200, 300, { fill: '#2040d0', name: 'Texture' })
  const logo = s().addShape('rect', x + 600, y + 450, 120, 80, { fill: '#10a040', name: 'Logo' })
  if (o.boards) { const f1 = s().doc.frames[1]; s().setActiveFrame(f1.id); s().addShape('rect', f1.x + 100, f1.y + 100, 600, 400, { fill: '#e0a020', name: 'Other' }); s().setActiveFrame(f0.id) }
  S.setState({ selectedIds: [], activeId: null })
  return { doc: s().doc.id, bg, portrait, texture, logo, frame: f0?.id ?? null }
}, [name, o])

/** Mean colour and spread (standard deviation) of a rectangle of the design as drawn. */
const stats = r => E(async r => {
  const d = await window.__vcPixels(r)
  const n = d.length / 4, m = [0, 0, 0], v = [0, 0, 0]
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) m[c] += d[i + c]
  for (let c = 0; c < 3; c++) m[c] /= n
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) v[c] += (d[i + c] - m[c]) ** 2
  return { rgb: m.map(x => Math.round(x * 10) / 10), sd: Math.round(Math.sqrt((v[0] + v[1] + v[2]) / (3 * n)) * 100) / 100 }
}, r)
const px = (x, y) => stats({ x, y, w: 1, h: 1 }).then(s => s.rgb)
const near = (a, want, t = 3) => a.every((v, i) => Math.abs(v - want[i]) <= t)
const grey = (a, t = 4) => Math.max(...a) - Math.min(...a) <= t
const sameSig = (a, b, t = 1.5) => JSON.stringify(a.map(s => s.rgb)) !== undefined && a.every((s, i) => s.rgb.every((v, c) => Math.abs(v - b[i].rgb[c]) <= t) && Math.abs(s.sd - b[i].sd) <= Math.max(1, b[i].sd * 0.15))
const signature = regions => Promise.all(regions.map(stats))

const undo = () => E(() => window.__voidEditor.getState().undo())
const redo = () => E(() => window.__voidEditor.getState().redo())
const reload = async docId => {
  await E(() => window.__vcSave.flush()); await wait(300)
  await p.reload(); await p.waitForFunction(id => window.__voidEditor?.getState().doc?.id === id, docId, { timeout: 20000 })
  await wait(500)
}
const properties = () => E(() => window.__voidUi.getState().showPanel('properties'))

/** Undo, redo, save and reload, and export, for a case whose effect is on: the pixels must hold at each step. */
async function cycle(name, docId, regions, before, after, o = {}) {
  await undo(); await wait(50)
  ok(`${name}: undo puts it back`, sameSig(await signature(regions), before), JSON.stringify((await signature(regions)).map(s => s.rgb)))
  await redo(); await wait(50)
  ok(`${name}: redo brings it back`, sameSig(await signature(regions), after))
  await reload(docId)
  const re = await signature(regions)
  ok(`${name}: the same after save and reload`, sameSig(re, after), JSON.stringify({ re: re.map(s => [s.rgb, s.sd]), after: after.map(s => [s.rgb, s.sd]) }))
  const par = await E(o => window.__vcParity(o), { frame: o.frame ?? undefined, scale: 1 })
  ok(`${name}: export matches the canvas`, par && par.mean < 2 && par.worst < 12, JSON.stringify(par))
}

try {
  await p.goto(`${BASE}/editor`); await p.waitForFunction(() => !!window.__voidEditor && !!window.__vcFx, null, { timeout: 30000 })

  // ── 1. Blur Portrait only
  {
    const ids = await scene('Blur one')
    const regions = [{ x: 92, y: 240, w: 4, h: 20 }, { x: 101, y: 240, w: 4, h: 20 }, { x: 344, y: 240, w: 4, h: 20 }, { x: 352, y: 240, w: 4, h: 20 }, { x: 640, y: 470, w: 20, h: 20 }]
    const before = await signature(regions)
    await E(id => { const s = window.__voidEditor.getState(); const fx = window.__vcFx.newEffect('blur'); fx.values.radius = 12; s.addEffect([{ type: 'layer', id }], fx, 'Add blur') }, ids.portrait)
    const after = await signature(regions)
    ok('1 blur: soft outside Portrait', after[0].rgb[1] < 232 && after[0].rgb[0] > after[0].rgb[1] + 3, JSON.stringify(after[0]))
    ok('1 blur: soft inside Portrait', after[1].rgb[1] > 45, JSON.stringify(after[1]))
    ok('1 blur: Texture edges stay sharp', near(after[2].rgb, BG, 0.5) && near(after[3].rgb, BLUE, 0.5), JSON.stringify([after[2], after[3]]))
    ok('1 blur: Logo untouched', near(after[4].rgb, GREEN, 0.5) && after[4].sd === 0)
    ok('1 blur: nothing new in the Layers panel', await E(() => window.__voidEditor.getState().layers.length) === 4)
    await cycle('1 blur', ids.doc, regions, before, after)
  }

  // ── 2. Colour adjustment on Portrait and Texture only, linked
  {
    const ids = await scene('Colour two')
    const regions = [{ x: 180, y: 230, w: 20, h: 20 }, { x: 430, y: 230, w: 20, h: 20 }, { x: 640, y: 470, w: 20, h: 20 }, { x: 20, y: 20, w: 20, h: 20 }]
    const before = await signature(regions)
    // Through the Properties panel: select both, + Effect, Hue/Saturation.
    await E(ids => { window.__voidEditor.setState({ selectedIds: [ids.portrait, ids.texture], activeId: ids.texture }) }, ids)
    await properties(); await wait(200)
    await p.click('button[aria-label="Add an effect"]'); await wait(150)
    await p.fill('input[aria-label="Find an effect"]', 'Hue')
    await p.click('[data-fx-menu] button[role="menuitem"]:has-text("Hue")'); await wait(200)
    const st = await E(ids => { const L = window.__voidEditor.getState().layers; const a = L.find(l => l.id === ids.portrait).effects ?? [], b = L.find(l => l.id === ids.texture).effects ?? []; return { a: a.map(e => [e.kind, e.link]), b: b.map(e => [e.kind, e.link]) } }, ids)
    ok('2 colour: a linked copy on each', st.a.length === 1 && st.b.length === 1 && st.a[0][0] === 'hueSaturation' && st.a[0][1] && st.a[0][1] === st.b[0][1], JSON.stringify(st))
    const links = await p.textContent('[data-effect-links]').catch(() => '')
    ok('2 colour: Properties says where it is', /Portrait/.test(links) && /Texture/.test(links), links)
    // Changing one copy changes both.
    await E(id => { const s = window.__voidEditor.getState(); const e = s.layers.find(l => l.id === id).effects[0]; s.updateEffect({ type: 'layer', id }, e.id, { values: { ...e.values, saturation: -100 } }, 'Saturation') }, ids.portrait)
    const tx = await E(id => window.__voidEditor.getState().layers.find(l => l.id === id).effects[0].values.saturation, ids.texture)
    ok('2 colour: changing one changes the other', tx === -100, String(tx))
    const after = await signature(regions)
    ok('2 colour: Portrait and Texture are grey', grey(after[0].rgb) && grey(after[1].rgb), JSON.stringify(after.slice(0, 2)))
    ok('2 colour: Logo and background untouched', near(after[2].rgb, GREEN, 0.5) && near(after[3].rgb, BG, 0.5))
    // Unlink: the copies stop following each other.
    await E(id => { const s = window.__voidEditor.getState(); const e = s.layers.find(l => l.id === id).effects[0]; s.unlinkEffect({ type: 'layer', id }, e.id) }, ids.portrait)
    const un = await E(ids => { const L = window.__voidEditor.getState().layers; return [L.find(l => l.id === ids.portrait).effects[0].link ?? null, L.find(l => l.id === ids.texture).effects[0].link ?? null] }, ids)
    ok('2 colour: unlink stops the link', !un[0], JSON.stringify(un))
    await undo()
    // Undo goes back to the effect just added, which changes nothing yet.
    await cycle('2 colour', ids.doc, regions, before, after)
  }

  // ── 3. Group blend and opacity as a unit
  {
    const ids = await scene('Group unit', { overlap: true })
    const regions = [{ x: 240, y: 240, w: 20, h: 20 }, { x: 130, y: 240, w: 20, h: 20 }]
    const before = await signature(regions)
    const gid = await E(ids => { const S = window.__voidEditor; S.setState({ selectedIds: [ids.portrait, ids.texture], activeId: ids.texture }); S.getState().groupSelected(); const g = S.getState().layers.find(l => l.id === ids.portrait).groupId; S.getState().updateGroup(g, { opacity: 0.5 }, 'Group opacity'); return g }, ids)
    const after = await signature(regions)
    // As a unit: the overlap shows only the top layer at half strength, not red through blue.
    const want = BLUE.map((v, i) => (v + BG[i]) / 2), wantRed = RED.map((v, i) => (v + BG[i]) / 2)
    ok('3 group: the overlap is one layer at 50%', near(after[0].rgb, want, 3), JSON.stringify({ got: after[0].rgb, want }))
    ok('3 group: the rest at 50%', near(after[1].rgb, wantRed, 3), JSON.stringify(after[1].rgb))
    await E(g => window.__voidEditor.getState().updateGroup(g, { blend: 'multiply' }, 'Group blend'), gid)
    const mul = await px(250, 250)
    ok('3 group: blend applies to the group as one', near(mul, BLUE.map((v, i) => BG[i] * (1 - 0.5 + 0.5 * v / 255)), 4), JSON.stringify(mul))
    await undo()
    await cycle('3 group', ids.doc, regions, before, after)
  }

  // ── 4. Grain on the group composite (asked once: as one image)
  {
    const ids = await scene('Group grain')
    const regions = [{ x: 150, y: 200, w: 100, h: 100 }, { x: 310, y: 200, w: 30, h: 100 }, { x: 620, y: 460, w: 60, h: 50 }, { x: 20, y: 20, w: 60, h: 60 }]
    const before = await signature(regions)
    await E(ids => { const S = window.__voidEditor; S.setState({ selectedIds: [ids.portrait, ids.texture], activeId: ids.texture }); S.getState().groupSelected(); window.__voidUi.getState().setPref?.('fxScope', {}) }, ids)
    await properties(); await wait(200)
    await p.click('button[aria-label="Add an effect"]'); await wait(150)
    await p.fill('input[aria-label="Find an effect"]', 'Grain')
    await p.click('[data-fx-menu] button[role="menuitem"]:has-text("Grain")')
    await p.waitForSelector('[data-fx-scope-dialog]', { timeout: 5000 }).catch(() => {})
    ok('4 grain: asks one image or each layer', !!(await p.$('[data-fx-scope-dialog]')))
    await p.waitForFunction(() => document.querySelectorAll('[data-fx-scope] img').length === 2, null, { timeout: 8000 }).catch(() => {})
    ok('4 grain: both choices show a preview', (await p.$$('[data-fx-scope] img')).length === 2)
    await p.click('[data-fx-scope="one"]'); await wait(200)
    const g = await E(id => { const s = window.__voidEditor.getState(); const gid = s.layers.find(l => l.id === id).groupId; const g = s.groups.find(x => x.id === gid); return { fx: (g.effects ?? []).map(e => e.effect), kids: s.layers.filter(l => l.groupId === gid).map(l => (l.effects ?? []).length) } }, ids.portrait)
    ok('4 grain: on the group, not the layers', g.fx.length === 1 && g.fx[0] === 'grain' && g.kids.every(n => n === 0), JSON.stringify(g))
    const after = await signature(regions)
    ok('4 grain: the group has grain', after[0].sd > 2, JSON.stringify(after[0]))
    ok('4 grain: the gap inside the group stays clear', near(after[1].rgb, BG, 0.5) && after[1].sd === 0, JSON.stringify(after[1]))
    ok('4 grain: Logo and background stay clean', after[2].sd === 0 && after[3].sd === 0)
    await cycle('4 grain', ids.doc, regions, before, after)
  }

  // ── 5. Colour treatment at group level (no question for colour)
  {
    const ids = await scene('Group colour')
    const regions = [{ x: 180, y: 230, w: 20, h: 20 }, { x: 430, y: 230, w: 20, h: 20 }, { x: 640, y: 470, w: 20, h: 20 }]
    const before = await signature(regions)
    await E(ids => { const S = window.__voidEditor; S.setState({ selectedIds: [ids.portrait, ids.texture], activeId: ids.texture }); S.getState().groupSelected() }, ids)
    await properties(); await wait(200)
    await p.click('button[aria-label="Add an effect"]'); await wait(150)
    await p.fill('input[aria-label="Find an effect"]', 'Black')
    await p.click('[data-fx-menu] button[role="menuitem"]:has-text("Black")'); await wait(300)
    ok('5 colour: no question for a colour effect', !(await p.$('[data-fx-scope-dialog]')))
    const after = await signature(regions)
    ok('5 colour: the whole group is black and white', grey(after[0].rgb) && grey(after[1].rgb), JSON.stringify(after))
    ok('5 colour: outside the group untouched', near(after[2].rgb, GREEN, 0.5))
    await cycle('5 colour', ids.doc, regions, before, after)
  }

  // ── 6. An effect layer above several layers, within their scope
  {
    const ids = await scene('Layer above')
    const regions = [{ x: 180, y: 230, w: 20, h: 20 }, { x: 430, y: 230, w: 20, h: 20 }, { x: 20, y: 20, w: 20, h: 20 }, { x: 640, y: 470, w: 20, h: 20 }]
    const before = await signature(regions)
    const n0 = await E(() => window.__voidEditor.getState().historyIndex)
    await E(ids => { window.__voidEditor.setState({ selectedIds: [ids.portrait, ids.texture], activeId: ids.texture }) }, ids)
    await properties(); await wait(200)
    await p.click('button[aria-label="Add an effect"]'); await wait(150)
    await p.click('[data-fx-menu] label:has-text("As an adjustment layer above them") input')
    await p.fill('input[aria-label="Find an effect"]', 'Invert')
    await p.click('[data-fx-menu] button[role="menuitem"]:has-text("Invert")'); await wait(300)
    const st = await E(ids => { const s = window.__voidEditor.getState(); const adj = s.layers.find(l => l.type === 'adjustment'); const g = s.layers.find(l => l.id === ids.portrait).groupId; return { adj: adj && { kind: adj.kind, reach: adj.reach, group: adj.groupId, clipId: adj.clipId ?? null }, g, sameGroup: s.layers.find(l => l.id === ids.texture).groupId === g, hi: s.historyIndex } }, ids)
    ok('6 layer above: an adjustment in a group with them, reaching only the group', st.adj && st.adj.kind === 'invert' && st.adj.reach === 'group' && st.adj.clipId === null && st.adj.group === st.g && st.sameGroup, JSON.stringify(st))
    ok('6 layer above: one undo step', st.hi === n0 + 1, JSON.stringify({ n0, hi: st.hi }))
    const after = await signature(regions)
    ok('6 layer above: Portrait and Texture inverted', near(after[0].rgb, RED.map(v => 255 - v), 1) && near(after[1].rgb, BLUE.map(v => 255 - v), 1), JSON.stringify(after.slice(0, 2)))
    ok('6 layer above: background and Logo untouched', near(after[2].rgb, BG, 0.5) && near(after[3].rgb, GREEN, 0.5), JSON.stringify(after.slice(2)))
    await cycle('6 layer above', ids.doc, regions, before, after)
    const back = await E(ids => { const s = window.__voidEditor.getState(); return !s.layers.some(l => l.type === 'adjustment') }, ids)
    ok('6 layer above: the reloaded design keeps the adjustment', !back)
  }

  // ── 7. Group grain at 12% with Logo left out
  {
    const ids = await scene('Grain but logo')
    const regions = [{ x: 150, y: 200, w: 100, h: 100 }, { x: 620, y: 460, w: 60, h: 50 }, { x: 20, y: 20, w: 60, h: 60 }]
    const before = await signature(regions)
    await E(ids => {
      const S = window.__voidEditor
      S.setState({ selectedIds: [ids.portrait, ids.texture, ids.logo], activeId: ids.logo }); S.getState().groupSelected()
      const s = S.getState(), gid = s.layers.find(l => l.id === ids.logo).groupId
      const fx = window.__vcFx.newEffect('voidEffect', 'grain'); fx.effectParams.intensity = 12; fx.effectParams.seed = 7
      s.addEffect([{ type: 'group', id: gid }], fx, 'Add grain')
      S.setState({ selectedIds: [ids.logo], activeId: ids.logo })
    }, ids)
    const withLogo = await stats(regions[1])
    ok('7 grain 12%: the Logo has grain before it is left out', withLogo.sd > 0.3, JSON.stringify(withLogo))
    await properties(); await wait(250)
    await p.click('[data-fx-exclude] input'); await wait(200)
    const ex = await E(id => window.__voidEditor.getState().layers.find(l => l.id === id).fxExclude, ids.logo)
    ok('7 grain 12%: the Logo is left out', ex === true)
    const after = await signature(regions)
    ok('7 grain 12%: Portrait still has grain', after[0].sd > 0.3, JSON.stringify(after[0]))
    ok('7 grain 12%: the Logo is clean', near(after[1].rgb, GREEN, 0.5) && after[1].sd === 0, JSON.stringify(after[1]))
    ok('7 grain 12%: background clean', after[2].sd === 0)
    await cycle('7 grain 12%', ids.doc, regions, await (async () => { await undo(); const s = await signature(regions); await redo(); return s })(), after)
    void before
  }

  // ── An effect limited to an area by its own mask: blur only the left half of Portrait
  {
    const ids = await scene('Masked blur')
    const regions = [{ x: 92, y: 240, w: 4, h: 20 }, { x: 302, y: 240, w: 4, h: 20 }, { x: 294, y: 240, w: 4, h: 20 }]
    await E(id => { const s = window.__voidEditor.getState(); const fx = window.__vcFx.newEffect('blur'); fx.values.radius = 12; s.addEffect([{ type: 'layer', id }], fx, 'Add blur'); window.__voidEditor.setState({ selectedIds: [id], activeId: id }) }, ids.portrait)
    const before = await signature(regions)
    ok('mask: without a mask both edges are soft', before[1].rgb[1] < 236 && before[2].rgb[1] > 40, JSON.stringify(before))
    await E(() => { const s = window.__voidEditor.getState(); const c = document.createElement('canvas'); c.width = 800; c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 600); s.setSelection(c, 'Select') })
    await properties(); await wait(200)
    await p.click('button[aria-label="More for Blur"]'); await wait(150)
    await p.click('[role="menu"] button[role="menuitem"]:has-text("Show only in the selection")'); await wait(200)
    await E(() => window.__voidEditor.getState().setSelection(null))
    const after = await signature(regions)
    ok('mask: the left edge stays soft', after[0].rgb[1] < 232, JSON.stringify(after[0]))
    ok('mask: the right edge is sharp again', near(after[1].rgb, BG, 0.5) && near(after[2].rgb, RED, 0.5), JSON.stringify(after.slice(1)))
    ok('mask: the row says Masked', /Masked/.test(await p.textContent('[data-effect-masked]').catch(() => '')))
    await cycle('mask', ids.doc, regions, before, after)
    await E(id => { const s = window.__voidEditor.getState(); const e = s.layers.find(l => l.id === id).effects[0]; s.setEffectMask({ type: 'layer', id }, e.id, 'invert') }, ids.portrait)
    const inv = await signature(regions)
    ok('mask: invert swaps the sides', near(inv[0].rgb, BG, 0.5) && inv[1].rgb[1] < 236, JSON.stringify(inv))
  }

  // ── Masks stay with what they belong to when boards move, boards are added, or the layer moves
  {
    const ids = await scene('Masks follow', { boards: true })
    const setup = await E(ids => {
      const S = window.__voidEditor, s = () => S.getState()
      const f = s().doc.frames[0]
      const sel = (x0, w) => { const c = document.createElement('canvas'); c.width = s().doc.width; c.height = s().doc.height; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(f.x + x0, f.y, w, 600); return c }
      // An invert adjustment over the board, masked to its left 320 px (Portrait yes, Texture no).
      S.setState({ selectedIds: [ids.texture], activeId: ids.texture })
      s().addAdjustment('invert')
      const a = s().layers.find(l => l.type === 'adjustment')
      // New adjustments target their selection by default. Explicitly choose
      // whole-stack scope for this mask regression.
      s().releaseClippingMask(a.id)
      s().setSelection(sel(0, 320)); s().addMask(a.id, true)
      // Logo in a group masked to the right 300 px of the board, so it shows.
      S.setState({ selectedIds: [ids.logo], activeId: ids.logo }); s().groupSelected()
      const g = s().layers.find(l => l.id === ids.logo).groupId
      s().setSelection(sel(500, 300)); s().setGroupMask(g, 'selection'); s().setSelection(null)
      s().setEditingMask?.(false)
      return { f: f.id }
    }, ids)
    const at = async (rx, ry) => { const f = await E(id => { const f = window.__voidEditor.getState().doc.frames.find(x => x.id === id); return { x: f.x, y: f.y } }, setup.f); return px(f.x + rx, f.y + ry) }
    const look = async () => ({ portrait: await at(200, 250), texture: await at(450, 250), logo: await at(660, 490) })
    const want = { portrait: RED.map(v => 255 - v), texture: BLUE, logo: GREEN.map(v => 255 - v) }
    const okLook = l => near(l.portrait, want.portrait, 1) && near(l.texture, want.texture, 1) && near(l.logo, GREEN, 1)
    const l0 = await look()
    ok('masks: the adjustment shows only where its mask is, the group shows where its mask is', near(l0.portrait, want.portrait, 1) && near(l0.texture, BLUE, 1) && near(l0.logo, GREEN, 1), JSON.stringify(l0))
    await E(id => { const s = window.__voidEditor.getState(); s.moveFrame(id, 260, 140); s.settleFrames(); s.commit('Move board') }, setup.f)
    const l1 = await look()
    ok('masks: moving the board takes its masks with it', okLook(l1), JSON.stringify(l1))
    await E(id => { const s = window.__voidEditor.getState(); s.moveFrame(id, -3000, -400); s.settleFrames(); s.commit('Move board') }, setup.f)
    const l2 = await look()
    ok('masks: moving it left of the others keeps them in place', okLook(l2), JSON.stringify(l2))
    await E(() => { const s = window.__voidEditor.getState(); s.addFrame({ name: 'Third', width: 1200, height: 900 }) })
    const l3 = await look()
    ok('masks: adding a board does not stretch them', okLook(l3), JSON.stringify(l3))
    await E(id => window.__voidEditor.getState().duplicateFrame(id), setup.f)
    const dup = await E(id => { const s = window.__voidEditor.getState(); const f = s.doc.frames[s.doc.frames.length - 1]; return { x: f.x, y: f.y, id: f.id } }, setup.f)
    const dl = { portrait: await px(dup.x + 200, dup.y + 250), texture: await px(dup.x + 450, dup.y + 250), logo: await px(dup.x + 660, dup.y + 490) }
    ok('masks: a duplicated board brings its own masks along', okLook(dl), JSON.stringify(dl))
    await E(() => window.__vcSave.flush()); await reload(ids.doc)
    const l4 = await look()
    ok('masks: the same after save and reload', okLook(l4), JSON.stringify(l4))
    const par = await E(id => window.__vcParity({ frame: id, scale: 0.5 }), setup.f)
    ok('masks: export matches the canvas', par && par.mean < 3, JSON.stringify(par))
    // An effect mask on a layer moves with the layer.
    const ids2 = await scene('Mask moves with layer')
    await E(id => {
      const S = window.__voidEditor, s = () => S.getState()
      const fx = window.__vcFx.newEffect('blur'); fx.values.radius = 12; s().addEffect([{ type: 'layer', id }], fx, 'Add blur')
      // Blur only the top of Portrait (the top 200 px of the page), then move Portrait down by 150.
      const c = document.createElement('canvas'); c.width = 800; c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 800, 200)
      s().setSelection(c); s().setEffectMask({ type: 'layer', id }, s().layers.find(l => l.id === id).effects[0].id, 'selection'); s().setSelection(null)
      s().updateLayer(id, { y: 250 }, 'Move')
    }, ids2.portrait)
    const soft = await stats({ x: 190, y: 242, w: 20, h: 4 }), sharpB = await px(200, 552), inB = await px(200, 546)
    ok('masks: an effect mask on a layer moves with the layer', soft.rgb[1] < 232 && near(sharpB, BG, 0.5) && near(inB, RED, 0.5), JSON.stringify({ soft, sharpB, inB }))
  }

  // ── Duplicates and grouping as one step
  {
    const ids = await scene('Duplicates')
    const r = await E(ids => {
      const S = window.__voidEditor, s = () => S.getState()
      s().addEffect([{ type: 'layer', id: ids.portrait }, { type: 'layer', id: ids.texture }], window.__vcFx.newEffect('invert'), 'Add invert')
      S.setState({ selectedIds: [ids.portrait], activeId: ids.portrait }); s().duplicateSelected()
      const copy = s().layers.find(l => l.name === 'Portrait 2')
      const orig = s().layers.find(l => l.id === ids.portrait).effects[0]
      return { copyLink: copy?.effects?.[0]?.link ?? null, origLink: orig.link, sameId: copy?.effects?.[0]?.id === orig.id }
    }, ids)
    ok('a duplicate gets its own effects, not linked to the original', r.copyLink !== r.origLink && !r.sameId, JSON.stringify(r))
    const ids2 = await scene('One step')
    const n0 = await E(() => window.__voidEditor.getState().historyIndex)
    await E(ids => { window.__voidEditor.setState({ selectedIds: [ids.portrait, ids.texture], activeId: ids.texture }); window.__voidUi.getState().setPref('fxScope', { blur: 'one' }) }, ids2)
    await properties(); await wait(200)
    await p.click('button[aria-label="Add an effect"]'); await wait(150)
    await p.fill('input[aria-label="Find an effect"]', 'Blur')
    await p.click('[data-fx-menu] button[role="menuitem"]:text-is("Blur")'); await wait(300)
    const g = await E(ids => { const s = window.__voidEditor.getState(); const gid = s.layers.find(l => l.id === ids.portrait).groupId; return { grouped: !!gid && gid === s.layers.find(l => l.id === ids.texture).groupId, fx: (s.groups.find(x => x.id === gid)?.effects ?? []).map(e => e.kind), hi: s.historyIndex } }, ids2)
    ok('remembered "as one image": grouped with the blur on the group', g.grouped && JSON.stringify(g.fx) === '["blur"]', JSON.stringify(g))
    ok('grouping and adding are one undo step', g.hi === n0 + 1, JSON.stringify({ n0, hi: g.hi }))
    await E(() => window.__voidUi.getState().setPref('fxScope', {}))
  }

  // ── Canvas against export: 30 combinations of effect and scope, previewed at half size (as when zoomed out,
  // or with several boards) and exported at full size.
  {
    const effects = [
      ['blur', null, { radius: 10 }], ['hueSaturation', null, { hue: 90, saturation: 30 }], ['voidEffect', 'halftone', { scale: 40 }],
      ['voidEffect', 'grain', { intensity: 40 }], ['voidEffect', 'vignette', {}], ['voidEffect', 'pixelate', { scale: 30 }],
    ]
    const scopes = ['layer', 'linked', 'group', 'groupExclude', 'adjBelow', 'adjGroup', 'adjClip', 'board', 'doc', 'docBoards']
    let n = 0, bad = []
    for (let i = 0; i < 30; i++) {
      const scope = scopes[i % scopes.length], [kind, effect, vals] = effects[(i + Math.floor(i / scopes.length)) % effects.length]
      const ids = await scene(`Parity ${i}`, { boards: scope === 'board' || scope === 'docBoards' })
      await E(([ids, scope, kind, effect, vals]) => {
        const S = window.__voidEditor, s = () => S.getState()
        const fx = window.__vcFx.newEffect(kind, effect ?? undefined)
        if (effect) Object.assign(fx.effectParams, vals, { seed: 11 }); else Object.assign(fx.values, vals)
        const group = () => { S.setState({ selectedIds: [ids.portrait, ids.texture, ids.logo], activeId: ids.logo }); s().groupSelected(); return s().layers.find(l => l.id === ids.logo).groupId }
        const adjust = (reach) => {
          S.setState({ selectedIds: [ids.texture], activeId: ids.texture })
          s().addAdjustment(kind, effect ?? undefined)
          const a = s().layers.find(l => l.type === 'adjustment')
          s().updateLayer(a.id, { ...(effect ? { effectParams: { ...a.effectParams, ...vals, seed: 11 } } : { values: { ...a.values, ...vals } }) })
          // Creation clips to the selected layer. Non-clipped test cases must
          // explicitly switch to their requested reach, as the UI does.
          if (reach !== 'clip') {
            s().releaseClippingMask(a.id)
            if (reach) s().updateLayer(a.id, { reach })
          }
        }
        if (scope === 'layer') s().addEffect([{ type: 'layer', id: ids.portrait }], fx)
        else if (scope === 'linked') s().addEffect([{ type: 'layer', id: ids.portrait }, { type: 'layer', id: ids.texture }], fx)
        else if (scope === 'group') s().addEffect([{ type: 'group', id: group() }], fx)
        else if (scope === 'groupExclude') { const g = group(); s().addEffect([{ type: 'group', id: g }], fx); s().setFxExclude({ type: 'layer', id: ids.texture }, true) }
        else if (scope === 'adjBelow') adjust(null)
        else if (scope === 'adjGroup') { group(); adjust('group') }
        else if (scope === 'adjClip') adjust('clip')
        else if (scope === 'board') s().addEffect([{ type: 'board', id: ids.frame }], fx)
        else s().addEffect([{ type: 'doc' }], fx)
      }, [ids, scope, kind, effect, vals])
      const half = await E(o => window.__vcParity(o), { frame: ids.frame ?? undefined, scale: 0.5 })
      const full = await E(o => window.__vcParity(o), { frame: ids.frame ?? undefined, scale: 1 })
      const label = `${effect ?? kind} on ${scope}`
      if (half && full && half.mean < 3 && half.worst < 16 && full.mean < 2 && full.worst < 12) n++
      else bad.push({ label, half, full })
    }
    ok('parity: canvas and export agree for 30 combinations', n === 30, JSON.stringify(bad))
  }

  // ── Compare and effects off only change the view
  {
    const ids = await scene('Effects off')
    await E(id => { const s = window.__voidEditor.getState(); s.addEffect([{ type: 'layer', id }], window.__vcFx.newEffect('invert'), 'Add invert') }, ids.portrait)
    const hi = await E(() => window.__voidEditor.getState().historyIndex)
    const on = await px(200, 250)
    await E(() => window.__voidEditor.setState({ fxOff: true })); await wait(100)
    const drawnOff = await E(async () => { const d = await window.__vcPixels({ x: 200, y: 250, w: 1, h: 1 }, { noFx: true }); return Array.from(d).slice(0, 3) })
    ok('effects off: shows the design without effects', near(drawnOff, RED, 0.5) && near(on, RED.map(v => 255 - v), 0.5), JSON.stringify({ on, drawnOff }))
    ok('effects off: not an edit', await E(() => window.__voidEditor.getState().historyIndex) === hi)
    const par = await E(() => window.__vcParity({ scale: 1 }))
    ok('effects off: export still has the effects', par.mean < 1, JSON.stringify(par))
    await E(() => window.__voidEditor.setState({ fxOff: false }))
  }

  // ── Copy effects, paste them onto another layer, and paste replace
  {
    const ids = await scene('Copy effects')
    await E(ids => {
      const S = window.__voidEditor, s = () => S.getState()
      s().addEffect([{ type: 'layer', id: ids.portrait }], [window.__vcFx.newEffect('invert'), window.__vcFx.newEffect('blur')], 'Add effects')
      S.setState({ selectedIds: [ids.portrait], activeId: ids.portrait })
    }, ids)
    await E(() => window.__vcRun('fx.copy'))
    await E(id => window.__voidEditor.setState({ selectedIds: [id], activeId: id }), ids.texture)
    await E(() => window.__vcRun('fx.pasteAdd'))
    const t = await E(id => (window.__voidEditor.getState().layers.find(l => l.id === id).effects ?? []).map(e => e.kind), ids.texture)
    ok('copy and paste effects', JSON.stringify(t) === '["invert","blur"]', JSON.stringify(t))
    await E(id => window.__voidEditor.setState({ selectedIds: [id], activeId: id }), ids.logo)
    await E(id => { const s = window.__voidEditor.getState(); s.addEffect([{ type: 'layer', id }], window.__vcFx.newEffect('posterize'), 'Add posterize') }, ids.logo)
    await E(() => window.__vcRun('fx.pasteReplace'))
    const l = await E(id => (window.__voidEditor.getState().layers.find(l => l.id === id).effects ?? []).map(e => e.kind), ids.logo)
    ok('paste effects (replace)', JSON.stringify(l) === '["invert","blur"]', JSON.stringify(l))
  }

  // ── The Effects page: a stack of effects, and sending them on
  const photo = await E(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 600, 0); g.addColorStop(0, '#202020'); g.addColorStop(1, '#f0e0c0'); x.fillStyle = g; x.fillRect(0, 0, 600, 400); x.fillStyle = '#c03020'; x.beginPath(); x.arc(300, 200, 120, 0, 7); x.fill(); return c.toDataURL('image/png').split(',')[1] })
  const upload = async () => {
    await (await p.$('input[type=file]')).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') })
    await p.waitForSelector('canvas[data-result-canvas]', { timeout: 15000 }); await wait(600)
  }
  const resultSig = () => E(() => { const c = document.querySelector('canvas[data-result-canvas]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) % 1e9; return s })
  // The stack shows in the desktop sidebar and, on a phone, in the Adjust tab; only the visible one counts.
  const items = () => p.$$eval('[data-fx-stack-item]', els => els.filter(e => e.getClientRects().length > 0).map(e => [e.getAttribute('data-fx-stack-item'), e.hasAttribute('data-editing')]))
  const pick = async id => { await p.click(`[data-effect-pick="${id}"]`); await wait(900) }
  {
    await p.goto(`${BASE}/effects`); await upload()
    await pick('halftone')
    const one = await resultSig()
    ok('effects page: one effect shows in the stack', JSON.stringify(await items()) === '[["halftone",true]]', JSON.stringify(await items()))
    await p.click('[data-fx-add-another]'); await wait(200)
    await pick('vignette')
    const two = await resultSig()
    ok('effects page: two effects stack, in order', JSON.stringify(await items()) === '[["halftone",false],["vignette",true]]', JSON.stringify(await items()))
    ok('effects page: the picture shows both', two !== one)
    await p.click('[data-fx-stack-item="halftone"] button[aria-pressed]'); await wait(300)
    ok('effects page: tap one to change it', JSON.stringify(await items()) === '[["halftone",true],["vignette",false]]', JSON.stringify(await items()))
    ok('effects page: switching which one you change keeps the picture', await resultSig() === two)
    await p.click('button[aria-label="Remove Vignette"]'); await wait(900)
    ok('effects page: remove one', JSON.stringify(await items()) === '[["halftone",true]]', JSON.stringify(await items()))
    ok('effects page: the picture follows', await resultSig() === one)
    await p.click('button[title="Undo"]'); await wait(900)
    ok('effects page: undo brings it back', (await items()).length === 2 && await resultSig() === two, JSON.stringify(await items()))
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:visible:has-text("PNG")')])
    ok('effects page: the download has both', /halftone-vignette/.test(dl.suggestedFilename()), dl.suggestedFilename())
    await p.click('button:has-text("Open in Editor")')
    await p.waitForFunction(() => window.__voidEditor?.getState().layers.some(l => (l.effects ?? []).length), null, { timeout: 20000 }).catch(() => {})
    const ed = await E(() => { const s = window.__voidEditor.getState(); return s.layers.map(l => ({ type: l.type, fx: (l.effects ?? []).map(e => e.effect), sel: s.selectedIds.includes(l.id) })) })
    ok('effects page: Open in Editor puts the effects on the photo, still editable', ed.length === 1 && JSON.stringify(ed[0].fx) === '["halftone","vignette"]' && ed[0].sel, JSON.stringify(ed))
  }
  {
    // Add to my design: the design open in this tab gets the effects on what was selected.
    const badge = await E(() => { const s = window.__voidEditor.getState(); const id = s.addShape('rect', 40, 40, 160, 90, { fill: '#3060e0', name: 'Badge' }); window.__voidEditor.setState({ selectedIds: [id], activeId: id }); return id })
    await wait(700); await E(() => window.__vcSave.flush()); await wait(300)
    const docId = await E(() => window.__voidEditor.getState().doc.id)
    await p.goto(`${BASE}/effects`); await upload()
    ok('effects page: no Add to my design before an effect is picked', !(await p.$('[data-fx-to-design]')))
    await pick('duotone')
    ok('effects page: Add to my design shows with a design open', !!(await p.$('button[data-fx-to-design]:visible')))
    await p.click('button[data-fx-to-design]:visible')
    await p.waitForFunction(id => window.__voidEditor?.getState().layers.find(l => l.id === id)?.effects?.length, badge, { timeout: 20000 }).catch(() => {})
    const r = await E(([id, docId]) => { const s = window.__voidEditor.getState(); const l = s.layers.find(x => x.id === id); return { doc: s.doc?.id === docId, fx: (l?.effects ?? []).map(e => e.effect), others: s.layers.filter(x => x.id !== id).map(x => (x.effects ?? []).length) } }, [badge, docId])
    ok('effects page: Add to my design puts it on the selected layer', r.doc && JSON.stringify(r.fx) === '["duotone"]' && JSON.stringify(r.others) === '[2]', JSON.stringify(r))
    const toast = await p.textContent('[role="status"]').catch(() => '')
    ok('effects page: says where it went', /Duotone/.test(toast) && /Badge/.test(toast), toast)
    await undo()
    ok('effects page: one undo takes it off', await E(id => (window.__voidEditor.getState().layers.find(l => l.id === id).effects ?? []).length, badge) === 0)
  }
  // ── The phone: the Effects sheet puts effects on the selected layer, with their settings right there
  {
    const { devices } = await import('playwright')
    const pctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const pp = await pctx.newPage(); pp.on('pageerror', e => errors.push('phone: ' + e.message))
    await pp.goto(`${BASE}/editor`); await pp.waitForFunction(() => !!window.__vcFx, null, { timeout: 30000 })
    const id = await pp.evaluate(() => { const S = window.__voidEditor, s = () => S.getState(); s().newDoc({ name: 'Phone fx', width: 800, height: 600, background: '#ffffff' }); const a = s().addShape('rect', 100, 100, 200, 300, { fill: '#d02020', name: 'Portrait' }); S.setState({ selectedIds: [a], activeId: a }); return a })
    await pp.waitForSelector('nav[aria-label="Modes"]', { timeout: 8000 })
    await pp.tap('nav[aria-label="Modes"] button:has-text("Effects")'); await pp.waitForTimeout(400)
    ok('phone: the Effects sheet offers effects on the selected layer', !!(await pp.$('[data-phone-effects] button[aria-label="Add an effect"]')))
    await pp.tap('[data-phone-effects] button[aria-label="Add an effect"]'); await pp.waitForTimeout(250)
    await pp.tap('[data-fx-menu] button[role="menuitem"]:text-is("Blur")'); await pp.waitForTimeout(300)
    const fx = await pp.evaluate(id => (window.__voidEditor.getState().layers.find(l => l.id === id).effects ?? []).map(e => [e.kind, e.values.radius]), id)
    ok('phone: Blur goes on the layer itself', JSON.stringify(fx) === '[["blur",8]]', JSON.stringify(fx))
    const sliders = await pp.$$('[data-phone-effects] [data-effect-settings] input[type=range]')
    ok('phone: its settings open straight away', sliders.length > 0, String(sliders.length))
    if (sliders.length) {
      await pp.$eval('[data-phone-effects] [data-effect-settings] input[type=range]', el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '20'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) })
      await pp.waitForTimeout(200)
      const r = await pp.evaluate(id => window.__voidEditor.getState().layers.find(l => l.id === id).effects[0].values.radius, id)
      ok('phone: moving its slider changes the effect', r === 20, String(r))
    }
    ok('phone: no sideways scrolling', await pp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await pctx.close()
  }
} catch (e) { ok('ran without throwing', false, e.stack) }

ok('no page errors', errors.length === 0, errors.join(' | '))
console.log(out.join('\n'))
console.log(`\n${out.filter(l => l.startsWith('PASS')).length} passed, ${out.filter(l => l.startsWith('FAIL')).length} failed`)
await b.close()
