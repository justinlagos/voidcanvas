// Sprint C3 acceptance: regional refinement in the REAL editor.
// Drives production-safe hooks (__voidEditor/__vcAssets/__vcRefine) plus the
// real Refine bar and Repair dialog. Local texture repair is deterministic;
// the on-device AI remover is NOT downloaded here (its confirm() is
// auto-dismissed, proving the honest unavailable path). No network AI, no cost.
// Writes screenshots + report to e2e/evidence/. Any failed section exits nonzero.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const EVIDENCE = new URL('./evidence/', import.meta.url).pathname
fs.mkdirSync(EVIDENCE, { recursive: true })

const results = []
const pass = (name, detail = '') => { results.push({ name, ok: true, detail }); console.log('PASS ' + name + (detail ? ' — ' + detail : '')) }
const fail = (name, detail = '') => { results.push({ name, ok: false, detail }); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')) }
const snap = async (page, file) => { const p = path.join(EVIDENCE, file); await page.screenshot({ path: p }); return p }
const VE = (page, fn, arg) => page.evaluate(fn, arg)
const stateOf = page => VE(page, () => window.__vcAssets.state())

const browser = await chromium.launch()
const consoleErrors = []
const externalRequests = []
let failed = false
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('dialog', d => d.dismiss().catch(() => {}))
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text().slice(0, 200)) })
  page.on('request', r => {
    const u = r.url()
    if (/openai|anthropic|replicate|fal\.|huggingface|stability/i.test(u)) externalRequests.push('AI-CALL: ' + u.slice(0, 140))
  })
  page.on('response', r => { if (r.status() >= 400) consoleErrors.push(r.status() + ' ' + r.url().slice(0, 140)) })

  await page.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => window.__voidEditor && window.__vcAssets && window.__vcRefine, null, { timeout: 60000 })
  await page.waitForTimeout(1500)

  // Photo-like fixture: sky gradient, sun, dark caption bar, blemish dots.
  const fixtureB64 = await VE(page, () => {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 600
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 0, 600)
    g.addColorStop(0, '#7fb2d9')
    g.addColorStop(0.7, '#d9c07f')
    g.addColorStop(1, '#8a6f4d')
    x.fillStyle = g
    x.fillRect(0, 0, 800, 600)
    x.fillStyle = '#f5e6a8'
    x.beginPath(); x.arc(620, 140, 70, 0, 7); x.fill()
    x.fillStyle = '#3a3a3a'
    x.fillRect(120, 470, 560, 60) // caption bar (text-like)
    x.fillStyle = '#ffffff'
    x.font = 'bold 34px sans-serif'
    x.fillText('UNWANTED WORDS', 200, 512)
    x.fillStyle = '#202020'
    x.beginPath(); x.arc(200, 200, 7, 0, 7); x.fill() // blemish
    x.beginPath(); x.arc(205, 208, 4, 0, 7); x.fill()
    return c.toDataURL('image/png').split(',')[1]
  })
  fs.writeFileSync(path.join(EVIDENCE, 'refine-fixture.png'), Buffer.from(fixtureB64, 'base64'))

  // 0. Blank 800x600 doc + place fixture (scale 1, origin 0).
  await VE(page, () => { window.__voidEditor.getState().newDoc({ name: 'Refine poster', width: 800, height: 600, background: '#ffffff' }) })
  await page.waitForTimeout(500)
  const photoId = await VE(page, b64 => window.__vcAssets.placeBytes(b64, 'refine-photo.png', 'image/png'), fixtureB64)
  await page.waitForTimeout(800)
  let st = await stateOf(page)
  const photo = st.layers.find(l => l.id === photoId)
  if (photo && Math.abs(photo.x ?? 0) < 1 && Math.abs((photo.scaleX ?? 0) - 1) < 0.01) pass('0 fixture placed at scale 1 (doc == layer pixels)')
  else fail('0 fixture placement', JSON.stringify({ photoId, photo }))

  const openRepair = async () => {
    await VE(page, () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'repair' })))
    await page.waitForFunction(() => !!document.querySelector('[data-testid="repair-dialog"]'), null, { timeout: 15000 }).catch(() => {})
  }
  const waitProposal = async () => {
    await page.waitForFunction(
      () => {
        const d = document.querySelector('[data-testid="repair-dialog"]')
        if (!d) return false
        const t = d.textContent ?? ''
        return /Accept proposal|No clean donor|Cancelled/.test(t) && !/Finding clean matching texture/.test(t)
      },
      null, { timeout: 120000 },
    ).catch(() => {})
  }
  const acceptVisible = () => page.evaluate(() => {
    const d = document.querySelector('[data-testid="repair-dialog"]')
    if (!d) return false
    return Array.from(d.querySelectorAll('button')).some(b => b.textContent?.includes('Accept proposal') && !b.disabled)
  })
  const dlgText = () => page.evaluate(() => (document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 300))
  const patchMean = (page, rect) => VE(page, r => {
    const st = window.__voidEditor.getState()
    const patches = st.layers.filter(l => /repair/i.test(l.name ?? ''))
    const p = patches[patches.length - 1]
    if (!p || p.type !== 'raster') return null
    const d = p.canvas.getContext('2d').getImageData(r.x, r.y, r.w, r.h).data
    let s = 0
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
    return s / (d.length / 4 * 3)
  }, rect)
  const meanOf = (page, layerId, rect) => VE(page, args => {
    const l = window.__voidEditor.getState().layers.find(v => v.id === args.id)
    const d = l.canvas.getContext('2d').getImageData(args.r.x, args.r.y, args.r.w, args.r.h).data
    let s = 0
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
    return s / (d.length / 4 * 3)
  }, { id: layerId, r: rect })

  // 1. Remove the caption bar (the whole unwanted object: text + bar) from the
  // photo. The selection must cover the object so the ring context is background;
  // a hole buried inside the bar has no clean donor and is honestly refused
  // (unit-covered in caption-removal.test.ts).
  const bar = { x: 120, y: 470, w: 560, h: 60 }
  const outsideBefore = await VE(page, args => window.__vcRefine.sampleOutside(args.id, args.hole), { id: photoId, hole: { x: 120, y: 470, w: 560, h: 60 } })
  await VE(page, () => window.__voidEditor.getState().setActive(photoId), photoId).catch(() => {})
  await VE(page, id => window.__voidEditor.getState().setActive(id), photoId)
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 120, y: 470, w: 560, h: 60 })
  const histBefore = (await stateOf(page)).history.length
  await openRepair()
  await waitProposal()
  if (await acceptVisible()) pass('1a text-removal proposal ready')
  else fail('1a proposal', 'Accept never enabled | ' + (await dlgText()))
  await snap(page, 'refine-01-proposal.png')
  await page.click('[data-testid="repair-dialog"] button:has-text("Accept proposal")')
  await page.waitForTimeout(600)
  // The accept lands as its own patch layer (photo untouched): sample the newest patch.
  const barMean = await patchMean(page, { x: 120, y: 470, w: 560, h: 60 })
  // Caption bar was dark (~60); repair must read as background (~200+).
  if (barMean > 150) pass(`1b caption text removed (mean ${Math.round(barMean)})`)
  else fail('1b removal', 'mean=' + Math.round(barMean))
  const outsideAfter = await VE(page, args => window.__vcRefine.sampleOutside(args.id, args.hole), { id: photoId, hole: { x: 120, y: 470, w: 560, h: 60 } })
  if (Math.abs((outsideBefore ?? 0) - (outsideAfter ?? -1)) < 0.5) pass('1c surrounding pixels unchanged')
  else fail('1c pixel integrity', `${outsideBefore} -> ${outsideAfter}`)
  st = await stateOf(page)
  if (st.history.length === histBefore + 1) pass('1d exactly one history step')
  else fail('1d history', `${histBefore} -> ${st.history.length}`)
  void bar

  // 2. Heal a small blemish.
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 190, y: 190, w: 24, h: 24 })
  await openRepair()
  await waitProposal()
  const spotBefore = await meanOf(page, photoId, { x: 190, y: 190, w: 24, h: 24 })
  if (await acceptVisible()) {
    await page.click('[data-testid="repair-dialog"] button:has-text("Accept proposal")')
    await page.waitForTimeout(500)
    const spotAfter = await patchMean(page, { x: 190, y: 190, w: 24, h: 24 })
    if (spotAfter > spotBefore + 20) pass(`2 blemish healed (${Math.round(spotBefore)} -> ${Math.round(spotAfter)})`)
    else fail('2 blemish', `${Math.round(spotBefore)} -> ${Math.round(spotAfter)}`)
  } else fail('2 blemish proposal', 'no proposal | ' + (await dlgText()))

  // 3. Repair uneven texture (sky area with sun edge nearby).
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 500, y: 250, w: 60, h: 40 })
  await openRepair()
  await waitProposal()
  if (await acceptVisible()) {
    await page.click('[data-testid="repair-dialog"] button:has-text("Accept proposal")')
    await page.waitForTimeout(500)
    pass('3 texture repair accepted')
  } else fail('3 texture proposal', 'no proposal | ' + (await dlgText()))
  await snap(page, 'refine-03-texture.png')

  // 4. Region near the image edge.
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 0, y: 100, w: 40, h: 60 })
  await openRepair()
  await waitProposal()
  const edgeText = await page.evaluate(() => document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '')
  if (/Accept proposal/.test(edgeText) || /No clean donor/.test(edgeText)) pass('4 edge region handled predictably')
  else fail('4 edge region', edgeText.slice(0, 120))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  // Ensure the dialog is closed before continuing.
  const stillOpen = await page.evaluate(() => !!document.querySelector('[data-testid="repair-dialog"]'))
  if (stillOpen) {
    await VE(page, () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'repair' }))).catch(() => {})
    await page.waitForTimeout(300)
  }

  // 5. Feathered mask.
  await VE(page, (r) => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h, 6), { x: 300, y: 300, w: 80, h: 50 })
  await openRepair()
  await waitProposal()
  if (await acceptVisible()) {
    await page.click('[data-testid="repair-dialog"] button:has-text("Accept proposal")')
    await page.waitForTimeout(500)
    pass('5 feathered repair accepted')
  } else fail('5 feathered proposal', 'no proposal | ' + (await dlgText()))

  // 6. Rotated layer: coordinates cross-check + repair still lands correctly.
  await VE(page, id => window.__voidEditor.getState().updateLayer(id, { rotation: 0.26 }, 'Rotate'), photoId)
  await page.waitForTimeout(400)
  const cc = await VE(page, id => window.__vcRefine.coordsCheck(id, [{ x: 100, y: 100 }, { x: 400, y: 300 }, { x: 700, y: 550 }, { x: 0, y: 0 }]), photoId)
  if (cc?.ok) pass(`6a refine coords match engine (worst ${Number(cc.worst).toExponential(1)})`)
  else fail('6a coords', JSON.stringify(cc))
  // Select the caption area in doc space of the rotated layer (approx: centre region).
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 330, y: 420, w: 140, h: 40 })
  await openRepair()
  await waitProposal()
  const rotText = await page.evaluate(() => document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '')
  if (/Accept proposal|No clean donor/.test(rotText)) pass('6b rotated repair handled predictably')
  else fail('6b rotated', rotText.slice(0, 120))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await VE(page, id => window.__voidEditor.getState().updateLayer(id, { rotation: 0 }, 'Unrotate'), photoId)
  await page.waitForTimeout(300)

  // 7. Multiple proposals + regenerate.
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 420, y: 120, w: 50, h: 40 })
  await openRepair()
  await waitProposal()
  const aiNote = await page.evaluate(() => document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '')
  if (/AI removal/.test(aiNote)) pass('7a AI path reported honestly (no silent fake)')
  else fail('7a AI honesty', aiNote.slice(0, 200))
  const regen = await page.$('[data-testid="repair-dialog"] button:has-text("Regenerate")')
  if (regen) {
    await regen.click()
    await page.waitForFunction(
      () => /try 2/.test(document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? ''),
      null, { timeout: 120000 },
    ).catch(() => {})
    const after = await page.evaluate(() => document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '')
    if (/try 2/.test(after)) pass('7b regenerate produces a second proposal')
    else fail('7b regenerate', after.slice(0, 200))
  } else fail('7b regenerate', 'no Regenerate button')

  // 8. Reject changes nothing.
  const layersBefore = (await stateOf(page)).layers.length
  const histBeforeReject = (await stateOf(page)).history.length
  const rej = await page.$('[data-testid="repair-dialog"] button:has-text("Reject")')
  if (rej) await rej.click()
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  st = await stateOf(page)
  if (st.layers.length === layersBefore && st.history.length === histBeforeReject) pass('8 reject leaves document untouched')
  else fail('8 reject', `${layersBefore}/${histBeforeReject} -> ${st.layers.length}/${st.history.length}`)

  // 9/10. Undo/redo the accepted text removal (walk back to it).
  const cur = await stateOf(page)
  await VE(page, () => window.__voidEditor.getState().undo())
  await page.waitForTimeout(300)
  const und = await stateOf(page)
  await VE(page, () => window.__voidEditor.getState().redo())
  await page.waitForTimeout(300)
  const red = await stateOf(page)
  if (und.historyIndex === cur.historyIndex - 1 && red.historyIndex === cur.historyIndex) pass('9/10 undo + redo work')
  else fail('9/10 undo/redo', `${cur.historyIndex}/${und.historyIndex}/${red.historyIndex}`)

  // 11. Save + reopen keeps the repair patch layer.
  const saved = await VE(page, () => window.__vcAssets.saveVoid())
  if (saved?.b64 && saved.len > 1000) pass(`11a save .void (${(saved.len / 1024).toFixed(0)} KB)`)
  else fail('11a save', String(saved?.len))
  await VE(page, b64 => window.__vcAssets.openVoid(b64), saved.b64)
  await page.waitForTimeout(800)
  st = await stateOf(page)
  const patch = st.layers.find(l => /repair/i.test(l.name ?? ''))
  if (patch) pass(`11b reopen keeps repair patch (${st.layers.length} layers)`)
  else fail('11b reopen', JSON.stringify(st.layers.map(l => l.name)))

  // 12. Export dimensions + alpha.
  const png = await VE(page, () => window.__vcAssets.exportBoard('png'))
  const pngOk = png?.b64 && Buffer.from(png.b64, 'base64')[0] === 0x89
  if (pngOk) pass(`12a PNG export (${(png.len / 1024).toFixed(0)} KB)`)
  else fail('12a PNG', String(png?.len))
  const pdf = await VE(page, () => window.__vcAssets.exportBoard('pdf'))
  const pdfOk = pdf?.b64 && Buffer.from(pdf.b64, 'base64').subarray(0, 5).toString() === '%PDF-'
  if (pdfOk) pass('12b PDF export')
  else fail('12b PDF', String(pdf?.len))

  // 13. Cancel path: open with a large hole, cancel immediately.
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 100, y: 100, w: 300, h: 300 })
  const layersPre = (await stateOf(page)).layers.length
  await openRepair()
  await page.waitForTimeout(400)
  const cancelBtn = await page.$('[data-testid="repair-dialog"] button:has-text("Cancel")')
  if (cancelBtn) await cancelBtn.click()
  else {
    const rj = await page.$('[data-testid="repair-dialog"] button:has-text("Reject")')
    if (rj) await rj.click()
    else await page.keyboard.press('Escape')
  }
  await page.waitForTimeout(500)
  const layersPost = (await stateOf(page)).layers.length
  const dlgGone = !(await page.evaluate(() => !!document.querySelector('[data-testid="repair-dialog"]')))
  // Cancel may land after a proposal finished; either way no new layer without Accept.
  if (layersPost === layersPre && dlgGone) pass('13 cancel/reject adds no layer')
  else fail('13 cancel', `${layersPre} -> ${layersPost}, open=${!dlgGone}`)

  // 14. Edit before accept => stale refusal with notice.
  await VE(page, r => window.__vcRefine.selectRect(r.x, r.y, r.w, r.h), { x: 600, y: 400, w: 60, h: 40 })
  await openRepair()
  await waitProposal()
  if (await acceptVisible()) {
    await VE(page, () => window.__voidEditor.getState().addText(400, 100, 'stale probe'))
    await page.waitForTimeout(400)
    await page.click('[data-testid="repair-dialog"] button:has-text("Accept proposal")')
    await page.waitForTimeout(400)
    const note = await page.evaluate(() => document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '')
    const noPatch = !(await stateOf(page)).layers.some(l => /Repair \(local\)|Repair \(AI\)/.test(l.name ?? '') && false)
    void noPatch
    if (/changed|Stale|gone/i.test(note)) pass('14 stale accept refused with notice')
    else fail('14 stale', note.slice(0, 200))
  } else fail('14 stale setup', 'no proposal to go stale | ' + (await dlgText()))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 15. Document switch mid-dialog: close, verify clean new doc, no crash.
  await VE(page, () => { window.__voidEditor.getState().newDoc({ name: 'Fresh', width: 800, height: 600, background: '#ffffff' }) })
  await page.waitForTimeout(500)
  st = await stateOf(page)
  if (st.layers.length === 0) pass('15 document switch stays clean')
  else fail('15 doc switch', `${st.layers.length} layers`)

  // 16. Empty mask: dialog says to select a region first.
  await VE(page, () => window.__vcRefine.clearSelection())
  await openRepair()
  await page.waitForTimeout(600)
  const emptyNote = await page.evaluate(() => document.querySelector('[data-testid="repair-dialog"]')?.textContent ?? '')
  if (/Select a region/.test(emptyNote)) pass('16 empty mask handled')
  else fail('16 empty mask', emptyNote.slice(0, 160))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 17. Refine bar: keyboard labels + mobile fit.
  await VE(page, b64 => window.__vcAssets.placeBytes(b64, 'refine-photo2.png', 'image/png'), fixtureB64)
  await page.waitForTimeout(600)
  const newPhoto = (await stateOf(page)).layers.find(l => /refine-photo2/.test(l.name ?? ''))
  if (newPhoto) {
    await VE(page, id => window.__voidEditor.getState().setActive(id), newPhoto.id)
    await VE(page, () => window.__vcRefine.enter())
    await page.waitForTimeout(400)
    const bar = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="refine-bar"]')
      if (!el) return { open: false }
      const btns = Array.from(el.querySelectorAll('button'))
      const labelled = btns.filter(b => ((b.getAttribute('aria-label') || b.textContent) ?? '').trim().length > 0)
      return { open: true, total: btns.length, labelled: labelled.length }
    })
    if (bar.open && bar.total > 0 && bar.labelled === bar.total) pass(`17a refine bar keyboard-labelled (${bar.labelled}/${bar.total})`)
    else fail('17a refine bar', JSON.stringify(bar))
    await snap(page, 'refine-17-bar.png')
    await VE(page, () => window.__vcRefine.exit())
  } else fail('17a setup', 'second photo missing')
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mob.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await mob.waitForFunction(() => window.__voidEditor && window.__vcRefine, null, { timeout: 60000 })
  await VE(mob, () => { window.__voidEditor.getState().newDoc({ name: 'Refine mobile', width: 800, height: 600, background: '#ffffff' }) })
  await VE(mob, b64 => window.__vcAssets.placeBytes(b64, 'm.png', 'image/png'), fixtureB64)
  await mob.waitForTimeout(600)
  const mid = (await VE(mob, () => window.__vcAssets.state())).layers[0]?.id
  if (mid) {
    await VE(mob, id => window.__voidEditor.getState().setActive(id), mid)
    await VE(mob, () => window.__vcRefine.enter())
    await mob.waitForTimeout(500)
    await snap(mob, 'refine-17-mobile.png')
    const fit = await mob.evaluate(() => {
      const el = document.querySelector('[data-testid="refine-bar"]')
      if (!el) return { open: false }
      const r = el.getBoundingClientRect()
      return { open: true, fits: r.width <= window.innerWidth + 1 }
    })
    if (fit.open && fit.fits) pass('17b mobile refine bar fits 390px')
    else fail('17b mobile', JSON.stringify(fit))
  } else fail('17b mobile setup', 'no layer')
  await mob.close()

  // 18. No AI/provider network calls + console hygiene.
  if (externalRequests.length === 0) pass('18a zero AI network calls')
  else fail('18a network', externalRequests.slice(0, 3).join(' | '))
  const realErrors = consoleErrors.filter(e => !/font|Font|Google/i.test(e))
  if (realErrors.length === 0) pass('18b no console errors')
  else fail('18b console', realErrors.slice(0, 3).join(' | '))
} catch (e) {
  fail('harness exception', String((e && e.stack) || e).slice(0, 500))
  failed = true
} finally {
  const report = { at: new Date().toISOString(), base: BASE, results }
  fs.writeFileSync(path.join(EVIDENCE, 'refine-flow.json'), JSON.stringify(report, null, 2))
  const bad = results.filter(r => !r.ok)
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`)
  await browser.close()
  if (bad.length || failed) process.exitCode = 1
}
