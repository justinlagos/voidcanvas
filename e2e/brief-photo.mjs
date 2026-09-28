// Phase 5: the brief check (what is worth asking the client, sizes read from the brief, brief details that
// follow into every board, the checklist per board) and the guideline's photography page (the logo placed on
// the brand's own photos, kept with the draft and the client brand, and the same corner choice in the Editor).
import { chromium } from 'playwright'
import { FIX } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept())
const E = (f, a) => p.evaluate(f, a)
const wait = ms => p.waitForTimeout(ms)
const texts = sel => p.$$eval(sel, els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()))

try {
  // ── Studio: a brief with gaps and a clash
  await p.goto(`${BASE}/studio`); await wait(900)
  await p.click('button:has-text("Start a job")'); await wait(700)
  await p.keyboard.type('Afrobeats night at The Hub, Lekki. Friday 12 October, 8pm. Tickets ₦10,000 and ₦15,000. Need an IG post, a 1080 x 1920 story and an 85 x 200 cm roll-up.')
  await wait(700)
  const qs = await p.$$eval('[data-brief-question]', els => els.map(e => e.getAttribute('data-brief-question').replace(/-\d+$/, '')))
  ok('brief: worth asking lists the gaps and clashes', ['weekday', 'prices', 'cta', 'contact', 'logo', 'deadline'].every(q => qs.includes(q)) && !qs.includes('date') && !qs.includes('venue') && !qs.includes('time'), JSON.stringify(qs))
  const q = await texts('[data-brief-question]')
  ok('brief: the weekday clash names the real day', q.some(t => /The brief says Friday 12 October, but 12 October 20\d\d is a (Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday)/.test(t)), JSON.stringify(q))
  ok('brief: each clash quotes the brief', q.some(t => /From the brief: .?Friday 12 October/.test(t)))
  await p.click('button:has-text("Copy as questions")'); await wait(300)
  const clip = await E(() => navigator.clipboard.readText())
  ok('brief: copy as questions gives a short email', /^Hi,\n\nThanks for the brief/.test(clip) && /\n1\. /.test(clip) && /Thanks!$/.test(clip), clip.slice(0, 160))
  await p.click('button[aria-label^="No need to ask: Should your logo"]'); await wait(300)
  const qs2 = await p.$$eval('[data-brief-question]', els => els.map(e => e.getAttribute('data-brief-question')))
  ok('brief: a question can be set aside', !qs2.includes('logo') && !!(await p.$('button:has-text("Show the 1 set aside")')), JSON.stringify(qs2))
  const chips = await texts('[data-brief-sizes] button')
  ok('brief: sizes read from the brief, matched to formats', chips.length === 2 && /Story/.test(chips[0]) && /1080 × 1920/.test(chips[0]) && /Roll-up/.test(chips[1]) && /85 × 200 cm/.test(chips[1]), JSON.stringify(chips))
  for (let i = 0; i < 2; i++) { await p.click('[data-brief-sizes] button'); await wait(400) }
  ok('brief: added sizes leave the list', !(await p.$('[data-brief-sizes]')))
  await wait(1500)
  const dels = await E(() => new Promise(res => { const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const g = db.transaction('jobs').objectStore('jobs').getAll(); g.onsuccess = () => { res(g.result.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.deliverables.map(d => [d.presetId, d.width, d.height]) ?? []); db.close() } } }))
  ok('brief: adding a size adds the format', JSON.stringify(dels) === JSON.stringify([['story', 1080, 1920], ['rollup', 2008, 4724]]), JSON.stringify(dels))

  // ── Editor: the checklist per board, and brief details that follow into every board
  await p.goto(`${BASE}/editor`); await p.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })
  await E(() => {
    const s = () => window.__voidEditor.getState()
    s().newDoc({ name: 'Harvest', width: 1080, height: 1350, background: '#ffffff' })
    s().addFrame({ name: 'Story', width: 1080, height: 1920 })
    const [f0] = s().doc.frames
    s().renameFrame?.(f0.id, 'Post'); s().setActiveFrame(f0.id)
    window.__voidUi.getState().showPanel('brief')
  })
  await wait(400)
  await p.fill('textarea[placeholder^="Headline, date, venue"]', "Harvest thanksgiving service. Sunday 4 October 2026, 10am at St Paul's Church. Free entry. Call 0803 123 4567.")
  await p.click('button:has-text("Make checklist")'); await wait(400)
  const items = await E(() => window.__voidEditor.getState().doc.brief.items.map(i => [i.key ?? null, i.value]))
  ok('editor brief: items carry which detail they are', items.some(([k, v]) => k === 'date' && v === 'Sunday 4 October 2026') && items.some(([k]) => k === 'venue'), JSON.stringify(items))
  // Add the date on the Post board from the checklist, and type it by hand on the Story board.
  await p.click('[data-brief-panel] li:has-text("Sunday 4 October 2026") button:has-text("Add")'); await wait(300)
  await E(() => {
    const s = () => window.__voidEditor.getState()
    const f1 = s().doc.frames[1]; s().setActiveFrame(f1.id)
    s().addText(f1.x + 100, f1.y + 300, 800)
    const l = s().active(); s().updateLayer(l.id, { text: 'SUNDAY 4 OCTOBER 2026 · 10AM' }, 'Type')
    s().setActiveFrame(s().doc.frames[0].id)
  })
  await wait(300)
  const count0 = await p.textContent('[data-brief-count]')
  const boards0 = await texts('[data-brief-boards] button')
  ok('editor brief: each board is checked on its own', /^Post: 1 of \d+ on this board/.test(count0) && boards0.length === 2 && /Post 1\//.test(boards0[0]) && /Story 2\//.test(boards0[1]), JSON.stringify({ count0, boards0 }))
  const keyed = await E(() => window.__voidEditor.getState().layers.filter(l => l.type === 'text').map(l => [l.text, l.briefKey ?? null]))
  ok('editor brief: text added from the checklist remembers its detail', keyed.some(([t, k]) => t === 'Sunday 4 October 2026' && k === 'date'), JSON.stringify(keyed))
  const hi = await E(() => window.__voidEditor.getState().historyIndex)
  await p.click('[data-brief-panel] button:has-text("Read brief")'); await p.click('[data-brief-panel] button:has-text("Edit the brief")'); await wait(200)
  await p.fill('[data-brief-panel] textarea[aria-label="Brief"]', "Harvest thanksgiving service. Sunday 11 October 2026, 10am at St Paul's Church. Free entry. Call 0803 123 4567.")
  await p.click('[data-brief-panel] button:has-text("Update")'); await wait(400)
  const after = await E(() => window.__voidEditor.getState().layers.filter(l => l.type === 'text').map(l => l.text))
  ok('editor brief: a changed date follows into every board, keeping capitals', after.includes('Sunday 11 October 2026') && after.includes('SUNDAY 11 OCTOBER 2026 · 10AM'), JSON.stringify(after))
  ok('editor brief: says what changed', /date/.test(await p.textContent('[role="status"]').catch(() => '')))
  ok('editor brief: one undo step', await E(() => window.__voidEditor.getState().historyIndex) === hi + 1)
  await E(() => window.__voidEditor.getState().undo()); await wait(200)
  const undone = await E(() => window.__voidEditor.getState().layers.filter(l => l.type === 'text').map(l => l.text))
  ok('editor brief: undo puts the old date back everywhere', undone.includes('Sunday 4 October 2026') && undone.includes('SUNDAY 4 OCTOBER 2026 · 10AM'), JSON.stringify(undone))

  // ── Guideline builder: the photography page
  const photo = (dark) => E(dark => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const x = c.getContext('2d')
    x.fillStyle = dark ? '#141418' : '#eeeeea'; x.fillRect(0, 0, 1200, 800)
    // A busy subject in the middle.
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 2600; i++) { x.fillStyle = dark ? `hsl(${rnd() * 360},70%,${50 + rnd() * 40}%)` : `hsl(${rnd() * 360},60%,${10 + rnd() * 40}%)`; x.fillRect(420 + rnd() * 360, 250 + rnd() * 300, 8, 8) }
    return c.toDataURL('image/jpeg', 0.92).split(',')[1]
  }, dark)
  const light = Buffer.from(await photo(false), 'base64'), dark = Buffer.from(await photo(true), 'base64')
  await p.goto(`${BASE}/studio`); await wait(900)
  await p.click('button:has-text("Brand guideline builder")'); await p.waitForSelector('input[placeholder="e.g. Northbound"]')
  await p.fill('input[placeholder="e.g. Northbound"]', 'Harbour')
  await p.setInputFiles('input[accept="image/*,.svg"]', FIX.logo); await wait(2500)
  const pages0 = (await p.$$('nav[aria-label="Pages"] [data-page]')).length
  await p.setInputFiles('input[data-brand-photos-input]', [{ name: 'light.jpg', mimeType: 'image/jpeg', buffer: light }, { name: 'dark.jpg', mimeType: 'image/jpeg', buffer: dark }])
  await wait(2500)
  const titles = await p.$$eval('nav[aria-label="Pages"] [data-page] button[aria-label^="Page "]', els => els.map(e => e.getAttribute('aria-label')))
  ok('guideline: two photos add the photography page after the logo rules', titles.length === pages0 + 1 && titles.findIndex(t => /On photography/.test(t)) === titles.findIndex(t => /Do not/.test(t)) + 1, JSON.stringify(titles))
  await p.click('nav[aria-label="Pages"] button[aria-label*="On photography"]'); await wait(1500)
  const plan = await E(() => window.__vcGuide.photoPlan())
  ok('guideline: the logo goes in a light corner of the light photo', plan.length === 2 && plan[0].suggested.lum > 0.6 && plan[0].suggested.corner !== 'centre' && plan[0].suggested.use !== 'reversed', JSON.stringify(plan[0]))
  ok('guideline: the reversed logo on the dark photo', plan[1]?.suggested.use === 'reversed', JSON.stringify(plan[1]))
  ok('guideline: the placement to avoid is another corner, with a reason', plan.every(x => x.avoid.corner !== x.suggested.corner && x.avoid.why.length > 10), JSON.stringify(plan.map(x => x.avoid)))
  const px = await E(() => { const row = Array.from(document.querySelectorAll('nav[aria-label="Pages"] [data-page]')).find(r => r.querySelector('button[aria-label*="On photography"]')); const c = row?.querySelector('canvas'); if (!c) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 45) dark++; return dark })
  ok('guideline: the photography page draws the photos', px > 50, String(px))
  // The draft keeps the photos.
  await wait(900); await p.reload(); await p.click('button:has-text("Brand guideline builder")').catch(() => {}); await wait(2500)
  ok('guideline: photos come back after a reload', (await p.$$('[data-brand-photos] img')).length === 2)
  const titlesAfter = await p.$$eval('nav[aria-label="Pages"] [data-page] button[aria-label^="Page "]', els => els.map(e => e.getAttribute('aria-label')))
  ok('guideline: and so does the page', titlesAfter.some(t => /On photography/.test(t)), JSON.stringify(titlesAfter))
  // Saved with the client brand.
  await p.click('button[role=tab]:has-text("Export")'); await wait(300)
  await p.click('button:has-text("Save as a client brand in Studio")'); await wait(1500)
  const brand = await E(() => new Promise(res => { const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const g = db.transaction('brands').objectStore('brands').getAll(); g.onsuccess = () => { const b = g.result.filter(x => x.name === 'Harbour').sort((a, c) => c.updatedAt - a.updatedAt)[0]; res(b ? { id: b.id, imagery: (b.imagery ?? []).map(i => [i.name, i.w, i.h, i.blob instanceof Blob || i.blob?.__vcBlob instanceof ArrayBuffer]) } : null); db.close() } } }))
  ok('guideline: photos are saved with the client brand', brand && brand.imagery.length === 2 && brand.imagery.every(i => i[3]), JSON.stringify(brand))
  // Removing both takes the page away.
  await p.click('button[role=tab]:has-text("Identity")'); await wait(300)
  await p.click('button[aria-label="Remove light"]'); await p.click('button[aria-label="Remove dark"]'); await wait(500)
  ok('guideline: no photos, no photography page', (await p.$$('nav[aria-label="Pages"] button[aria-label*="On photography"]')).length === 0)

  // ── Editor: a brand logo placed on a photo goes where it reads
  await p.goto(`${BASE}/editor`); await p.waitForFunction(() => !!window.__voidEditor, null, { timeout: 30000 })
  await E(async brandId => {
    const s = () => window.__voidEditor.getState()
    s().newDoc({ name: 'Harbour post', width: 1080, height: 1350, background: '#ffffff' })
    // A light photo whose top half is busy: the calm corners are at the bottom.
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d')
    x.fillStyle = '#efefe9'; x.fillRect(0, 0, 1080, 1350)
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 9000; i++) { x.fillStyle = `hsl(${rnd() * 360},60%,${15 + rnd() * 60}%)`; x.fillRect(rnd() * 1080, rnd() * 620, 10, 10) }
    s().addImage(c, 1080, 1350, 'Photo')
    s().setDoc({ brandId })
  }, brand.id)
  await wait(400)
  await p.click('button:has-text("Add")'); await wait(900)
  await p.click('button[title^="Add Logo"]'); await wait(1800)
  const logo = await E(() => { const s = window.__voidEditor.getState(); const l = s.layers.find(x => x.role === 'logo'); return l ? { x: l.x, y: l.y, h: l.canvas.height * l.scaleY } : null })
  ok('editor: the logo goes in a calm corner of the photo, not the busy top', logo && logo.y > 1350 / 2, JSON.stringify(logo))
} catch (e) { ok('ran without throwing', false, e.stack) }

ok('no page errors', errors.length === 0, errors.join(' | '))
console.log(out.join('\n'))
console.log(`\n${out.filter(l => l.startsWith('PASS')).length} passed, ${out.filter(l => l.startsWith('FAIL')).length} failed`)
await b.close()
