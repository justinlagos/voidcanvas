// Editor: header sticks on the landing page, Window submenu opens to the right, tools float/move/reshape/collapse, boards drag by their name badge.
import { chromium } from 'playwright'
import { FIX } from './fixtures.mjs'
const out = '/tmp/claude-0/s2/'
const b = await chromium.launch(); const errs = []
// ---- landing ----
let c = await b.newContext({ viewport: { width: 1440, height: 900 } }); let p = await c.newPage(); p.on('pageerror', e => errs.push(e.message))
await p.goto((process.env.BASE || 'http://localhost:3123') + '/', { waitUntil: 'networkidle' })
await p.screenshot({ path: out + 'l-top.png', clip: { x: 0, y: 0, width: 1440, height: 400 } })
await p.mouse.wheel(0, 3200); await p.waitForTimeout(1200)
const hdr = await p.evaluate(() => { const h = document.querySelector('.lp > div.fixed'); const r = h.getBoundingClientRect(); return { top: r.top, bg: getComputedStyle(h).backgroundColor, y: scrollY } })
console.log('header after scroll', hdr)
await p.screenshot({ path: out + 'l-scrolled.png', clip: { x: 0, y: 0, width: 1440, height: 500 } })
await p.click('nav[aria-label=Sections] a[href="#studio"]'); await p.waitForTimeout(1500)
console.log('after nav click: current =', await p.evaluate(() => document.querySelector('nav[aria-label=Sections] a[aria-current]')?.textContent), 'studio top', await p.evaluate(() => Math.round(document.getElementById('studio').getBoundingClientRect().top)))
await p.screenshot({ path: out + 'l-studio.png', clip: { x: 0, y: 0, width: 1440, height: 500 } })
await c.close()
// ---- editor ----
c = await b.newContext({ viewport: { width: 1440, height: 900 } }); p = await c.newPage(); p.on('pageerror', e => errs.push(e.message))
await p.goto((process.env.BASE || 'http://localhost:3123') + '/editor'); await p.waitForTimeout(800)
await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2500)
// submenu
await p.click('header button:has-text("Window")'); await p.waitForTimeout(200)
await p.hover('button[aria-haspopup=menu]:has-text("Workspace")'); await p.waitForTimeout(400)
const subm = await p.evaluate(() => { const item = [...document.querySelectorAll('button[aria-haspopup=menu]')].find(b => b.textContent.includes('Workspace')); const menus = [...document.querySelectorAll('[role=menu]')]; const sub = menus[menus.length - 1]; const a = item.getBoundingClientRect(), r = sub.getBoundingClientRect(); return { itemRight: Math.round(a.right), subLeft: Math.round(r.left), subTop: Math.round(r.top), itemTop: Math.round(a.top) } })
console.log('submenu', subm, subm.subLeft >= subm.itemRight - 1 ? 'OPENS RIGHT' : 'OVERLAPS')
await p.screenshot({ path: out + 'e-submenu.png', clip: { x: 0, y: 0, width: 900, height: 600 } })
await p.keyboard.press('Escape'); await p.mouse.click(700, 500); await p.waitForTimeout(200)
// float tools by dragging the grip
const grip = await p.locator('button[aria-label="Float the tools"]').boundingBox()
await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2); await p.mouse.down(); await p.mouse.move(400, 300, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400)
console.log('floating toolbar present', await p.locator('[role=toolbar][aria-label=Tools]').count(), 'docked rail present', await p.locator('aside[aria-label=Tools]').count())
await p.screenshot({ path: out + 'e-float2.png' })
// move it
let hb = await p.locator('[role=toolbar][aria-label=Tools] span[title^="Drag to move"]').boundingBox()
await p.mouse.move(hb.x + hb.width / 2, hb.y + 6); await p.mouse.down(); await p.mouse.move(hb.x + 400, hb.y + 120, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200)
// reshape to one row
let rh = await p.locator('[role=toolbar][aria-label=Tools] span[title^="Drag to reshape"]').boundingBox()
await p.mouse.move(rh.x + 6, rh.y + 6); await p.mouse.down(); await p.mouse.move(rh.x + 600, rh.y + 6, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300)
console.log('toolbar layout', await p.evaluate(() => JSON.parse(localStorage.getItem('vc-ui-v1')).toolbar))
await p.screenshot({ path: out + 'e-float-row.png' })
// collapse
await p.click('button[aria-label="Collapse the tools"]'); await p.waitForTimeout(200)
await p.screenshot({ path: out + 'e-float-collapsed.png', clip: { x: 0, y: 0, width: 1440, height: 500 } })
await p.click('button[aria-label="Expand the tools"]'); await p.waitForTimeout(200)
// reshape to one column
rh = await p.locator('[role=toolbar][aria-label=Tools] span[title^="Drag to reshape"]').boundingBox()
await p.mouse.move(rh.x + 6, rh.y + 6); await p.mouse.down(); await p.mouse.move(rh.x - 700, rh.y + 6, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300)
await p.screenshot({ path: out + 'e-float-col.png' })
// tool still works from floating panel
await p.click('[role=toolbar][aria-label=Tools] button[aria-label^="Brush"]'); console.log('tool after click', await p.evaluate(() => window.__voidEditor.getState().tool))
// ---- boards ----
await p.evaluate(() => { const s = window.__voidEditor.getState(); s.addFrame({ name: 'Post', width: 1080, height: 1080 }); s.addFrame({ name: 'Story', width: 1080, height: 1920 }); s.setActiveFrame(window.__voidEditor.getState().doc.frames[0].id) })
await p.evaluate(() => { const s = window.__voidEditor.getState(); s.addBlank() })
await p.keyboard.press('v'); await p.keyboard.press('Shift+1'); await p.waitForTimeout(500)
const before = await p.evaluate(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames.find(f => f.name === 'Post'); const l = s.layers.find(l => l.frameId === f.id); return { fx: f.x, fy: f.y, lx: l?.x, ly: l?.y, v: s.view } })
await p.screenshot({ path: out + 'e-boards-before.png' })
console.log('before', JSON.stringify(before))
// find the Story badge: its screen position is above the board's top-left
const st = await p.evaluate(() => { const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); return { x: r.left, y: r.top } })
const bx = st.x + before.fx * before.v.zoom + before.v.panX + 30, by = st.y + before.fy * before.v.zoom + before.v.panY - 17
await p.mouse.move(bx, by); await p.waitForTimeout(100)
console.log('cursor over badge', await p.evaluate(() => getComputedStyle(document.querySelector('.touch-none.select-none')).cursor))
await p.mouse.down(); await p.mouse.move(bx + 500, by + 420, { steps: 20 }); await p.mouse.up(); await p.waitForTimeout(400)
const after = await p.evaluate(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames.find(f => f.name === 'Post'); const o = s.doc.frames.find(f => f.name === 'Story'); const l = s.layers.find(l => l.frameId === f.id); return { fx: f.x, fy: f.y, lx: l?.x, ly: l?.y, post: [o.x, o.y], doc: [s.doc.width, s.doc.height], hist: s.history[s.historyIndex]?.label } })
console.log('after', JSON.stringify(after))
await p.screenshot({ path: out + 'e-boards-after.png' })
await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
console.log('after undo', await p.evaluate(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames.find(f => f.name === 'Post'); return [f.x, f.y] }))
await c.close(); await b.close()
console.log('page errors', errs)
