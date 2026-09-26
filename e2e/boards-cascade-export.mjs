// Boards: cascade a three-panel banner to other sizes, + buttons, export picker, per-board PNG zip and multi-page PDF, sharp zoom.
import fs from 'node:fs'
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = process.env.OUT || '/tmp/claude-0/bc/'
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch(); const errs = []
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true })
const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message))
await p.goto(BASE + '/editor'); await p.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })

// A banner like the Black Diamond one: 9850 x 2770, logo + offer | photo strip | stone event panel.
await p.evaluate(() => {
  const S = window.__voidEditor
  let n = 0; const id = () => 'L' + (++n)
  const cv = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); paint(x, w, h); return c }
  const base = (o) => ({ visible: true, locked: false, opacity: 1, blend: 'source-over', scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: false, rev: 1, frameId: 'F', ...o })
  const text = (o) => base({ type: 'text', fontFamily: 'Inter', fontWeight: 600, italic: false, color: '#111', align: 'left', lineHeight: 1.1, letterSpacing: 0, id: id(), ...o })
  const shape = (o) => base({ type: 'shape', shape: 'rect', fill: '#111', stroke: null, strokeWidth: 0, radius: 0, id: id(), ...o })
  const ras = (o, w, h, paint) => base({ type: 'raster', canvas: cv(w, h, paint), id: id(), ...o })
  const layers = [
    // logo group: emblem + three words
    shape({ name: 'Emblem', shape: 'ellipse', x: 1150, y: 700, w: 500, h: 500, groupId: 'gLogo' }),
    text({ name: 'BLACK', text: 'BLACK', fontSize: 330, x: 700, y: 1250, groupId: 'gLogo' }),
    text({ name: 'DIAMOND', text: 'DIAMOND', fontSize: 330, x: 520, y: 1600, groupId: 'gLogo' }),
    text({ name: 'HOTEL', text: 'HOTEL', fontSize: 170, x: 1030, y: 1960, groupId: 'gLogo' }),
    // offer group
    text({ name: 'Kicker', text: 'NIGERIA INDEPENDENCE DAY', fontSize: 80, letterSpacing: 24, color: '#7a6a4f', x: 2750, y: 1000, groupId: 'gOffer' }),
    text({ name: 'Offer', text: '15% off', fontSize: 560, fontWeight: 500, x: 2700, y: 1150, groupId: 'gOffer' }),
    text({ name: 'Stay', text: 'your stay', fontSize: 300, italic: true, color: '#7a6a4f', x: 2720, y: 1750, groupId: 'gOffer' }),
    text({ name: 'Dates', text: '1-2 OCTOBER', fontSize: 110, letterSpacing: 30, x: 3150, y: 2150, groupId: 'gOffer' }),
    // photo strip
    ras({ name: 'Tower photo', x: 5050, y: 0, scaleX: 1500 / 750, scaleY: 2770 / 1385 }, 750, 1385, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#a9d1ff'); g.addColorStop(1, '#2f6db8'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#eee'; for (let i = 0; i < 20; i++) x.fillRect(w * 0.4 + i * 10, h * 0.4 + i * 40, w * 0.5, 20) }),
    // stone panel
    shape({ name: 'Stone', x: 6550, y: 0, w: 3300, h: 2770, fill: '#e2dccb', groupId: 'gStone' }),
    text({ name: 'At', text: 'NIGERIA INDEPENDENCE DAY AT', fontSize: 70, letterSpacing: 20, color: '#7a6a4f', x: 6900, y: 480, groupId: 'gStone' }),
    text({ name: 'Farfallino', text: 'Farfallino', fontSize: 380, italic: true, x: 6880, y: 600, groupId: 'gStone' }),
    text({ name: 'When', text: '1st October · From 7 PM', fontSize: 190, x: 6900, y: 1060, groupId: 'gStone' }),
    ras({ name: 'Band', x: 6900, y: 1400, scaleX: 2, scaleY: 2 }, 690, 380, (x, w, h) => { x.fillStyle = '#6b4a2f'; x.fillRect(0, 0, w, h); x.fillStyle = '#e9b44c'; x.fillRect(w * .3, h * .3, w * .2, h * .6) }),
    ras({ name: 'Drink', x: 8450, y: 1400, scaleX: 2, scaleY: 2 }, 690, 380, (x, w, h) => { x.fillStyle = '#c8a45a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.fillRect(w * .5, h * .2, w * .1, h * .6) }),
    text({ name: 'Reserve', text: 'For reservations 0911 979 5797', fontSize: 120, x: 6900, y: 2350, groupId: 'gStone' }),
  ]
  // the two photos belong to the stone group too
  layers.filter(l => l.name === 'Band' || l.name === 'Drink').forEach(l => l.groupId = 'gStone')
  // keep group members together in the stack
  const order = ['gLogo', 'gOffer', undefined, 'gStone']
  layers.sort((a, b) => order.indexOf(a.groupId) - order.indexOf(b.groupId))
  const groups = [
    { id: 'gLogo', name: 'Logo', visible: true, opacity: 1, collapsed: false },
    { id: 'gOffer', name: 'Offer', visible: true, opacity: 1, collapsed: false },
    { id: 'gStone', name: 'Farfallino', visible: true, opacity: 1, collapsed: false },
  ]
  S.getState().loadFramed({ id: 'D', name: 'R2 Banner', width: 9850, height: 2770, background: null, frames: [{ id: 'F', name: 'R2 Banner', x: 0, y: 0, width: 9850, height: 2770, background: '#ede7dc' }] }, layers, undefined, groups)
})
await p.waitForTimeout(1200)
await p.screenshot({ path: out + '01-master.png' })

// Panels found
const panels = await p.evaluate(async () => { const m = await import('/_next/static/chunks/x').catch(() => null); return null })
// Open Boards > Cascade
await p.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' }))); await p.waitForTimeout(400)
await p.click('button[role=tab]:has-text("Cascade")'); await p.waitForTimeout(2500)
await p.screenshot({ path: out + '02-cascade-dialog.png' })
const chips = await p.$$eval('button[aria-pressed]', bs => bs.map(b => b.textContent.trim()).filter(t => t.length < 40))
console.log('dialog buttons', chips.join(' | '))
await p.click('button:has-text("Create")'); await p.waitForTimeout(1500)
const state = await p.evaluate(() => { const s = window.__voidEditor.getState(); return { frames: s.doc.frames.map(f => [f.name, f.x, f.y, f.width, f.height]), groups: s.groups.length, hist: s.history.map(h => h.label).slice(-2), idx: s.historyIndex } })
console.log('after cascade', JSON.stringify(state))
// overlap check
const ov = await p.evaluate(() => { const fs = window.__voidEditor.getState().doc.frames; const bad = []; for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) { const a = fs[i], b = fs[j]; if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) bad.push([a.name, b.name]) } return bad })
console.log('overlapping boards', JSON.stringify(ov))
// groups never span boards
const span = await p.evaluate(() => { const s = window.__voidEditor.getState(); const m = new Map(); for (const l of s.layers) if (l.groupId) { const k = m.get(l.groupId) ?? new Set(); k.add(l.frameId); m.set(l.groupId, k) } return [...m.values()].filter(v => v.size > 1).length })
console.log('groups spanning boards', span)
await p.keyboard.press('Shift+1'); await p.waitForTimeout(800)
await p.screenshot({ path: out + '03-canvas-after-cascade.png' })

// Export: every board as its own PNG, and a 5-page PDF
await p.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'export' }))); await p.waitForTimeout(1500)
await p.screenshot({ path: out + '04-export-dialog.png' })
await p.click('button:has-text("All ")'); await p.waitForTimeout(300)
await p.screenshot({ path: out + '05-export-all.png' })
let [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download")')])
await dl.saveAs(out + 'boards.zip'); console.log('zip', dl.suggestedFilename(), fs.statSync(out + 'boards.zip').size)
await p.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'export' }))); await p.waitForTimeout(800)
await p.click('button[role=radio]:has-text("PDF")'); await p.fill('input[placeholder="1-3, 5"]', '1-5'); await p.waitForTimeout(300)
const label = await p.textContent('button:has-text("Download")'); console.log('pdf button', label)
;[dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download")')])
await dl.saveAs(out + 'boards.pdf'); const pdf = fs.readFileSync(out + 'boards.pdf', 'latin1'); console.log('pdf', dl.suggestedFilename(), 'pages', (pdf.match(/\/Type \/Page\b/g) || []).length, 'media', (pdf.match(/MediaBox \[[^\]]+\]/g) || []).join(' '))

// Undo removes the cascade in one step
const nBefore = await p.evaluate(() => window.__voidEditor.getState().doc.frames.length)
await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
console.log('frames before/after undo', nBefore, await p.evaluate(() => window.__voidEditor.getState().doc.frames.length))
await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(300)

// + buttons: click the one on the right of the active (master) board
await p.evaluate(() => { const s = window.__voidEditor.getState(); s.setActiveFrame(s.doc.frames[0].id); s.setTool?.('move') })
await p.keyboard.press('v'); await p.keyboard.press('Shift+1'); await p.waitForTimeout(600)
const pos = await p.evaluate(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames[0]; const v = s.view; const r = document.querySelector('.touch-none.select-none').getBoundingClientRect(); return { x: r.left + v.panX + (f.x + f.width) * v.zoom + 24, y: r.top + v.panY + (f.y + f.height / 2) * v.zoom } })
await p.mouse.move(pos.x, pos.y); await p.waitForTimeout(200)
await p.screenshot({ path: out + '06-plus-hover.png' })
await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(600)
console.log('after + click', await p.evaluate(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames[s.doc.frames.length - 1]; return [f.name, f.x, f.y, s.layers.filter(l => l.frameId === f.id).length, s.history[s.historyIndex].label] }))
await p.keyboard.press('Shift+1'); await p.waitForTimeout(800)
await p.screenshot({ path: out + '07-after-duplicate.png' })

// Sharp zoom: zoom to 300% on the Offer text of the master
await p.evaluate(() => { const s = window.__voidEditor.getState(); const f = s.doc.frames[0]; s.setView({ zoom: 3, panX: -(f.x + 2700) * 3 + 100, panY: -(f.y + 1150) * 3 + 100 }) })
await p.waitForTimeout(700)
await p.screenshot({ path: out + '08-zoom-300.png' })
console.log('errors', errs)
await b.close()
