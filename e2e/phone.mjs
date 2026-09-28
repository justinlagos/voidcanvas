// The phone Editor, finished: every core action reachable, gestures that behave, nothing hidden under the
// system bars, on several phone sizes and both orientations. Tablets keep the desktop layout with touch mode.
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
const E = (p, f, a) => p.evaluate(f, a)
process.on('exit', () => { console.log(out.join('\n')); console.log(errors.length ? 'ERRORS ' + JSON.stringify(errors.slice(0, 5)) : 'no page errors') })

async function phone(label, viewport, base = devices['iPhone 13']) {
  const ctx = await b.newContext({ ...base, viewport, hasTouch: true, isMobile: true })
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${label}: ${e.message}`)); p.on('dialog', d => d.accept())
  const cdp = await ctx.newCDPSession(p)
  return { ctx, p, cdp }
}
const toScreen = (p, dx, dy) => E(p, ([dx, dy]) => { const s = window.__voidEditor.getState(); const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); const v = s.view; return { x: r.left + v.panX + dx * v.zoom, y: r.top + v.panY + dy * v.zoom } }, [dx, dy])
const touch = async (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i + 1 })) })
async function swipe(cdp, from, to, steps = 6) {
  await touch(cdp, 'touchStart', [from])
  for (let i = 1; i <= steps; i++) await touch(cdp, 'touchMove', [{ x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps }])
  await touch(cdp, 'touchEnd', [])
}
const openMode = async (p, m) => { const btn = await p.$(`nav[aria-label="Modes"] button:has-text("${m}")`); if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.tap(); await p.waitForTimeout(300) }
const rect = (p, sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height } }).catch(() => null)
const setRange = (p, sel, v) => p.$eval(sel, (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })) }, v)

// ───────────── each phone size: layout, text, inspector, crop, several, long press ─────────────
for (const [label, vp] of [['iPhone SE', { width: 375, height: 667 }], ['iPhone 13', { width: 390, height: 844 }], ['Pixel 7', { width: 412, height: 915 }], ['Phone landscape', { width: 844, height: 390 }]]) {
  const { ctx, p } = await phone(label, vp)
  await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
  await (await p.$('input[type=file]')).setInputFiles(FIX.portrait); await p.waitForSelector('nav[aria-label="Modes"]', { timeout: 8000 }).catch(() => {})
  ok(`${label}: phone layout`, !!(await p.$('nav[aria-label="Modes"]')) && !(await p.$('button:has-text("Move settings")')))
  ok(`${label}: no sideways scrolling`, await E(p, () => document.documentElement.scrollWidth <= innerWidth + 1))
  ok(`${label}: save state shown in the top bar`, /Saved|Saving/.test(await p.$eval('[data-save-state]', e => e.textContent).catch(() => '')))
  // Text
  await openMode(p, 'Text'); await p.tap('button:has-text("Add heading")'); await p.waitForSelector('[data-canvas-text-editor]')
  await p.keyboard.type('Summer'); await p.waitForSelector('[data-text-edit-bar] button[aria-label="Bold"]'); await p.tap('[data-text-edit-bar] button[aria-label="Bold"]'); await p.tap('[data-text-edit-bar] button:has-text("Done")'); await p.waitForTimeout(300)
  ok(`${label}: text added, and Bold in the text bar switches the heading to regular`, await E(p, () => { const t = window.__voidEditor.getState().layers.find(l => l.type === 'text'); return t?.text === 'Summer' && t.fontWeight === 400 }))
  // Inspector opens for the selected layer, and sits above the mode bar
  await openMode(p, 'Select')
  ok(`${label}: selecting a layer shows its settings`, !!(await p.$('[data-phone-inspector]')))
  const sh = await rect(p, '[data-mobile-sheet]'), nav = await rect(p, 'nav[aria-label="Modes"]')
  ok(`${label}: the sheet sits above the mode bar`, sh && nav && sh.bottom <= nav.top + 1, JSON.stringify({ sheet: sh?.bottom, nav: nav?.top }))
  // Filter: add Blur, then change its amount from the phone
  await p.tap('[data-mobile-sheet] button[aria-label="Close"]'); await openMode(p, 'Effects'); await p.tap('[data-mobile-sheet] button:has-text("Filters")'); await p.waitForTimeout(600)
  await p.locator('[role=dialog] button:has-text("Blur")').first().tap(); await p.waitForTimeout(700)
  await p.tap('[role=dialog] button[aria-label="Close"]').catch(() => {})
  await E(p, () => { const s = window.__voidEditor.getState(); const a = s.layers.filter(l => l.type === 'adjustment').at(-1); if (a) s.setActive(a.id) })
  await openMode(p, 'Select'); await p.waitForTimeout(300)
  const sliders = await p.$$('[data-phone-inspector] input[type=range]')
  ok(`${label}: a filter's settings can be changed on the phone`, sliders.length > 0, `${sliders.length} sliders`)
  if (sliders.length) {
    const before = await E(p, () => JSON.stringify(window.__voidEditor.getState().active().values))
    await setRange(p, '[data-phone-inspector] input[type=range]', 30); await p.waitForTimeout(200)
    ok(`${label}: moving the slider changes the filter`, (await E(p, () => JSON.stringify(window.__voidEditor.getState().active().values))) !== before)
  }
  // Crop with Apply
  await E(p, () => { const s = window.__voidEditor.getState(); s.setActive(s.layers.find(l => l.type === 'raster').id) })
  await openMode(p, 'Select'); await p.tap('[data-mobile-sheet] button:has-text("Crop")'); await p.waitForTimeout(300)
  ok(`${label}: crop says what to do`, !!(await p.$('[data-crop-pill]')))
  const d0 = await E(p, () => { const d = window.__voidEditor.getState().doc; return { w: d.width, h: d.height } })
  const a = await toScreen(p, d0.w * 0.2, d0.h * 0.2), z = await toScreen(p, d0.w * 0.8, d0.h * 0.7)
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(z.x, z.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250)
  await p.tap('[data-crop-pill] button:has-text("Apply")').catch(() => {}); await p.waitForTimeout(400)
  const d1 = await E(p, () => { const d = window.__voidEditor.getState().doc; return { w: d.width, h: d.height, tool: window.__voidEditor.getState().tool } })
  ok(`${label}: Apply crops`, d1.w < d0.w && d1.h < d0.h && d1.tool === 'move', JSON.stringify({ d0, d1 }))
  // Long press on the text: its actions
  const t = await E(p, () => { const s = window.__voidEditor.getState(); const t = s.layers.find(l => l.type === 'text'); const { x, y } = t; return { x, y, id: t.id } })
  await p.tap('[data-mobile-sheet] button[aria-label="Close"]').catch(() => {})
  const tb = await E(p, id => { const s = window.__voidEditor.getState(); const l = s.layers.find(x => x.id === id); return { cx: l.x + 40, cy: l.y + 20 } }, t.id)
  const tp = await toScreen(p, tb.cx, tb.cy)
  const cdp = await ctx.newCDPSession(p)
  await touch(cdp, 'touchStart', [tp]); await p.waitForTimeout(750); await touch(cdp, 'touchEnd', []); await p.waitForTimeout(300)
  ok(`${label}: long press opens the layer's actions`, !!(await p.$('[data-mobile-sheet] button:has-text("Bring to front")')))
  const n0 = await E(p, () => window.__voidEditor.getState().layers.length)
  await p.tap('[data-mobile-sheet] button:has-text("Duplicate")').catch(() => {}); await p.waitForTimeout(250)
  ok(`${label}: long press did not move the layer, and Duplicate works`, (await E(p, () => window.__voidEditor.getState().layers.length)) === n0 + 1 && (await E(p, id => { const l = window.__voidEditor.getState().layers.find(x => x.id === id); return Math.round(l.x) }, t.id)) === Math.round(t.x))
  // Select several from the Layers sheet, then group
  await p.tap('button[aria-label^="Layers"]'); await p.waitForTimeout(300)
  await p.tap('[data-mobile-sheet] button:has-text("Select several")'); await p.waitForTimeout(150)
  const rows = await p.$$('[data-mobile-sheet] [role=option][aria-selected="false"]')
  await rows[0].tap(); await p.waitForTimeout(80); await rows[1].tap(); await p.waitForTimeout(150)
  ok(`${label}: select several by tapping rows`, (await E(p, () => window.__voidEditor.getState().selectedIds.length)) >= 2)
  await p.tap('[data-mobile-sheet] button[aria-label="Close"]'); await p.waitForTimeout(150)
  await p.tap('[role=status] button:has-text("Done")'); await p.waitForTimeout(300)
  await p.tap('[data-mobile-sheet] button:has-text("Group")').catch(() => {}); await p.waitForTimeout(200)
  ok(`${label}: group from the phone`, (await E(p, () => window.__voidEditor.getState().groups.length)) === 1)
  ok(`${label}: design rules hold`, (await E(p, () => window.__vcCheck())).length === 0)
  await p.screenshot({ path: OUT(`phone_${label.replace(/\s+/g, '_')}.png`) })
  await ctx.close()
}

// ───────────── gestures ─────────────
{
  const { ctx, p, cdp } = await phone('gestures', { width: 390, height: 844 })
  await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
  await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForSelector('nav[aria-label="Modes"]')
  const doc = await E(p, () => { const d = window.__voidEditor.getState().doc; return { w: d.width, h: d.height } })
  const closeSheet = async () => { const c = await p.$('[data-mobile-sheet] button[aria-label="Close"]'); if (c) { await c.tap(); await p.waitForTimeout(150) } }
  // One finger on empty canvas pans and clears the selection
  const empty = await E(p, () => { const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); const s = window.__voidEditor.getState(); const v = s.view; return { x: r.left + 30, y: Math.min(r.bottom - 20, r.top + v.panY + s.doc.height * v.zoom + 60) } })
  await E(p, () => window.__voidEditor.getState().setActive(null)); await p.waitForTimeout(100); await closeSheet()
  const v0 = await E(p, () => ({ ...window.__voidEditor.getState().view }))
  await swipe(cdp, empty, { x: empty.x + 60, y: empty.y - 40 }); await p.waitForTimeout(150)
  const v1 = await E(p, () => ({ ...window.__voidEditor.getState().view }))
  ok('gesture: one finger on empty canvas pans', Math.abs(v1.panX - v0.panX - 60) < 3 && Math.abs(v1.panY - v0.panY + 40) < 3, JSON.stringify({ v0, v1 }))
  // Double tap on empty canvas fits
  await E(p, () => window.__voidEditor.getState().setView({ zoom: 0.05, panX: 10, panY: 10 }))
  const e2 = await E(p, () => { const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); return { x: r.right - 30, y: r.bottom - 30 } })
  for (let i = 0; i < 2; i++) { await touch(cdp, 'touchStart', [e2]); await touch(cdp, 'touchEnd', []); await p.waitForTimeout(90) }
  await p.waitForTimeout(150)
  ok('gesture: double tap on empty canvas fits the design', (await E(p, () => window.__voidEditor.getState().view.zoom)) > 0.1)
  // A small layer: a finger inside moves it
  const sq = await E(p, ([w, h]) => window.__voidEditor.getState().addShape('rect', w * 0.45, h * 0.45, w * 0.03, w * 0.03, { fill: '#ff0000' }), [doc.w, doc.h])
  await p.waitForTimeout(150); await closeSheet()
  const L0 = await E(p, id => { const l = window.__voidEditor.getState().layers.find(x => x.id === id); return { x: l.x, y: l.y, w: l.w, h: l.h } }, sq)
  const c0 = await toScreen(p, L0.x + L0.w / 2, L0.y + L0.h / 2)
  await swipe(cdp, c0, { x: c0.x + 50, y: c0.y + 30 }); await p.waitForTimeout(150)
  const L1 = await E(p, id => { const l = window.__voidEditor.getState().layers.find(x => x.id === id); return { x: l.x, y: l.y, w: l.w * l.scaleX, h: l.h * l.scaleY } }, sq)
  ok('gesture: a finger inside a small layer moves it, not resizes it', Math.abs(L1.w - L0.w) < 1 && L1.x > L0.x + 10, JSON.stringify({ L0, L1 }))
  // Move with one finger, then a second finger lands: the move is its own undo step
  const big = await E(p, ([w, h]) => window.__voidEditor.getState().addShape('rect', w * 0.1, h * 0.1, w * 0.5, h * 0.4, { fill: '#0044ff' }), [doc.w, doc.h])
  await p.waitForTimeout(150); await closeSheet()
  const B0 = await E(p, id => { const l = window.__voidEditor.getState().layers.find(x => x.id === id); return { x: l.x, y: l.y, w: l.w, h: l.h } }, big)
  const bc = await toScreen(p, B0.x + B0.w / 2, B0.y + B0.h / 2)
  const h0 = await E(p, () => window.__voidEditor.getState().historyIndex)
  await touch(cdp, 'touchStart', [bc])
  for (let i = 1; i <= 5; i++) await touch(cdp, 'touchMove', [{ x: bc.x + i * 10, y: bc.y + i * 6 }])
  await touch(cdp, 'touchStart', [{ x: bc.x + 50, y: bc.y + 30, id: 1 }, { x: bc.x + 150, y: bc.y + 130, id: 2 }])
  for (let i = 1; i <= 4; i++) await touch(cdp, 'touchMove', [{ x: bc.x + 50 - i * 5, y: bc.y + 30 - i * 5, id: 1 }, { x: bc.x + 150 + i * 5, y: bc.y + 130 + i * 5, id: 2 }])
  await touch(cdp, 'touchEnd', []); await p.waitForTimeout(200)
  const moved = await E(p, ([id, x0]) => { const l = window.__voidEditor.getState().layers.find(x => x.id === id); return Math.round(l.x - x0) }, [big, B0.x])
  ok('gesture: a move that turns into a pinch keeps an undo step', moved > 0 && (await E(p, () => window.__voidEditor.getState().historyIndex)) === h0 + 1, `moved ${moved}`)
  await E(p, () => window.__voidEditor.getState().undo())
  ok('gesture: undo puts it back', (await E(p, ([id, x0]) => { const l = window.__voidEditor.getState().layers.find(x => x.id === id); return l ? Math.round(l.x - x0) : 'gone' }, [big, B0.x])) === 0, JSON.stringify(await E(p, () => window.__voidEditor.getState().history.slice(-4).map(h => h.label))))
  // Two fingers tapping together still undo
  await closeSheet()
  const hBefore = await E(p, () => window.__voidEditor.getState().historyIndex)
  const mid = await E(p, () => { const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await touch(cdp, 'touchStart', [{ x: mid.x - 40, y: mid.y, id: 1 }, { x: mid.x + 40, y: mid.y, id: 2 }]); await touch(cdp, 'touchEnd', []); await p.waitForTimeout(150)
  ok('gesture: a two-finger tap undoes', (await E(p, () => window.__voidEditor.getState().historyIndex)) === hBefore - 1)
  // Keyboard: the view goes back when typing ends
  await E(p, () => { const s = window.__voidEditor.getState(); const d = s.doc; s.addText(d.width * 0.3, d.height * 0.9) }); await p.waitForTimeout(300)
  const pan0 = await E(p, () => window.__voidEditor.getState().view.panY)
  await p.setViewportSize({ width: 390, height: 520 }); await p.waitForTimeout(400)
  await p.keyboard.type('Low text')
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400)
  await p.tap('[data-text-edit-bar] button:has-text("Done")').catch(() => {}); await p.waitForTimeout(300)
  ok('keyboard: the canvas comes back to where it was after typing', Math.abs((await E(p, () => window.__voidEditor.getState().view.panY)) - pan0) < 2)
  // More sheet reaches everything else, and panels open in it
  await closeSheet(); await p.tap('header button[aria-label="More"]'); await p.waitForTimeout(250)
  const moreText = await p.$eval('[data-mobile-sheet]', e => e.innerText)
  ok('more: boards, versions, resize, history and help are reachable', ['Boards', 'Version history', 'Resize for other formats', 'History', 'Learn Voidcanvas', 'Send feedback'].every(w => moreText.includes(w)))
  await p.locator('[data-mobile-sheet]').getByRole('button', { name: 'History', exact: true }).tap(); await p.waitForTimeout(300)
  ok('more: the History panel opens as a sheet', /History/.test(await p.$eval('[data-mobile-sheet]', e => e.getAttribute('aria-label'))))
  await p.tap('[data-mobile-sheet] button[aria-label="Close"]')
  // A message shows at the top, clear of the mode bar
  await E(p, () => window.__voidEditor.getState().notify('Test message'))
  await p.waitForTimeout(200)
  const toast = await rect(p, 'div[role=status].fixed'), nav = await rect(p, 'nav[aria-label="Modes"]')
  ok('messages: never cover the mode bar', toast && nav && toast.bottom < nav.top, JSON.stringify({ toast, nav }))
  // Back and the start screen: recent designs show their actions and when they were edited
  await p.tap('button[aria-label="Back to start"]'); await p.waitForTimeout(1200)
  ok('start: recent design actions are visible on touch', await E(p, () => { const b = document.querySelector('button[aria-label^="Actions for"]'); return !!b && getComputedStyle(b).display !== 'none' }))
  ok('start: recent designs say when they were edited', /Edited/.test(await p.$eval('section:has-text("Pick up where you left off")', e => e.innerText)))
  await ctx.close()
}

// ───────────── speed with a 4x slower CPU ─────────────
{
  const { ctx, p, cdp } = await phone('speed', { width: 390, height: 844 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  let t0 = Date.now(); await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")'); const tStart = Date.now() - t0
  t0 = Date.now(); await (await p.$('input[type=file]')).setInputFiles(FIX.portrait); await p.waitForFunction(() => window.__voidEditor?.getState().layers.length > 0); await p.waitForSelector('nav[aria-label="Modes"]'); const tOpen = Date.now() - t0
  await openMode(p, 'Text')
  // Measured in the page, from the tap to the caret being in the text box (the moment the keyboard can open).
  await E(p, () => { window.__tt = {}; document.addEventListener('pointerdown', () => { window.__tt.down ??= performance.now() }, true); document.addEventListener('focusin', e => { if (e.target.hasAttribute?.('data-canvas-text-editor')) window.__tt.focus ??= performance.now() }, true) })
  await p.tap('button:has-text("Add heading")'); await p.waitForFunction(() => document.activeElement?.hasAttribute('data-canvas-text-editor'))
  const tType = Math.round(await E(p, () => window.__tt.focus - window.__tt.down))
  console.log('speed (4x CPU):', JSON.stringify({ startScreen: tStart, photoToCanvas: tOpen, addHeadingToCaret: tType }))
  ok('speed: Add heading to typing under 400 ms (4x slower CPU)', tType < 400, `${tType} ms`)
  ok('speed: photo to canvas under 2.5 s (4x slower CPU)', tOpen < 2500, `${tOpen} ms`)
  await ctx.close()
}

// ───────────── tablet ─────────────
{
  const ctx = await b.newContext({ ...devices['iPad (gen 7)'], viewport: { width: 820, height: 1180 } })
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`tablet: ${e.message}`))
  await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
  await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2000)
  ok('tablet: desktop layout', !!(await p.$('button:has-text("Move settings")')) && !(await p.$('nav[aria-label="Modes"]')))
  ok('tablet: touch mode on for fingers', await E(p, () => !!document.querySelector('main.vc-touch')))
  await ctx.close()
}

await b.close(); if (errors.length) process.exitCode = 1
