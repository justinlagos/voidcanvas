// Brand Guidelines V2 content pages: contact sheets and fit checks for every fixture.
//
// For each fixture brand this composes the full V2 document the builder would show (default pages,
// two photos so the photography page exists), renders every page through the production runtime and
// writes a contact sheet to e2e/.out/brand-v2-pages/. It then checks, and fails on:
//   1. content escaping its box: each content kind is drawn alone into every box its six structures
//      give it, and any paint outside the box is counted;
//   2. text leaving the page or two recorded text layers colliding, on every composed page;
//   3. a page shrinking its content below 85% (lint already refuses these; this proves none reach output).
// Usage: node e2e/brand-v2-pages.mjs   (needs network for Google Fonts, like the builder)

import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { materializeBrandFixtures } from './brand-fixtures.mjs'

const OUT = 'e2e/.out/brand-v2-pages'
await mkdir(OUT, { recursive: true })
const only = process.env.FIXTURES ? process.env.FIXTURES.split(',') : null
// FULL=id,id also writes each page of those fixtures at 1280 x 720 for a closer look.
const full = process.env.FULL ? process.env.FULL.split(',') : []
const fixtures = (await materializeBrandFixtures()).filter((f) => !only || only.includes(f.id))

const compiled = await build({
  stdin: {
    contents: `
      export { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      export { analyseLogo, NO_DECISIONS } from './src/studio/brand/logo'
      export { suggestRules } from './src/lib/intelligence/brand'
      export { DEFAULT_PAGES, PAGE_DEFS, drawPageBody, BODY_MIN } from './src/studio/brand-pages'
      export { composeRuntimePages } from './src/brand/compose/runtime'
      export { composeBodyCandidates, BODY_PAGE_KINDS } from './src/brand/compose/body-pages'
      export { familyById } from './src/brand/compose/families'
      export { renderRuntimePage, recordRuntimePages } from './src/studio/brand-v2-render'
      export { loadFont } from './src/studio/brand/fonts'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'browser', format: 'iife', globalName: 'V2Pages', write: false,
})

const payload = []
for (const f of fixtures) payload.push({ id: f.id, full: full.includes(f.id), name: f.name, tagline: f.tagline, mime: f.kind === 'svg' ? 'image/svg+xml' : f.mime, filename: f.file.split('/').pop(), bytes: (await readFile(f.file)).toString('base64') })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.setContent('<!doctype html><html><body style="margin:0;background:#111"></body></html>')
await page.addScriptTag({ content: compiled.outputFiles[0].text })

const runFixtures = (batch) => page.evaluate(async (fixtures) => {
  const api = window.V2Pages
  const from64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  const W = 1600, H = 900
  // Test photos with tone across the whole frame (a graded ground, soft texture) and a busy subject in the
  // middle, so placement is judged on something like a photo rather than on flat margins.
  const photo = (dark) => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, dark ? '#1b1d24' : '#f1efe9'); g.addColorStop(1, dark ? '#3b3d46' : '#c9c3b5'); x.fillStyle = g; x.fillRect(0, 0, 1200, 800)
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${dark ? '255,255,255' : '60,50,40'},${0.03 + r() * 0.05})`; x.beginPath(); x.arc(r() * 1200, r() * 800, 20 + r() * 90, 0, Math.PI * 2); x.fill() }
    for (let i = 0; i < 2400; i++) { x.fillStyle = `hsl(${r() * 360},60%,${dark ? 62 : 30}%)`; x.fillRect(420 + r() * 360, 250 + r() * 300, 8, 8) }
    return { id: dark ? 'd' : 'l', name: dark ? 'dark' : 'light', img: c }
  }
  const photos = [photo(false), photo(true)]
  const pages = [...api.DEFAULT_PAGES.slice(0, 6), { kind: 'photo', variant: 0, on: true }, ...api.DEFAULT_PAGES.slice(6)]
  const sheets = [], overflow = [], textIssues = [], scales = [], fullPages = [], documents = []

  for (const f of fixtures) {
    const logo = await api.analyseLogo(new File([from64(f.bytes)], f.filename, { type: f.mime }))
    // The logo-derived rules the builder applies when a logo is added: clear space, minimum sizes.
    const rules = api.suggestRules(logo.profile)
    const tokens = api.resolve({ ...api.initialTokens(), name: f.name, tagline: f.tagline, brandColor: logo.profile.colors.find((c) => c.chroma > 0.12 && c.share >= 0.05)?.hex ?? '#3d5afe', personality: f.id.length % 6, salt: 3, layoutSalt: 1, logoClear: { value: rules.clearSpace.value, locked: false }, logoMin: { value: rules.minWidth.value, locked: false }, logoMinPrint: { value: rules.minPrint.value, locked: false } })
    const brand = api.buildBrand(tokens)
    await Promise.all([api.loadFont(brand.fonts.heading, [400, 600, 700]), api.loadFont(brand.fonts.body, [400, 500, 600, 700]), api.loadFont(brand.fonts.mono, [400, 500, 600, 700])])
    await document.fonts.ready
    const runtime = api.composeRuntimePages({ brand, logo, pages, salt: tokens.salt, layoutSalt: tokens.layoutSalt ?? 0 })
    documents.push({ fixture: f.id, family: runtime.family.id, minWidth: brand.logo.minWidth, minPrint: brand.logo.minPrint, pages: pages.map((spec, i) => spec.on ? `${spec.kind}:${runtime.irByIndex.get(i)?.genome.typeTreatment ?? 'legacy'}` : null).filter(Boolean) })

    // 1. Content escaping its box, for every structure's box and the minimum box.
    for (const kind of api.BODY_PAGE_KINDS) {
      const boxes = api.composeBodyCandidates({ kind, brand, family: runtime.family, seed: 7, pageNo: 3, pageCount: 16 })
        .map((p) => ({ id: p.genome.typeTreatment, rect: p.nodes.find((n) => n.t === 'device' && n.kind === 'page-body').rect }))
      boxes.push({ id: 'minimum', rect: { x: 0, y: 0, w: api.BODY_MIN[kind].w, h: api.BODY_MIN[kind].h } })
      for (const box of boxes) {
        const pad = 200, c = document.createElement('canvas')
        c.width = Math.ceil(box.rect.w + pad * 2); c.height = Math.ceil(box.rect.h + pad * 2)
        const x = c.getContext('2d', { willReadFrequently: true })
        const s = api.drawPageBody(kind, x, { x: pad, y: pad, w: box.rect.w, h: box.rect.h }, { brand, logo, pageNo: 3, pageCount: 16, photos })
        const d = x.getImageData(0, 0, c.width, c.height).data
        let out = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1
        for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
          if (d[(yy * c.width + xx) * 4 + 3] < 24) continue
          const inside = xx >= pad - 1 && yy >= pad - 1 && xx <= pad + box.rect.w + 1 && yy <= pad + box.rect.h + 1
          if (!inside) { out++; minX = Math.min(minX, xx - pad); minY = Math.min(minY, yy - pad); maxX = Math.max(maxX, xx - pad); maxY = Math.max(maxY, yy - pad) }
        }
        if (out > 40) overflow.push({ fixture: f.id, kind, box: box.id, w: Math.round(box.rect.w), h: Math.round(box.rect.h), scale: +s.toFixed(3), pixelsOutside: out, extent: { minX, minY, maxX: Math.round(maxX - box.rect.w), maxY: Math.round(maxY - box.rect.h) } })
      }
    }

    // 2 and 3. Every composed page: scale, text bounds, collisions; and a contact sheet.
    const visible = pages.map((spec, i) => ({ spec, i })).filter(({ spec }) => spec.on)
    const thumbs = []
    for (let n = 0; n < visible.length; n++) {
      const { spec, i } = visible[n]
      const ir = runtime.irByIndex.get(i)
      for (const node of ir?.nodes ?? []) if (node.t === 'device' && node.kind === 'page-body') scales.push({ fixture: f.id, kind: spec.kind, structure: ir.genome.typeTreatment, scale: +Math.min(1, node.rect.w / node.params.minW, node.rect.h / node.params.minH).toFixed(3) })
      const c = await api.renderRuntimePage({ spec, irPage: ir, pageNo: n + 1, pageCount: visible.length, brand, logo, orientation: 'landscape', scale: 0.3, decisions: api.NO_DECISIONS, photos })
      thumbs.push({ c, label: `${spec.kind} · ${ir ? ir.genome.typeTreatment : 'legacy'}` })
      if (f.full) {
        const big = await api.renderRuntimePage({ spec, irPage: ir, pageNo: n + 1, pageCount: visible.length, brand, logo, orientation: 'landscape', scale: 0.8, decisions: api.NO_DECISIONS, photos })
        fullPages.push({ name: `${String(n + 1).padStart(2, '0')}-${spec.kind}.png`, png: big.toDataURL('image/png').split(',')[1] })
      }
    }
    const recorded = await api.recordRuntimePages({ pages, irByIndex: runtime.irByIndex, brand, logo, orientation: 'landscape', decisions: api.NO_DECISIONS, photos, titleFor: (s) => api.PAGE_DEFS[s.kind].title })
    const m = document.createElement('canvas').getContext('2d')
    recorded.forEach((rec, n) => {
      const boxes = rec.items.filter((it) => it.kind === 'text').map((it) => {
        m.font = `${it.italic ? 'italic ' : ''}${it.fontWeight} ${it.fontSize}px "${it.fontFamily}"`
        // The recorder stores the Editor text box: x is its left edge (alignment already applied) and y its top,
        // placed so the first baseline lands where the page drew it. Glyph boxes run from cap height to descender.
        const lines = String(it.text).split('\n'), fs = it.fontSize, lh = fs * (it.lineHeight || 1.2)
        const wMax = Math.max(...lines.map((l) => m.measureText(l).width + Math.max(0, l.length - 1) * (it.letterSpacing || 0)))
        const firstBaseline = it.y + 2 + (lh - fs) / 2 + fs * 0.82
        const x0 = it.x + 2
        return { text: String(it.text).slice(0, 40), x0, y0: firstBaseline - fs * 0.72, x1: x0 + wMax, y1: firstBaseline + (lines.length - 1) * lh + fs * 0.2, size: fs }
      })
      for (const b of boxes) if (b.x0 < -2 || b.y0 < -2 || b.x1 > W + 2 || b.y1 > H + 2) textIssues.push({ fixture: f.id, page: rec.title, issue: 'leaves the page', text: b.text, box: [Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1)] })
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a], B = boxes[b]
        const ow = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oh = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0)
        if (ow <= 2 || oh <= 2) continue
        const share = (ow * oh) / Math.max(1, Math.min((A.x1 - A.x0) * (A.y1 - A.y0), (B.x1 - B.x0) * (B.y1 - B.y0)))
        if (share > 0.25) textIssues.push({ fixture: f.id, page: rec.title, issue: 'text collides', text: `${A.text} / ${B.text}`, share: +share.toFixed(2) })
      }
    })

    const cols = 4, tw = 480, th = 270, gap = 16, lab = 22
    const sheet = document.createElement('canvas'); sheet.width = cols * (tw + gap) + gap; sheet.height = Math.ceil(thumbs.length / cols) * (th + gap + lab) + gap + 40
    const sx = sheet.getContext('2d'); sx.fillStyle = '#1b1b20'; sx.fillRect(0, 0, sheet.width, sheet.height)
    sx.fillStyle = '#fff'; sx.font = '600 18px sans-serif'; sx.fillText(`${f.id} · ${f.name} · family ${runtime.family.id}`, gap, 28)
    thumbs.forEach((t, k) => { const X = gap + (k % cols) * (tw + gap), Y = 40 + Math.floor(k / cols) * (th + gap + lab); sx.drawImage(t.c, X, Y, tw, th); sx.fillStyle = '#bbb'; sx.font = '13px sans-serif'; sx.fillText(t.label, X, Y + th + 16) })
    sheets.push({ id: f.id, png: sheet.toDataURL('image/png').split(',')[1] })
  }
  return { sheets, overflow, textIssues, scales, fullPages, documents }
}, batch)

// One fixture per call, so progress shows and a slow fixture is easy to spot.
const result = { sheets: [], overflow: [], textIssues: [], scales: [], documents: [] }
for (const f of payload) {
  const started = Date.now()
  const r = await runFixtures([f])
  for (const key of Object.keys(result)) result[key].push(...r[key])
  for (const s of r.sheets) await writeFile(`${OUT}/${s.id}.png`, Buffer.from(s.png, 'base64'))
  if (r.fullPages.length) {
    await mkdir(`${OUT}/${f.id}`, { recursive: true })
    for (const p of r.fullPages) await writeFile(`${OUT}/${f.id}/${p.name}`, Buffer.from(p.png, 'base64'))
  }
  console.log(`  ${f.id}: ${r.overflow.length} overflow, ${r.textIssues.length} text, ${((Date.now() - started) / 1000).toFixed(1)}s`)
}
const lowScale = result.scales.filter((s) => s.scale < 0.85)
const summary = { fixtures: result.sheets.length, overflow: result.overflow, textIssues: result.textIssues, lowScale, minScale: Math.min(...result.scales.map((s) => s.scale)), pageErrors: errors }
await writeFile(`${OUT}/summary.json`, JSON.stringify({ ...summary, documents: result.documents, scales: result.scales }, null, 2))
await browser.close()

console.log(`Contact sheets: ${result.sheets.length} in ${OUT}`)
console.log(`Content escaping its box: ${result.overflow.length}`)
for (const o of result.overflow.slice(0, 30)) console.log('  OVERFLOW', JSON.stringify(o))
console.log(`Text issues: ${result.textIssues.length}`)
for (const t of result.textIssues.slice(0, 30)) console.log('  TEXT', JSON.stringify(t))
console.log(`Lowest content scale on a composed page: ${summary.minScale}`)
if (errors.length) console.log('PAGE ERRORS', errors.slice(0, 5))
if (result.overflow.length || result.textIssues.length || lowScale.length || errors.length) process.exitCode = 1
else console.log('PASS Brand V2 content pages')
