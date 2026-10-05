import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { BRAND_FIXTURE_CASES, BRAND_NAMES, materializeBrandFixtures } from './brand-fixtures.mjs'

const OUT = path.resolve('e2e/.out/brand-diversity')
const SHEETS = path.join(OUT, 'contact-sheets')
fs.mkdirSync(SHEETS, { recursive: true })

const compiled = await build({
  stdin: {
    contents: `
      export { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      export { renderPage, DEFAULT_PAGES } from './src/studio/brand-pages'
      export { analyseLogo, NO_DECISIONS } from './src/studio/brand/logo'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'BrandBaseline',
  write: false,
})

const fixtures = await materializeBrandFixtures()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 })
await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
await page.addScriptTag({ content: compiled.outputFiles[0].text })
await page.evaluate(() => { window.__brandLogos = {} })

for (const fixture of fixtures) {
  const bytes = fs.readFileSync(fixture.file).toString('base64')
  const mime = fixture.kind === 'svg' ? 'image/svg+xml' : fixture.mime
  await page.evaluate(async ({ id, name, bytes, mime }) => {
    const raw = atob(bytes)
    const data = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i)
    const file = new File([data], name, { type: mime })
    window.__brandLogos[id] = await BrandBaseline.analyseLogo(file)
  }, { id: fixture.id, name: path.basename(fixture.file), bytes, mime })
}

const hashRows = []
for (const fixture of BRAND_FIXTURE_CASES) {
  for (const name of BRAND_NAMES) {
    for (let seed = 0; seed < 10; seed++) {
      const row = await page.evaluate(async ({ fixtureId, name, tagline, seed }) => {
        const t = BrandBaseline.initialTokens()
        t.name = name
        t.tagline = tagline
        t.salt = seed
        t.personality = seed % 6
        t.heading = { value: { family: 'Arial', source: 'local' }, locked: true }
        t.body = { value: { family: 'Arial', source: 'local' }, locked: true }
        t.mono = { value: { family: 'Courier New', source: 'local' }, locked: true }
        const r = BrandBaseline.resolve(t)
        const brand = BrandBaseline.buildBrand(r)
        const spec = BrandBaseline.DEFAULT_PAGES.find(p => p.kind === 'cover')
        const canvas = await BrandBaseline.renderPage(spec, 1, 15, brand, window.__brandLogos[fixtureId], 'landscape', 0.08, BrandBaseline.NO_DECISIONS, [])
        const mini = document.createElement('canvas')
        mini.width = 8
        mini.height = 8
        const x = mini.getContext('2d', { willReadFrequently: true })
        x.drawImage(canvas, 0, 0, 8, 8)
        const d = x.getImageData(0, 0, 8, 8).data
        const gray = []
        for (let i = 0; i < d.length; i += 4) gray.push(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)
        const avg = gray.reduce((a, b) => a + b, 0) / gray.length
        let bits = 0n
        for (let i = 0; i < gray.length; i++) if (gray[i] >= avg) bits |= 1n << BigInt(i)
        return { hash: bits.toString(16).padStart(16, '0'), direction: brand.direction }
      }, { fixtureId: fixture.id, name, tagline: fixture.tagline, seed })
      hashRows.push({ fixture: fixture.id, name, seed, ...row })
    }
  }
}

function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`)
  let n = 0
  while (x) { n += Number(x & 1n); x >>= 1n }
  return n
}

let total = 0
let pairs = 0
let min = 64
let max = 0
for (let i = 0; i < hashRows.length; i++) {
  for (let j = i + 1; j < hashRows.length; j++) {
    const d = hamming(hashRows[i].hash, hashRows[j].hash)
    total += d
    pairs++
    min = Math.min(min, d)
    max = Math.max(max, d)
  }
}

const sameBrand = []
for (const fixture of BRAND_FIXTURE_CASES) {
  const rows = hashRows.filter(r => r.fixture === fixture.id && r.name === BRAND_NAMES[0])
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) sameBrand.push(hamming(rows[i].hash, rows[j].hash))
}

const summary = {
  generatedAt: new Date().toISOString(),
  hash: '8x8 average perceptual hash, 64 bit',
  covers: hashRows.length,
  pairwise: { min, max, mean: +(total / pairs).toFixed(3) },
  sameBrandTenTakes: {
    min: Math.min(...sameBrand),
    max: Math.max(...sameBrand),
    mean: +(sameBrand.reduce((a, b) => a + b, 0) / sameBrand.length).toFixed(3),
  },
}
fs.writeFileSync(path.join(OUT, 'baseline-visual-summary.json'), JSON.stringify(summary, null, 2))
fs.writeFileSync(path.join(OUT, 'baseline-cover-hashes.json'), JSON.stringify(hashRows, null, 2))
console.log(JSON.stringify(summary, null, 2))

const showcaseKinds = ['cover', 'colour', 'clearspace', 'type']
for (const fixture of BRAND_FIXTURE_CASES) {
  await page.evaluate(() => { document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;background:#171719;color:white;font:14px Arial;padding:24px' })
  await page.evaluate(({ title }) => { const h = document.createElement('h1'); h.textContent = title; h.style.cssText = 'font:700 24px Arial;margin:0 0 20px'; document.body.appendChild(h); const g = document.createElement('div'); g.id = 'grid'; g.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:14px'; document.body.appendChild(g) }, { title: `${fixture.name} · baseline` })
  for (let seed = 0; seed < 3; seed++) {
    for (const kind of showcaseKinds) {
      await page.evaluate(async ({ fixtureId, name, tagline, seed, kind }) => {
        const t = BrandBaseline.initialTokens(); t.name = name; t.tagline = tagline; t.salt = seed; t.personality = seed % 6
        t.heading = { value: { family: 'Arial', source: 'local' }, locked: true }; t.body = { value: { family: 'Arial', source: 'local' }, locked: true }; t.mono = { value: { family: 'Courier New', source: 'local' }, locked: true }
        const b = BrandBaseline.buildBrand(BrandBaseline.resolve(t))
        const spec = BrandBaseline.DEFAULT_PAGES.find(p => p.kind === kind)
        const on = BrandBaseline.DEFAULT_PAGES.filter(p => p.on)
        const index = on.findIndex(p => p.kind === kind)
        const c = await BrandBaseline.renderPage(spec, index + 1, on.length, b, window.__brandLogos[fixtureId], 'landscape', 0.22, BrandBaseline.NO_DECISIONS, [])
        c.style.cssText = 'width:100%;height:auto;display:block;border-radius:5px'
        const wrap = document.createElement('div'); wrap.style.cssText = 'background:#242428;padding:8px;border-radius:8px'
        const cap = document.createElement('div'); cap.textContent = `Take ${seed + 1} · ${kind} · ${b.direction}`; cap.style.cssText = 'margin:0 0 6px;color:#c7c7cc;font:12px Arial'
        wrap.append(cap, c); document.querySelector('#grid').appendChild(wrap)
      }, { fixtureId: fixture.id, name: fixture.name, tagline: fixture.tagline, seed, kind })
    }
  }
  await page.screenshot({ path: path.join(SHEETS, `${fixture.id}.png`), fullPage: true })
}

await browser.close()
