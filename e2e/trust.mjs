// Trust: nothing the designer did is lost or silently destroyed. Saving, reopening, two tabs, and the
// layer operations that used to delete or hide work. Ends with a random walk of store actions that
// checks the design's rules (src/editor/invariants.ts) after every step and a save round trip.
import { chromium, devices } from 'playwright'
import { FIX } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []

const idbProject = (p, id) => p.evaluate(id => new Promise(res => {
  const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const g = db.transaction('projects').objectStore('projects').get(id); g.onsuccess = () => { res(g.result ? { layers: g.result.layers.map(l => ({ id: l.id, type: l.type, text: l.text, name: l.name, frameId: l.frameId ?? null })), name: g.result.doc.name } : null); db.close() }; g.onerror = () => { res(null); db.close() } }; r.onerror = () => res(null)
}), id)
const idbVersions = (p, id) => p.evaluate(id => new Promise(res => {
  const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const g = db.transaction('versionIndex').objectStore('versionIndex').getAll(); g.onsuccess = () => { res(g.result.filter(v => v.docId === id).length); db.close() } }
}), id)
const E = (p, f, a) => p.evaluate(f, a)
const fresh = async (p, name = 'Trust') => { await E(p, n => { const s = window.__voidEditor.getState(); s.newDoc({ name: n, width: 1200, height: 900, background: '#ffffff' }) }, name); await p.waitForTimeout(150) }
const shape = (p, x, y, w = 120, h = 120, fill = '#ff0000', extra = {}) => E(p, ([x, y, w, h, fill, extra]) => window.__voidEditor.getState().addShape('rect', x, y, w, h, { fill, ...extra }), [x, y, w, h, fill, extra])
const check = p => E(p, () => window.__vcCheck())
const toScreen = (p, dx, dy) => E(p, ([dx, dy]) => { const s = window.__voidEditor.getState(); const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); const v = s.view; return { x: r.left + v.panX + dx * v.zoom, y: r.top + v.panY + dy * v.zoom } }, [dx, dy])
const boards = p => E(p, () => { const s = window.__voidEditor.getState(); s.addFrame({ name: 'A', width: 600, height: 600 }); s.addFrame({ name: 'B', width: 600, height: 600 }); const f = window.__voidEditor.getState().doc.frames; s.setActiveFrame(f.find(x => x.name === 'A').id); return f.map(x => ({ id: x.id, name: x.name, x: x.x, y: x.y })) })

// ───────────────────────────── desktop ─────────────────────────────
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept())
await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForFunction(() => window.__voidEditor?.getState().layers.length > 0)

// Closing straight after an edit keeps the edit.
await fresh(p, 'Close fast')
await E(p, () => { const E = window.__voidEditor; E.getState().addText(100, 100); E.setState({ editingTextId: null }); const t = E.getState().layers.at(-1); E.getState().updateLayer(t.id, { text: 'Kept' }, 'Edit text'); E.getState().closeDoc() })
await p.waitForTimeout(1000)
const recents = await p.$$eval('section:has-text("Pick up where you left off") button', els => els.map(e => e.textContent))
ok('save: closing within a moment of an edit keeps it', recents.some(t => /Close fast/.test(t)), JSON.stringify(recents.slice(0, 3)))
await p.locator('section:has-text("Pick up where you left off") button:has-text("Close fast")').first().click(); await p.waitForTimeout(1200)
ok('save: the edit is in the reopened design', await E(p, () => window.__voidEditor.getState().layers.some(l => l.type === 'text' && l.text === 'Kept')))

// An edit made while a save is writing is not marked saved, and lands in the next save.
let docId = await E(p, () => window.__voidEditor.getState().doc.id)
const racing = await E(p, async () => {
  const s = window.__voidEditor.getState(); const t = s.layers.find(l => l.type === 'text')
  s.updateLayer(t.id, { text: 'First' }, 'Edit text')
  const saving = window.__vcSave.flush()
  await new Promise(r => setTimeout(r, 0))
  window.__voidEditor.getState().updateLayer(t.id, { text: 'Second' })
  await saving
  return { unsaved: window.__vcSave.unsaved(), dirty: window.__voidEditor.getState().dirty }
})
ok('save: a change during a save stays unsaved until written', racing.unsaved && racing.dirty, JSON.stringify(racing))
await p.waitForTimeout(2500)
const stored = await idbProject(p, docId)
ok('save: the change made during the save reaches storage', stored?.layers.some(l => l.text === 'Second'), JSON.stringify(stored?.layers.map(l => l.text)))
ok('save: marked saved once written', !(await E(p, () => window.__vcSave.unsaved())) && !(await E(p, () => window.__voidEditor.getState().dirty)))

// Reload opens the design again, on the same board, zoom and selection.
await fresh(p, 'Reload me')
const bs = await boards(p)
const sel = await shape(p, bs[1].x + 50, bs[1].y + 50)
await E(p, ([fid, id]) => { const s = window.__voidEditor.getState(); s.setActiveFrame(fid); s.setActive(id); s.setView({ zoom: 0.8, panX: 40, panY: 30 }) }, [bs[1].id, sel])
await p.waitForTimeout(1800)
const before = await E(p, () => { const s = window.__voidEditor.getState(); return { id: s.doc.id, frame: s.activeFrameId, zoom: s.view.zoom, sel: s.selectedIds } })
await p.reload(); await p.waitForFunction(() => !!window.__voidEditor?.getState().doc, null, { timeout: 8000 }).catch(() => {})
await p.waitForTimeout(800)
const after = await E(p, () => { const s = window.__voidEditor.getState(); return s.doc ? { id: s.doc.id, frame: s.activeFrameId, zoom: s.view.zoom, sel: s.selectedIds } : null })
ok('reopen: a reload opens the design again', after?.id === before.id, JSON.stringify(after))
ok('reopen: same board', after?.frame === before.frame)
ok('reopen: same zoom', after && Math.abs(after.zoom - before.zoom) < 0.01, `${after?.zoom}`)
ok('reopen: same selection', after && after.sel.join() === before.sel.join())

// Two tabs on one design: the older tab writes its changes and closes it; the new tab has them.
const pA = p
await fresh(pA, 'Two tabs')
await shape(pA, 50, 50); await pA.waitForTimeout(1800)
await shape(pA, 300, 300, 100, 100, '#00ff00')
const twoId = await E(pA, () => window.__voidEditor.getState().doc.id)
const pB = await ctx.newPage(); pB.on('pageerror', e => errors.push(e.message))
await pB.goto(`${BASE}/editor?project=${twoId}`); await pB.waitForFunction(() => !!window.__voidEditor?.getState().doc, null, { timeout: 8000 })
await pB.waitForTimeout(2500)
ok('two tabs: the first tab closed the design', !(await E(pA, () => !!window.__voidEditor.getState().doc)))
ok('two tabs: the first tab says why', /opened in another tab/.test(await E(pA, () => window.__voidEditor.getState().toast?.msg ?? '')))
ok('two tabs: the new tab has the change the first had not saved', (await E(pB, () => window.__voidEditor.getState().layers.filter(l => l.type === 'shape').length)) === 2)
await pB.close()
await pA.locator('section:has-text("Pick up where you left off") button').first().click(); await pA.waitForTimeout(1200)

// Alt with a click is a gesture, not the menu. Alt on its own still opens it.
await fresh(p, 'Alt')
let c = await toScreen(p, 600, 450)
await p.keyboard.down('Alt'); await p.mouse.click(c.x, c.y); await p.keyboard.up('Alt'); await p.waitForTimeout(250)
ok('alt: Alt-click on the canvas opens no menu', !(await E(p, () => !![...document.querySelectorAll('[role=menu]')].find(m => m.getBoundingClientRect().height > 0))))
await p.keyboard.press('Alt'); await p.waitForTimeout(250)
ok('alt: tapping Alt alone still opens the menu', await E(p, () => !![...document.querySelectorAll('[role=menu]')].find(m => m.getBoundingClientRect().height > 0)))
await p.keyboard.press('Escape')

// Merge visible keeps hidden layers, including those in hidden groups, in their place.
await fresh(p, 'Merge visible')
const h1 = await shape(p, 50, 50), h2 = await shape(p, 200, 50), v1 = await shape(p, 400, 400), v2 = await shape(p, 600, 400)
await E(p, ([a, b]) => { const s = window.__voidEditor.getState(); s.setActive(a); s.toggleSelect(b); s.groupSelected(); const gid = window.__voidEditor.getState().layers.find(l => l.id === a).groupId; window.__voidEditor.getState().updateGroup(gid, { visible: false }, 'Hide') }, [h1, h2])
await p.keyboard.press('Control+Shift+e'); await p.waitForTimeout(400)
const mv = await E(p, ([a, b, c, d]) => { const s = window.__voidEditor.getState(); return { hidden: [a, b].every(id => s.layers.some(l => l.id === id)), merged: ![c, d].some(id => s.layers.some(l => l.id === id)), n: s.layers.length } }, [h1, h2, v1, v2])
ok('merge visible: layers in a hidden group are kept', mv.hidden, JSON.stringify(mv))
ok('merge visible: the visible layers are merged', mv.merged && mv.n === 3)
ok('merge visible: rules hold', (await check(p)).length === 0, JSON.stringify(await check(p)))

// Locked layers are never picked up by a marquee or deleted by Delete.
await fresh(p, 'Locks')
const lk = await shape(p, 300, 300, 200, 200, '#333333', { locked: true })
await E(p, () => window.__voidEditor.getState().setActive(null))
const m1 = await toScreen(p, 250, 250), m2 = await toScreen(p, 560, 560)
await p.mouse.move(m1.x, m1.y); await p.mouse.down(); await p.mouse.move(m2.x, m2.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150)
ok('locks: a marquee does not select a locked layer', !(await E(p, id => window.__voidEditor.getState().selectedIds.includes(id), lk)))
await E(p, id => window.__voidEditor.getState().setActive(id), lk); await p.keyboard.press('Delete'); await p.waitForTimeout(150)
ok('locks: Delete keeps a locked layer and says so', (await E(p, id => window.__voidEditor.getState().layers.some(l => l.id === id), lk)) && /locked/i.test(await E(p, () => window.__voidEditor.getState().toast?.msg ?? '')))
ok('locks: number fields do not move a locked layer', await E(p, id => { const s = window.__voidEditor.getState(); const x0 = s.layers.find(l => l.id === id).x; s.setLayerBox(id, { x: 10 }); return window.__voidEditor.getState().layers.find(l => l.id === id).x === x0 }, lk))

// Merge down and rasterize on a board keep the board, so the result stays in the Layers panel.
await fresh(p, 'Boards keep')
let bb = await boards(p)
const lo = await shape(p, bb[0].x + 50, bb[0].y + 50, 200, 200, '#00aa00', { role: 'image' })
const hi = await shape(p, bb[0].x + 120, bb[0].y + 120, 200, 200, '#aa00aa')
await E(p, id => window.__voidEditor.getState().mergeDown(id), hi); await p.waitForTimeout(250)
const md = await E(p, () => { const l = window.__voidEditor.getState().active(); return { name: l.name, frameId: l.frameId, role: l.role } })
ok('merge down: keeps the board', md.frameId === bb[0].id, JSON.stringify(md))
ok('merge down: the result is in the Layers panel', await E(p, n => [...document.querySelectorAll('[role=listbox][aria-label=Layers] [role=option]')].some(e => e.textContent.includes(n)), md.name))
const tx = await E(p, fid => { const E = window.__voidEditor; E.getState().setActiveFrame(fid); E.getState().addText(); E.setState({ editingTextId: null }); const t = E.getState().layers.at(-1); E.getState().updateLayer(t.id, { text: 'Raster me', role: 'headline', label: 'red' }, 'Edit text'); return t.id }, bb[0].id)
await E(p, id => { const s = window.__voidEditor.getState(); s.rasterize(id); s.commit('Rasterize') }, tx)
const rz = await E(p, id => { const l = window.__voidEditor.getState().layers.find(l => l.id === id); return { type: l.type, frameId: l.frameId, role: l.role, label: l.label } }, tx)
ok('rasterize: keeps board, role and colour label', rz.type === 'raster' && rz.frameId === bb[0].id && rz.role === 'headline' && rz.label === 'red', JSON.stringify(rz))

// Paste in place lands where it was copied, on that board, even with another board active.
await fresh(p, 'Paste in place')
bb = await boards(p)
const pa = await shape(p, bb[0].x + 100, bb[0].y + 100, 150, 150, '#0099ff')
await E(p, id => window.__voidEditor.getState().setActive(id), pa)
await p.keyboard.press('Control+c'); await p.waitForTimeout(500)
await E(p, fid => window.__voidEditor.getState().setActiveFrame(fid), bb[1].id)
await p.keyboard.press('Control+Shift+v'); await p.waitForTimeout(400)
const pasted = await E(p, () => { const s = window.__voidEditor.getState(); const l = s.active(); return { id: l.id, name: l.name, frameId: l.frameId } })
ok('paste in place: lands on the board it came from', pasted.frameId === bb[0].id, JSON.stringify(pasted))

// Undoing a new board puts the active board back on one that exists.
await E(p, () => window.__voidEditor.getState().addFrame({ name: 'Extra', width: 500, height: 500 }))
await E(p, () => window.__voidEditor.getState().undo())
ok('undo: the active board exists after undoing a new board', await E(p, () => { const s = window.__voidEditor.getState(); return s.doc.frames.some(f => f.id === s.activeFrameId) }))
await E(p, () => { const s = window.__voidEditor.getState(); s.addText(); }); await p.keyboard.type('On a real board'); await p.keyboard.press('Escape'); await p.waitForTimeout(150)
ok('undo: new text after that lands on a real board', await E(p, () => { const s = window.__voidEditor.getState(); const t = s.layers.filter(l => l.type === 'text').at(-1); return !!t && s.doc.frames.some(f => f.id === t.frameId) }))
const pastedId = pasted.id
await E(p, ([a, b]) => { const s = window.__voidEditor.getState(); s.setActive(a); s.toggleSelect(b) }, [pa, pastedId])
await E(p, () => window.__voidEditor.getState().addFrame({ name: 'Extra', width: 500, height: 500 }))
await E(p, () => window.__voidEditor.getState().undo())
ok('undo: brings back a multi-selection', (await E(p, () => window.__voidEditor.getState().selectedIds.length)) === 2)

// Cut takes the layer when there is no pixel selection.
await fresh(p, 'Cut')
const ct = await shape(p, 300, 300)
const ctBefore = await E(p, id => { const l = window.__voidEditor.getState().layers.find(l => l.id === id); return { name: l.name, x: l.x, y: l.y } }, ct)
await E(p, id => window.__voidEditor.getState().setActive(id), ct); await p.keyboard.press('Control+x'); await p.waitForTimeout(500)
ok('cut: removes the layer when nothing is selected', !(await E(p, id => window.__voidEditor.getState().layers.some(l => l.id === id), ct)))
await p.keyboard.press('Control+Shift+v'); await p.waitForTimeout(400)
const ctAfter = await E(p, () => { const l = window.__voidEditor.getState().active(); return l && { name: l.name, x: l.x, y: l.y } })
ok('cut: pastes back in place with its name', !!ctAfter && ctAfter.name === ctBefore.name && Math.abs(ctAfter.x - ctBefore.x) < 0.5 && Math.abs(ctAfter.y - ctBefore.y) < 0.5, JSON.stringify([ctBefore, ctAfter]))

// Duplicates are their own layers with sensible names.
await fresh(p, 'Duplicates')
const d0 = await shape(p, 100, 100, 100, 100, '#123456', { linkId: 'L1', srcId: 'S1' })
await E(p, id => { const s = window.__voidEditor.getState(); s.duplicateLayer(id); s.duplicateLayer(id) }, d0)
const dn = await E(p, () => window.__voidEditor.getState().layers.map(l => ({ name: l.name, linkId: l.linkId ?? null, srcId: l.srcId ?? null })))
ok('duplicate: names Rectangle 2 and 3', dn.map(x => x.name).sort().join() === 'Rectangle,Rectangle 2,Rectangle 3', dn.map(x => x.name).join())
ok('duplicate: copies are not linked to the original', dn.slice(1).every(x => !x.linkId && !x.srcId))

// Deleting a design deletes its version history.
await fresh(p, 'Delete versions')
await shape(p, 100, 100); await p.keyboard.press('Control+Alt+s'); await p.waitForTimeout(1500)
const dvId = await E(p, () => window.__voidEditor.getState().doc.id)
ok('delete: a version exists first', (await idbVersions(p, dvId)) >= 1)
await E(p, () => window.__voidEditor.getState().closeDoc()); await p.waitForTimeout(900)
const card = p.locator('section:has-text("Pick up where you left off") div.group:has-text("Delete versions")').first()
await card.hover(); await card.locator('button[aria-label^="Actions for"]').click(); await p.locator('button:has-text("Delete")').last().click(); await p.waitForTimeout(800)
ok('delete: its versions are gone too', (await idbVersions(p, dvId)) === 0)

// One export is counted once.
await p.locator('section:has-text("Pick up where you left off") button').first().click(); await p.waitForTimeout(1200)
const n0 = await E(p, () => Number(localStorage.getItem('vc-exports') || '0'))
await p.keyboard.press('Control+e'); await p.waitForSelector('[role=dialog]')
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.locator('[role=dialog] button:has-text("Download")').last().click()])
await p.waitForTimeout(500)
ok('export: one download counts once', (await E(p, () => Number(localStorage.getItem('vc-exports') || '0'))) - n0 === 1, dl.suggestedFilename())

// Random walk: 500 store actions per seed, the design's rules checked after every one, then a save round trip.
for (const seed of [7, 101, 997]) {
await fresh(p, 'Random walk ' + seed)
const walk = await E(p, async seed0 => {
  const E = window.__voidEditor; const g = () => E.getState()
  let seed = seed0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const pick = a => a[Math.floor(rnd() * a.length)]
  const any = () => { const L = g().layers; return L.length ? pick(L) : null }
  const acts = {
    shape: () => { const d = g().doc; const f = d.frames?.length ? pick(d.frames) : { x: 0, y: 0, width: d.width, height: d.height }; g().addShape(pick(['rect', 'ellipse']), f.x + rnd() * f.width * 0.8, f.y + rnd() * f.height * 0.8, 40 + rnd() * 200, 40 + rnd() * 200, { fill: '#' + Math.floor(rnd() * 0xffffff).toString(16).padStart(6, '0') }) },
    text: () => { g().addText(); const t = g().layers.at(-1); g().updateLayer(t.id, { text: 'Word ' + Math.floor(rnd() * 99) }, 'Edit text'); E.setState({ editingTextId: null }) },
    dup: () => { const l = any(); if (l) g().duplicateLayer(l.id) },
    del: () => { const l = any(); if (l) { g().setActive(l.id); g().removeSelected() } },
    group: () => { const a = any(), b = any(); if (a && b && a.id !== b.id) { g().setActive(a.id); g().toggleSelect(b.id); g().groupSelected() } },
    ungroup: () => { const l = g().layers.find(x => x.groupId); if (l) g().ungroup(l.groupId) },
    undo: () => g().undo(), redo: () => g().redo(),
    merge: () => { const l = any(); if (l) g().mergeDown(l.id) },
    raster: () => { const l = g().layers.find(x => x.type !== 'raster' && x.type !== 'adjustment'); if (l) { g().rasterize(l.id); g().commit('Rasterize') } },
    move: () => { const l = any(); if (l) g().moveLayer(l.id, Math.floor(rnd() * g().layers.length)) },
    frame: () => g().addFrame({ name: 'F' + Math.floor(rnd() * 99), width: 300 + Math.floor(rnd() * 500), height: 300 + Math.floor(rnd() * 500) }),
    unframe: () => { const f = g().doc.frames; if (f?.length > 1) g().removeFrame(pick(f).id) },
    activeFrame: () => { const f = g().doc.frames; if (f?.length) g().setActiveFrame(pick(f).id) },
    hideGroup: () => { const gr = g().groups; if (gr.length) { const x = pick(gr); g().updateGroup(x.id, { visible: !x.visible }, 'Visibility') } },
    lock: () => { const l = any(); if (l) g().updateLayer(l.id, { locked: !l.locked }, 'Lock') },
    align: () => { const a = any(), b = any(); if (a && b) { g().setActive(a.id); if (a.id !== b.id) g().toggleSelect(b.id); g().align(pick(['left', 'hcenter', 'top'])) } },
    clip: () => { const l = any(); if (l && g().canClip(l.id)) g().createClippingMask(l.id) },
    unclip: () => { const l = g().layers.find(x => x.clipId); if (l) g().releaseClippingMask(l.id) },
    flip: () => { const l = g().layers.find(x => x.type === 'shape' && !x.locked); if (l) g().flip(l.id, 'h') },
    boardMove: () => { const l = any(); const f = g().doc.frames; if (l && f?.length > 1) g().moveLayer(l.id, Math.floor(rnd() * g().layers.length), pick(f).id) },
  }
  const names = Object.keys(acts)
  const failures = []
  for (let i = 0; i < 500; i++) {
    const n = pick(names)
    try { acts[n]() } catch (e) { failures.push(`${i} ${n} threw ${e.message}`); break }
    const bad = window.__vcCheck()
    if (bad.length) { failures.push(`${i} after ${n}: ${bad.join('; ')}`); break }
  }
  await window.__vcSave.flush()
  return { failures, layers: g().layers.map(l => l.id), id: g().doc.id, frames: g().doc.frames?.length ?? 0 }
}, seed)
ok(`random walk ${seed}: 500 actions keep every rule`, walk.failures.length === 0, walk.failures.join(' | '))
const saved = await idbProject(p, walk.id)
ok(`random walk ${seed}: saved design matches what is open`, saved && saved.layers.map(l => l.id).join() === walk.layers.join(), `${saved?.layers.length} vs ${walk.layers.length}`)
}
await ctx.close()

// ───────────────────────────── phone ─────────────────────────────
const pc = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
const q = await pc.newPage(); q.on('pageerror', e => errors.push(e.message))
const cdp = await pc.newCDPSession(q)
await q.goto(`${BASE}/editor`); await q.waitForSelector('button:has-text("Open a photo")')
await (await q.$('input[type=file]')).setInputFiles(FIX.portrait); await q.waitForSelector('nav[aria-label="Modes"]')
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
const openMode = async (m, P = q) => {
  // With something picked, the bottom bar is that thing's tools: Settings is the old Select sheet, Effects its
  // effects. Any other mode is reached with Back first, as a person would.
  if (await P.$('[data-context-bar]')) {
    const ctx = { Select: 'settings', Effects: 'effects' }[m]
    if (ctx) { const b = P.locator(`[data-context-bar] button[data-ctx="${ctx}"]`); await b.scrollIntoViewIfNeeded(); if ((await b.getAttribute('aria-pressed')) !== 'true') await b.tap(); await P.waitForTimeout(300); return }
    await P.tap('[data-context-bar] button[aria-label="Back"]'); await P.waitForTimeout(300)
  }
  const btn = await P.$(`nav[aria-label="Modes"] button:has-text("${m}")`); if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.tap(); await P.waitForTimeout(300)
}
await openMode('Text'); await q.tap('button:has-text("Add heading")'); await q.waitForSelector('[data-canvas-text-editor]')
await q.keyboard.type('Night Session'); await q.tap('[data-text-edit-bar] button:has-text("Done")'); await q.waitForTimeout(300)
await openMode('Text'); await q.tap('button:has-text("Add heading")'); await q.waitForTimeout(300); await q.keyboard.type('Last words'); await q.tap('[data-text-edit-bar] button:has-text("Done")'); await q.waitForTimeout(120)
await q.tap('button[aria-label="Back to start"]')
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
await q.waitForTimeout(1500)
await q.locator('section:has-text("Pick up where you left off") button').first().tap(); await q.waitForTimeout(2000)
const texts = await E(q, () => window.__voidEditor.getState().layers.filter(l => l.type === 'text').map(l => l.text))
ok('phone: Back straight after typing keeps everything', texts.includes('Night Session') && texts.includes('Last words'), JSON.stringify(texts))
await q.waitForTimeout(1500)
await q.reload(); await q.waitForTimeout(2500)
ok('phone: a reload comes back to the design', !!(await q.$('nav[aria-label="Modes"]')))
await pc.close()

await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 5)); process.exitCode = 1 } else console.log('no page errors')
