// Phase 6: export finish and coming back. Every board exported and compared with the canvas, file names from
// a pattern, choices remembered per design (through a reload), the export record (kept through undo), the
// selection exported on its own and trimmed, SVG (vectors where they can be) and lossless print PDF, the
// after-export card (also needed, save as template, duplicate as variation), Home and landing status lines,
// exports from Home, and the coming-back analytics events.
import fs from 'node:fs'
import zlib from 'node:zlib'
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
// Usage events on (localhost has them off), captured here instead of sent.
const events = []
await ctx.route('**/rest/v1/events', async r => { try { events.push(...JSON.parse(r.request().postData() || '[]')) } catch { /* ignore */ } await r.fulfill({ status: 201, body: '' }) })
await ctx.addInitScript(() => {
  try { localStorage.setItem('vc-usage-dev', '1') } catch { /* ignore */ }
  // Mean difference (0 to 255) between two images, both drawn 64 px wide on white.
  window.__cmp = async (aUrl, bUrl, w = 64) => {
    const load = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image did not load')); i.src = u })
    const [a, b] = await Promise.all([load(aUrl), load(bUrl)])
    const h = Math.max(8, Math.round((w * b.naturalHeight) / b.naturalWidth))
    const px = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h); return x.getImageData(0, 0, w, h).data }
    const A = px(a), B = px(b); let d = 0
    for (let i = 0; i < A.length; i++) if (i % 4 !== 3) d += Math.abs(A[i] - B[i])
    return { mean: d / ((A.length / 4) * 3), aw: a.naturalWidth, ah: a.naturalHeight }
  }
})
const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept())
const E = (f, a) => p.evaluate(f, a)
const wait = ms => p.waitForTimeout(ms)
const st = f => E(f)
const dataUrl = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`
const unzip = buf => { const r = []; let o = 0; while (o + 30 <= buf.length && buf.readUInt32LE(o) === 0x04034b50) { const size = buf.readUInt32LE(o + 18), nl = buf.readUInt16LE(o + 26), xl = buf.readUInt16LE(o + 28); r.push({ name: buf.slice(o + 30, o + 30 + nl).toString(), data: buf.slice(o + 30 + nl + xl, o + 30 + nl + xl + size) }); o += 30 + nl + xl + size } return r }
const download = async click => { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), click()]); return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) } }
const openExport = async () => { await p.keyboard.press('Control+e'); await p.waitForSelector('[role=dialog]:has-text("Export")'); await wait(300) }
const dialogDownload = () => download(() => p.locator('[role=dialog] button:has-text("Download")').first().click())
const moreOptions = async () => { const m = p.locator('[role=dialog] button:has-text("More options")'); if ((await m.getAttribute('aria-expanded')) !== 'true') await m.click(); await wait(150) }

try {
  await p.goto(`${BASE}/editor`); await p.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })
  // Three boards: a post (photo, panel, ellipse with a stroke, star, headline), a story linked to it, and a
  // square with a blurred texture under an adjustment layer.
  await E(() => {
    const S = window.__voidEditor
    let n = 0; const id = () => 'L' + (++n)
    const cv = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c }
    const base = o => ({ visible: true, locked: false, opacity: 1, blend: 'source-over', scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: false, rev: 1, ...o })
    const text = o => base({ type: 'text', fontFamily: 'Inter', fontWeight: 700, italic: false, color: '#1d3557', align: 'left', lineHeight: 1.1, letterSpacing: 0, id: id(), ...o })
    const shape = o => base({ type: 'shape', shape: 'rect', fill: '#1d3557', stroke: null, strokeWidth: 0, radius: 0, id: id(), ...o })
    const ras = (o, w, h, paint) => base({ type: 'raster', canvas: cv(w, h, paint), id: id(), ...o })
    const blur = window.__vcFx.newEffect('blur'); blur.values = { ...blur.values, radius: 6 }
    const layers = [
      ras({ name: 'Photo', frameId: 'F1', x: 90, y: 120 }, 900, 600, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#a8dadc'); g.addColorStop(1, '#457b9d'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#f1faee'; x.beginPath(); x.arc(w * 0.7, h * 0.35, 90, 0, 7); x.fill() }),
      shape({ name: 'Panel', frameId: 'F1', x: 90, y: 760, w: 900, h: 300, radius: 24 }),
      shape({ name: 'Ellipse', frameId: 'F1', shape: 'ellipse', x: 700, y: 820, w: 300, h: 200, fill: '#e63946', stroke: '#ffffff', strokeWidth: 10 }),
      shape({ name: 'Star', frameId: 'F1', shape: 'polygon', x: 150, y: 820, w: 200, h: 200, sides: 5, star: 0.5, fill: '#ffb703' }),
      text({ name: 'Headline', frameId: 'F1', text: 'LAUNCH NIGHT', fontSize: 96, x: 90, y: 1130 }),
      text({ name: 'Title', frameId: 'F2', text: 'LAUNCH NIGHT', fontSize: 110, align: 'center', letterSpacing: 4, color: '#ffffff', x: 1250, y: 800 }),
      shape({ name: 'Bar', frameId: 'F2', x: 1300, y: 1000, w: 880, h: 40, fill: '#ffb703' }),
      ras({ name: 'Texture', frameId: 'F3', x: 2400, y: 0, effects: [blur] }, 1080, 1080, (x, w, h) => { for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? '#2a9d8f' : '#e9c46a'; x.fillRect((i % 6) * 180, Math.floor(i / 6) * 270, 180, 270) } }),
      base({ type: 'adjustment', id: id(), name: 'Invert', frameId: 'F3', kind: 'invert', values: {}, x: 0, y: 0 }),
      shape({ name: 'Dot', frameId: 'F3', shape: 'ellipse', x: 2790, y: 390, w: 300, h: 300, fill: '#e63946' }),
    ]
    S.getState().loadFramed({ id: 'Dlaunch', name: 'Launch', width: 3480, height: 1920, background: null, frames: [
      { id: 'F1', name: 'Post', x: 0, y: 0, width: 1080, height: 1350, background: '#f4efe6' },
      { id: 'F2', name: 'Story', x: 1200, y: 0, width: 1080, height: 1920, background: '#1d3557', linkedFrom: 'F1' },
      { id: 'F3', name: 'Square', x: 2400, y: 0, width: 1080, height: 1080, background: '#ffffff' },
    ] }, layers)
    S.getState().setActiveFrame('F1')
    // One real edit, so undo has something to take back.
    const panel = S.getState().layers.find(l => l.name === 'Panel')
    S.getState().updateLayer(panel.id, { y: 780 }, 'Move')
  })
  await wait(1500)

  // ── Every board, as a zip, named by the pattern, each the same as the canvas
  await openExport()
  ok('dialog: a design never exported has no last-export line', !(await p.$('[data-last-export]')))
  await p.click('[role=dialog] button:has-text("All 3")')
  const z = await dialogDownload()
  const files = unzip(z.buf)
  ok('all boards: one zip named after the design', z.name === 'Launch.zip', z.name)
  ok('all boards: files named design_board_size, numbered', JSON.stringify(files.map(f => f.name)) === JSON.stringify(['01_Launch_Post_1080x1350.png', '02_Launch_Story_1080x1920.png', '03_Launch_Square_1080x1080.png']), JSON.stringify(files.map(f => f.name)))
  for (const [i, fid] of ['F1', 'F2', 'F3'].entries()) {
    const ref = await E(id => window.__vcFrame(id, 1), fid)
    const c = await E(([a, r]) => window.__cmp(a, r), [dataUrl(files[i].data, 'image/png'), ref])
    const par = await E(id => window.__vcParity({ frame: id, scale: 1 }), fid)
    ok(`all boards: ${files[i].name} is the board as drawn on the canvas`, c.mean < 1 && c.aw === 1080 && par.mean < 3, `file ${c.mean.toFixed(2)} canvas ${par.mean.toFixed(2)} ${c.aw}x${c.ah}`)
  }
  let doc = await st(() => { const d = window.__voidEditor.getState().doc; return { exports: d.exports, prefs: d.exportPrefs } })
  ok('record: the export is kept with the design', doc.exports?.length === 1 && doc.exports[0].boards.join() === 'F1,F2,F3' && doc.exports[0].format === 'png' && doc.exports[0].files === 3, JSON.stringify(doc.exports))
  ok('record: the choices are kept with the design', doc.prefs?.boards === 'all' && doc.prefs?.format === 'png' && doc.prefs?.names === '{design}_{board}_{w}x{h}', JSON.stringify(doc.prefs))
  await p.waitForSelector('[data-after-export]', { timeout: 4000 }).catch(() => {})
  const card = await p.$eval('[data-after-export]', e => e.innerText).catch(() => '')
  ok('after export: a card says what was exported', /Exported 3 PNGs/.test(card), card.slice(0, 80))
  ok('after export: also needed offers social sizes the design does not have', /Also needed\?/.test(card) && /YouTube thumbnail/.test(card) && !/Story or Reel cover/.test(card) && !/other \d board/.test(card), card.replace(/\n/g, ' | '))
  ok('after export: use this again', /Save as template/.test(card) && /Duplicate as variation/.test(card))
  ok('after export: the dialog closed and nothing blocks the canvas', !(await p.$('[role=dialog]')))

  // ── Undo takes back the edit, not the export record
  await p.keyboard.press('Control+z'); await wait(400)
  doc = await st(() => { const s = window.__voidEditor.getState(); return { n: s.doc.exports?.length, y: s.layers.find(l => l.name === 'Panel').y } })
  ok('undo: the edit goes back, the export record stays', doc.y === 760 && doc.n === 1, JSON.stringify(doc))

  // ── Also needed: a size becomes a linked board
  await p.click('[data-after-export] button:has-text("YouTube thumbnail")'); await wait(900)
  const yt = await st(() => window.__voidEditor.getState().doc.frames.map(f => [f.name, f.width, f.height, f.linkedFrom ?? '']))
  ok('also needed: the size is laid out as a linked board', yt.length === 4 && yt[3][0] === 'YouTube thumbnail' && yt[3][1] === 1280 && yt[3][3] === 'F1', JSON.stringify(yt))
  ok('also needed: the card goes once used', !(await p.$('[data-after-export]')))

  // ── Remembered choices: All picks every board now, and the last export is shown
  await openExport()
  const last1 = await p.$eval('[data-last-export]', e => e.textContent).catch(() => '')
  ok('dialog: says what was exported last', /^Last exported (just now|1 min ago): 3 of 4 boards, PNG$/.test(last1), last1)
  ok('dialog: remembered All picks every board, the new one too', /Download 4 PNGs \(zip\)/.test(await p.locator('[role=dialog] button:has-text("Download")').first().innerText()))
  ok('dialog: boards exported before are marked', (await p.$$eval('[role=dialog] [aria-label="Boards to export"] button[aria-pressed]', els => els.filter(e => /exported/.test(e.textContent)).length)) === 3)
  await p.click('[role=dialog] button:has-text("This board")')
  await p.click('[role=dialog] button[role=radio]:has-text("JPG")')
  await moreOptions()
  await p.fill('[data-export-names]', '{board}-{n}')
  ok('names: the example follows the pattern', (await p.textContent('[data-export-example]')) === 'Post-01.jpg', await p.textContent('[data-export-example]'))
  const jpg = await dialogDownload()
  ok('names: the file is named by the pattern', jpg.name === 'Post-01.jpg', jpg.name)
  await wait(2500)

  // ── Reload: the design comes back with its choices and its record
  await p.reload(); await p.waitForFunction(() => window.__voidEditor?.getState().doc?.id === 'Dlaunch', null, { timeout: 20000 }); await wait(1200)
  await openExport()
  ok('reload: the format is remembered', (await p.getAttribute('[role=dialog] button[role=radio]:has-text("JPG")', 'aria-checked')) === 'true')
  await moreOptions()
  ok('reload: the file name pattern is remembered', (await p.inputValue('[data-export-names]')) === '{board}-{n}')
  ok('reload: the last export is remembered', /^Last exported (just now|1 min ago): 1 of 4 boards, JPG$/.test(await p.$eval('[data-last-export]', e => e.textContent).catch(() => '')))
  await p.keyboard.press('Escape'); await wait(300)
  // A change after reopening, then saved: one open, change, save workflow.
  await E(() => { const S = window.__voidEditor.getState(); const l = S.layers.find(x => x.name === 'Bar'); S.updateLayer(l.id, { y: 1010 }, 'Move') }); await wait(2600)

  // ── The selection on its own, trimmed, at 2x
  await E(() => { const S = window.__voidEditor.getState(); S.setActive(S.layers.find(l => l.name === 'Ellipse').id) }); await wait(200)
  await openExport()
  ok('selection: offered when layers are selected', !!(await p.$('[data-export-what]')))
  await p.click('[data-export-what] button:has-text("Selected layers")')
  await p.click('[role=dialog] button[role=radio]:has-text("PNG")')
  await p.click('[role=dialog] button[role=radio]:has-text("2×")')
  await moreOptions(); await p.click('[role=dialog] button:has-text("Reset")')
  const sel = await dialogDownload()
  const selInfo = await E(async u => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const at = (px, py) => Array.from(x.getImageData(px, py, 1, 1).data); return { w: c.width, h: c.height, corner: at(0, 0), mid: at(c.width >> 1, c.height >> 1), edge: at(c.width >> 1, 3) } }, dataUrl(sel.buf, 'image/png'))
  ok('selection: named for the layer', /^Launch_Ellipse_\d+x\d+\.png$/.test(sel.name), sel.name)
  ok('selection: trimmed to the layer, at 2x', Math.abs(selInfo.w - 600) <= 6 && Math.abs(selInfo.h - 400) <= 6, `${selInfo.w}x${selInfo.h}`)
  ok('selection: nothing around it, no board colour', selInfo.corner[3] === 0 && selInfo.mid[0] > 200 && selInfo.mid[1] < 90 && selInfo.edge[0] > 200 && selInfo.edge[1] > 200, JSON.stringify(selInfo))
  doc = await st(() => window.__voidEditor.getState().doc.exports.at(-1))
  ok('selection: recorded as a selection', doc.what === 'selection', JSON.stringify(doc))

  // ── SVG: vectors where SVG can draw them, images for the rest
  await E(() => { const S = window.__voidEditor.getState(); S.setActive(null); S.setActiveFrame('F1') }); await wait(200)
  await openExport()
  await p.click('[role=dialog] button[role=radio]:has-text("SVG")')
  ok('svg: no copy button for SVG', !(await p.$('[role=dialog] button:has-text("Copy")')))
  // The selection export left the design's own choices alone; back to the usual names for the rest.
  await moreOptions()
  ok('selection: did not change the board choices', (await p.inputValue('[data-export-names]')) === '{board}-{n}' && (await p.getAttribute('[role=dialog] button[role=radio]:has-text("1×")', 'aria-checked')) === 'true')
  await p.click('[role=dialog] button:has-text("Reset")')
  const svg = await dialogDownload()
  const s1 = svg.buf.toString()
  ok('svg: named and sized like the board', svg.name === 'Launch_Post_1080x1350.svg' && /width="1080" height="1350" viewBox="0 0 1080 1350"/.test(s1), svg.name)
  ok('svg: text stays text', /<text[^>]*font-size="96"[^>]*><tspan[^>]*>LAUNCH NIGHT<\/tspan><\/text>/.test(s1) && !/<image id="Headline"/.test(s1))
  ok('svg: shapes stay shapes', /<g id="Panel"[^>]*><rect [^>]*rx="24"/.test(s1) && /<g id="Ellipse"[^>]*><ellipse [^>]*stroke="#ffffff" stroke-width="10"/.test(s1) && /<g id="Star"[^>]*><polygon points="/.test(s1))
  ok('svg: the photo is embedded', /<image id="Photo" width="900" height="600"[^>]*xlink:href="data:image\/(jpeg|png);base64,/.test(s1))
  ok('svg: the board colour is the background', /<rect id="background"[^>]*fill="#f4efe6"/.test(s1))
  const ref1 = await E(() => window.__vcFrame('F1', 1))
  const c1 = await E(([a, r]) => window.__cmp(a, r), [dataUrl(svg.buf, 'image/svg+xml'), ref1])
  ok('svg: looks like the board', c1.mean < 6, c1.mean.toFixed(2))
  await E(() => window.__voidEditor.getState().setActiveFrame('F3')); await wait(200)
  await openExport(); await p.click('[role=dialog] button[role=radio]:has-text("SVG")')
  const svg3 = await dialogDownload(); const s3 = svg3.buf.toString()
  ok('svg: everything under an adjustment becomes one image, what is above stays vector', /<image id="Below-adjustments"/.test(s3) && /<g id="Dot"[^>]*><ellipse /.test(s3) && !/id="Texture"/.test(s3))
  const c3 = await E(([a, r]) => window.__cmp(a, r), [dataUrl(svg3.buf, 'image/svg+xml'), await E(() => window.__vcFrame('F3', 1))])
  ok('svg: the adjusted board looks like the canvas', c3.mean < 2, c3.mean.toFixed(2))
  await E(() => window.__voidEditor.getState().setActiveFrame('F2')); await wait(200)
  await openExport(); await p.click('[role=dialog] button[role=radio]:has-text("SVG")')
  const s2 = (await dialogDownload()).buf.toString()
  ok('svg: centred, spaced type keeps its settings', /letter-spacing="4"/.test(s2) && /text-anchor="middle"/.test(s2) && /fill="#ffffff"/.test(s2))

  // ── Lossless print PDF, and the lighter proof
  await E(() => window.__voidEditor.getState().setActiveFrame('F1')); await wait(200)
  await openExport(); await p.click('[role=dialog] button:has-text("PDF · Print")')
  await moreOptions()
  ok('pdf: the print preset turns on lossless pages', await p.isChecked('[role=dialog] label:has-text("Lossless pages") input'))
  const pdf = await dialogDownload()
  const pdfText = pdf.buf.toString('latin1')
  ok('pdf: print pages are lossless (Flate, no JPEG)', /\/Filter \/FlateDecode/.test(pdfText) && !/DCTDecode/.test(pdfText), pdf.name)
  const m = /\/Width (\d+) \/Height (\d+) [^>]*\/Filter \/FlateDecode \/Length (\d+) >>\nstream\n/.exec(pdfText)
  let rgb = null
  if (m) { const at = m.index + m[0].length; rgb = zlib.inflateSync(pdf.buf.slice(at, at + Number(m[3]))) }
  ok('pdf: the page holds every pixel', !!rgb && rgb.length === 1080 * 1350 * 3, rgb ? String(rgb.length) : 'no stream')
  ok('pdf: and the right colours', !!rgb && Math.abs(rgb[0] - 244) <= 1 && Math.abs(rgb[1] - 239) <= 1 && Math.abs(rgb[2] - 230) <= 1, rgb ? `${rgb[0]},${rgb[1]},${rgb[2]}` : '')
  await p.waitForSelector('[data-after-export]')
  await p.click('[data-after-export] button:has-text("Save as template")'); await wait(1200)
  await openExport(); await p.click('[role=dialog] button:has-text("PDF · Client proof")')
  const proof = await dialogDownload()
  ok('pdf: the client proof stays light (JPEG pages)', /DCTDecode/.test(proof.buf.toString('latin1')) && proof.buf.length < pdf.buf.length, `${proof.buf.length} < ${pdf.buf.length}`)

  // ── Duplicate as variation, from the card
  await p.waitForSelector('[data-after-export]')
  await p.click('[data-after-export] button:has-text("Duplicate as variation")')
  await p.waitForFunction(() => window.__voidEditor.getState().doc?.name === 'Launch variation 2', null, { timeout: 10000 }).catch(() => {})
  const v = await st(() => { const s = window.__voidEditor.getState(); return { name: s.doc?.name, ex: s.doc?.exports?.length ?? 0, boards: s.doc?.frames?.length, layers: s.layers.length } })
  ok('variation: a copy opens beside the design, with its own export history', v.name === 'Launch variation 2' && v.ex === 0 && v.boards === 4 && v.layers > 10, JSON.stringify(v))
  ok('variation: both are open as tabs', !!(await p.$('button[aria-label="Close Launch"]')) && !!(await p.$('button[aria-label="Close Launch variation 2"]')))
  await wait(1500)

  // ── Home: what each design needs, and a quiet count
  await E(() => window.__voidEditor.getState().closeDoc()); await wait(1200)
  await p.waitForSelector('section:has-text("Pick up where you left off")')
  const launch = await p.$eval('section:has-text("Pick up where you left off") div.group:has(span:text-is("Launch"))', e => e.innerText).catch(() => '')
  ok('home: a partly exported design says how far it got', /3 of 4 formats exported/.test(launch) && /Edited/.test(launch), launch.replace(/\n/g, ' | '))
  const variation = await p.$eval('section:has-text("Pick up where you left off") div.group:has-text("Launch variation 2")', e => e.innerText).catch(() => '')
  ok('home: a new variation is not exported yet', /Not exported yet/.test(variation), variation.replace(/\n/g, ' | '))
  const count = await p.textContent('[data-desk-count]').catch(() => '')
  ok('home: a quiet count of what is here', /2 designs/.test(count) && /1 template/.test(count) && /\d+ exports/.test(count), count)
  ok('home: the template is there', /Launch template/.test(await p.$eval('section:has-text("Your templates")', e => e.innerText).catch(() => '')))
  // Export from Home, without opening the design: every board, by the design's pattern.
  const cardEl = p.locator('section:has-text("Pick up where you left off") div.group:has(span:text-is("Launch"))').first()
  await cardEl.hover(); await cardEl.locator('button[aria-label^="Actions for"]').click()
  const home = await download(() => p.click('button:has-text("Export PNGs")'))
  ok('home export: every board, named by the pattern', home.name === 'Launch.zip' && JSON.stringify(unzip(home.buf).map(f => f.name)) === JSON.stringify(['01_Launch_Post_1080x1350.png', '02_Launch_Story_1080x1920.png', '03_Launch_Square_1080x1080.png', '04_Launch_YouTube thumbnail_1280x720.png']), JSON.stringify(unzip(home.buf).map(f => f.name)))
  await wait(800)
  const after = await p.$eval('section:has-text("Pick up where you left off") div.group:has(span:text-is("Launch"))', e => e.innerText).catch(() => '')
  ok('home export: recorded, the card says so', /Exported just now/.test(after), after.replace(/\n/g, ' | '))
  // Opening a design and closing it again is not an edit (its fonts arriving do not count).
  await p.click('section:has-text("Pick up where you left off") div.group:has(span:text-is("Launch")) > button')
  await p.waitForFunction(() => window.__voidEditor.getState().doc?.name === 'Launch', null, { timeout: 10000 }); await wait(2500)
  await E(() => window.__voidEditor.getState().closeDoc()); await wait(1200)
  const again = await p.$eval('section:has-text("Pick up where you left off") div.group:has(span:text-is("Launch"))', e => e.innerText).catch(() => '')
  ok('home: opening a design without changing it is not an edit', /Exported just now/.test(again), again.replace(/\n/g, ' | '))

  // ── Landing: the same lines
  await p.goto(`${BASE}/`); await wait(1800)
  const land = await p.$$eval('a[href^="/editor?project="]', els => els.map(e => e.innerText.replace(/\n/g, ' | ')))
  ok('landing: designs say what they need', land.some(t => /Launch variation 2/.test(t) && /Not exported yet/.test(t)) && land.some(t => /^Launch \|/.test(t) && /Exported just now/.test(t)), JSON.stringify(land))
  ok('landing: a design link says where it was opened from', (await p.$$eval('a[href^="/editor?project="]', els => els.map(e => e.getAttribute('href')))).every(h => /from=landing/.test(h)))
  await p.goto(`${BASE}/editor`); await wait(1500)

  // ── Coming-back analytics
  const names = events.map(e => e.name)
  const props = n => events.filter(e => e.name === n).map(e => e.props)
  ok('analytics: activation on the first export', props('activation').length === 1 && props('activation')[0].format === 'png', JSON.stringify(props('activation')))
  const flows = props('workflow').map(x => x.kind)
  ok('analytics: workflows counted once each', ['create-edit-export', 'master-formats-export', 'open-change-save'].every(k => flows.filter(f => f === k).length === 1), JSON.stringify(flows))
  ok('analytics: reopening after a reload is a resume', props('doc.resume').some(x => x.how === 'reload') && props('doc.open').some(x => x.from === 'reload'), JSON.stringify(props('doc.open')))
  ok('analytics: template and variation', names.includes('template.save') && names.includes('variation.make'))
  ok('analytics: opened from Home says so', props('doc.open').some(x => x.from === 'home'))
  ok('analytics: exports say what was exported', props('export').some(x => x.what === 'selection') && props('export').some(x => x.via === 'home'))
  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { ok('run', false, e.stack) }
console.log(out.join('\n'))
await b.close()
