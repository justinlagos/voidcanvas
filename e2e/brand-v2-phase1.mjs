import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { materializeBrandFixtures } from './brand-fixtures.mjs'

const OUT = path.resolve('e2e/.out/brand-v2-phase1')
fs.mkdirSync(OUT, { recursive: true })

const compiled = await build({
  stdin: {
    contents: `
      export { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      export { renderPage, DEFAULT_PAGES } from './src/studio/brand-pages'
      export { analyseLogo, NO_DECISIONS } from './src/studio/brand/logo'
      export { composeLegacyCover, composeLegacyColour } from './src/brand/compose/phase1-pages'
      export { paintCanvas } from './src/brand/compose/paint-canvas'
      export { studioCanvasHooks } from './src/brand/compose/studio-canvas'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'BrandV2Phase1',
  write: false,
})

const fixtures = await materializeBrandFixtures()
const fixture = fixtures.find((item) => item.id === 'red-symbol')
if (!fixture) throw new Error('Missing red-symbol fixture')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 1 })
await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
await page.addScriptTag({ content: compiled.outputFiles[0].text })

const bytes = fs.readFileSync(fixture.file).toString('base64')
await page.evaluate(async ({ bytes, name, mime }) => {
  const raw = atob(bytes)
  const data = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i)
  window.__phase1Logo = await BrandV2Phase1.analyseLogo(new File([data], name, { type: mime }))
}, { bytes, name: path.basename(fixture.file), mime: fixture.mime })

const metrics = []
for (const direction of ['editorial', 'graphic', 'systematic']) {
  for (const kind of ['cover', 'colour']) {
    const result = await page.evaluate(async ({ direction, kind }) => {
      const t = BrandV2Phase1.initialTokens()
      t.name = 'Kite Studio'
      t.tagline = 'Make it visible'
      t.brandColor = '#e31f26'
      t.heading = { value: { family: 'Arial', source: 'local' }, locked: true }
      t.body = { value: { family: 'Arial', source: 'local' }, locked: true }
      t.mono = { value: { family: 'Courier New', source: 'local' }, locked: true }
      t.direction = { value: direction, locked: true }
      t.radius = { value: 8, locked: true }
      t.gridCols = { value: 12, locked: true }
      const brand = BrandV2Phase1.buildBrand(BrandV2Phase1.resolve(t))
      const legacySpec = BrandV2Phase1.DEFAULT_PAGES.find((item) => item.kind === kind)
      const on = BrandV2Phase1.DEFAULT_PAGES.filter((item) => item.on)
      const pageNo = on.findIndex((item) => item.kind === kind) + 1
      const pageCount = on.length
      const scale = 0.25
      const oldCanvas = await BrandV2Phase1.renderPage(legacySpec, pageNo, pageCount, brand, window.__phase1Logo, 'landscape', scale, BrandV2Phase1.NO_DECISIONS, [])
      const ir = kind === 'cover'
        ? BrandV2Phase1.composeLegacyCover({ brand, orientation: 'landscape', pageNo, pageCount, year: new Date().getFullYear() })
        : BrandV2Phase1.composeLegacyColour({ brand, orientation: 'landscape', pageNo, pageCount, year: new Date().getFullYear() })
      const nextCanvas = document.createElement('canvas')
      nextCanvas.width = Math.round(ir.size.w * scale)
      nextCanvas.height = Math.round(ir.size.h * scale)
      const nx = nextCanvas.getContext('2d', { willReadFrequently: true })
      nx.scale(scale, scale)
      BrandV2Phase1.paintCanvas(ir, nx, { brand, hooks: BrandV2Phase1.studioCanvasHooks({ brand, logo: window.__phase1Logo, decisions: BrandV2Phase1.NO_DECISIONS }) })

      const ox = oldCanvas.getContext('2d', { willReadFrequently: true })
      const a = ox.getImageData(0, 0, oldCanvas.width, oldCanvas.height).data
      const b = nextCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, nextCanvas.width, nextCanvas.height).data
      let changed = 0
      let sum = 0
      let max = 0
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]))
        if (d > 20) changed++
        sum += d
        max = Math.max(max, d)
      }
      const pixels = a.length / 4
      return {
        direction,
        kind,
        changedShare: changed / pixels,
        meanChannelMaxDiff: sum / pixels,
        maxDiff: max,
        old: oldCanvas.toDataURL('image/png'),
        next: nextCanvas.toDataURL('image/png'),
      }
    }, { direction, kind })
    metrics.push(result)
  }
}

fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics.map(({ old, next, ...rest }) => rest), null, 2))

await page.evaluate(() => {
  document.body.innerHTML = ''
  document.body.style.cssText = 'margin:0;background:#151517;color:#fff;font:14px Arial;padding:24px'
  const h = document.createElement('h1')
  h.textContent = 'Brand V2 Phase 1 parity'
  h.style.cssText = 'font:700 24px Arial;margin:0 0 18px'
  document.body.appendChild(h)
  const grid = document.createElement('div')
  grid.id = 'grid'
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:18px'
  document.body.appendChild(grid)
})

for (const metric of metrics) {
  await page.evaluate(({ metric }) => {
    const grid = document.querySelector('#grid')
    for (const [label, src] of [['Legacy', metric.old], ['IR', metric.next]]) {
      const wrap = document.createElement('section')
      wrap.style.cssText = 'background:#242428;padding:10px;border-radius:9px'
      const cap = document.createElement('p')
      cap.textContent = `${metric.direction} · ${metric.kind} · ${label} · ${(metric.changedShare * 100).toFixed(2)}% changed`
      cap.style.cssText = 'margin:0 0 8px;color:#d4d4d8;font:12px Arial'
      const img = document.createElement('img')
      img.src = src
      img.style.cssText = 'display:block;width:100%;height:auto;border-radius:5px'
      wrap.append(cap, img)
      grid.appendChild(wrap)
    }
  }, { metric })
}
await page.screenshot({ path: path.join(OUT, 'parity.png'), fullPage: true })

console.log(JSON.stringify(metrics.map(({ old, next, ...rest }) => rest), null, 2))

// Text rasterisation and semantic hook ordering can move antialiasing pixels. Anything larger than this is a layout drift.
for (const metric of metrics) {
  const limit = metric.kind === 'cover' ? 0.12 : 0.18
  if (metric.changedShare > limit) {
    throw new Error(`${metric.direction} ${metric.kind} changed ${(metric.changedShare * 100).toFixed(2)}%, above ${(limit * 100).toFixed(0)}% parity budget`)
  }
}

await browser.close()
