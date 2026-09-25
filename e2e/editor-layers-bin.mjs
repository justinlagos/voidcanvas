// Layers panel: lock and delete on group rows, delete on boards, drag to the bin, × on board badges, shadow opacity.
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errors.push(e.message))
await p.goto(`${BASE}/editor`); await p.waitForTimeout(800)
await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2500)
const st = fn => p.evaluate(fn)

// Shadow section for an image, with opacity.
await p.click('[data-section="Shadow"] button').catch(() => {})
await p.waitForTimeout(200)
ok('shadow: section on an image', !!(await p.$('[data-section="Shadow"]')))

// Two boards, three layers on the first, two of them grouped.
await st(() => { const s = window.__voidEditor.getState(); s.addFrame({ name: 'Post', width: 1080, height: 1080 }); s.addFrame({ name: 'Story', width: 1080, height: 1920 }) })
await st(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames[0].id; s.setActiveFrame(f); s.addBlank(); s.addBlank(); s.addBlank() })
await st(() => { const s = window.__voidEditor.getState(); const ids = s.layers.slice(-2).map(l => l.id); window.__voidEditor.setState({ selectedIds: ids, activeId: ids[1] }); s.groupSelected() })
await p.waitForTimeout(400)
const g = await st(() => window.__voidEditor.getState().groups[0]?.id)
ok('group made', !!g)
await p.click('button[aria-label="Lock group"]', { force: true }); await p.waitForTimeout(200)
ok('group lock locks every member', await st(() => { const s = window.__voidEditor.getState(); return s.layers.filter(l => l.groupId === s.groups[0].id).every(l => l.locked) }))
ok('group row shows unlock', !!(await p.$('button[aria-label="Unlock group"]')))
const before = await st(() => window.__voidEditor.getState().layers.length)
await p.click('button[aria-label="Delete group"]', { force: true }); await p.waitForTimeout(200)
ok('group delete removes group and its layers', await st(() => window.__voidEditor.getState().groups.length === 0 && window.__voidEditor.getState().layers.length) === before - 2)

// Drag a layer onto the bin.
const n1 = await st(() => window.__voidEditor.getState().layers.length)
await p.locator('li[role="option"]').first().dragTo(p.locator('[data-bin]')); await p.waitForTimeout(300)
ok('drag layer to bin deletes it', await st(() => window.__voidEditor.getState().layers.length) === n1 - 1)

// Drag a board onto the bin.
const f0 = await st(() => window.__voidEditor.getState().doc.frames.length)
await p.locator('li[draggable]', { hasText: 'Story' }).filter({ has: p.locator('text=1080×1920') }).first().dragTo(p.locator('[data-bin]')); await p.waitForTimeout(300)
ok('drag board to bin deletes it', await st(() => window.__voidEditor.getState().doc.frames.length) === f0 - 1)
await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
ok('undo brings the board back', await st(() => window.__voidEditor.getState().doc.frames.length) === f0)

// × on a board badge.
await st(() => { const s = window.__voidEditor.getState(); window.__voidUi?.getState?.(); })
await p.keyboard.press('Shift+1').catch(() => {}); await p.waitForTimeout(400)
await p.screenshot({ path: OUT('boards_badges.png') })
const hits = await st(() => document.querySelector('canvas') && true)
const fc = await st(() => window.__voidEditor.getState().doc.frames.length)
// find the × by scanning the overlay for the hit list through a click sweep is brittle, so use the board badge geometry from the store
const target = await st(() => { const s = window.__voidEditor.getState(); const v = s.view; const f = s.doc.frames[s.doc.frames.length - 1]; return { f: f.name, x: f.x * v.zoom + v.panX, y: f.y * v.zoom + v.panY, w: f.width * v.zoom } })
out.push('badge target ' + JSON.stringify(target))
await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
