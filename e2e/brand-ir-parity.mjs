// Phase 1 parity measurement for the first Brand Guidelines V2 IR pages.
// Writes side-by-side contact sheets and machine-readable pixel/recorder drift metrics.
// This is measurement only. Production routing stays on the legacy renderer until the
// measured drift is accepted and the recorder boxes are brought within the Phase 1 gate.

import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { materializeFixtures } from './brand-fixtures.mjs'

const OUT = 'e2e/.out/brand-ir-parity'
await mkdir(OUT, { recursive: true })
const fixtureDir = `${OUT}/fixtures`
const fixtures = await materializeFixtures(fixtureDir)
const selected = fixtures.filter((f) => ['black-wordmark', 'red-symbol'].includes(f.id))

const compiled = await build({
  stdin: {
    contents: `
      export { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      export { analyseLogo, NO_DECISIONS } from './src/studio/brand/logo'
      export { renderPage, recordPages } from './src/studio/brand-pages'
      export { composeCompatibilityPage } from './src/brand/compose/compat-pages'
      export { renderIrPage, recordIrPage } from './src/studio/brand/ir-render'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'BrandParity',
  write: false,
})

const payload = []
for (const fixture of selected) {
  const bytes = await readFile(fixture.path)
  payload.push({
    id: fixture.id,
    name: fixture.name,
    mime: fixture.mime,
    filename: fixture.path.split('/').pop(),
    bytes: bytes.toString('base64'),
  })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } })
await page.setContent('<!doctype html><html><body style="margin:0;background:#111"></body></html>')
await page.addScriptTag({ content: compiled.outputFiles[0].text })

const rows = await page.evaluate(async (fixtures) => {
  const api = window.BrandParity
  const from64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  const pageNo = { cover: 1, clearspace: 4, colour: 7 }
  const kinds = ['cover', 'colour', 'clearspace']

  const pixels = (canvas) =>
    canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data

  const pixelMetric = (a, b) => {
    const pa = pixels(a), pb = pixels(b)
    let absolute = 0, changed = 0, max = 0
    const n = Math.min(pa.length, pb.length)
    for (let i = 0; i < n; i += 4) {
      const d = Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2])
      absolute += d
      if (d > 30) changed++
      if (d > max) max = d
    }
    const count = n / 4
    return {
      meanRgbAbsolute: absolute / Math.max(1, count * 3),
      changedPixelShare: changed / Math.max(1, count),
      maxRgbSumDelta: max,
    }
  }

  const recorderMetric = (legacy, ir) => {
    const summary = (items) => ({
      text: items.filter((x) => x.kind === 'text').length,
      shape: items.filter((x) => x.kind === 'shape').length,
      image: items.filter((x) => x.kind === 'image').length,
    })
    const textMap = (items) =>
      new Map(items.filter((x) => x.kind === 'text').map((x) => [x.text, x]))
    const a = textMap(legacy.items), b = textMap(ir.items)
    const shared = [...a.keys()].filter((key) => b.has(key))
    const boxDrift = shared.map((key) => {
      const x = a.get(key), y = b.get(key)
      return {
        text: key,
        dx: Math.abs(x.x - y.x),
        dy: Math.abs(x.y - y.y),
        size: Math.abs(x.fontSize - y.fontSize),
      }
    })
    return {
      legacy: summary(legacy.items),
      ir: summary(ir.items),
      legacyTextCount: a.size,
      irTextCount: b.size,
      sharedTextCount: shared.length,
      maxSharedTextBoxDrift: boxDrift.length
        ? Math.max(...boxDrift.map((x) => Math.max(x.dx, x.dy, x.size)))
        : null,
      textBoxDrift: boxDrift,
    }
  }

  const out = []
  for (const fixture of fixtures) {
    const file = new File([from64(fixture.bytes)], fixture.filename, { type: fixture.mime })
    const logo = await api.analyseLogo(file)
    const brandColor = fixture.id === 'red-symbol' ? '#d7283f' : '#94c11f'
    const brand = api.buildBrand(
      api.resolve({
        ...api.initialTokens(),
        name: fixture.name,
        tagline: 'A deterministic parity identity',
        brandColor,
        personality: fixture.id === 'red-symbol' ? 1 : 3,
        salt: 4,
        layoutSalt: 2,
      }),
    )

    for (const kind of kinds) {
      const legacy = await api.renderPage(
        { kind, variant: 0, on: true },
        pageNo[kind],
        15,
        brand,
        logo,
        'landscape',
        0.5,
        api.NO_DECISIONS,
        [],
      )
      const composed = api.composeCompatibilityPage(kind, {
        brand,
        orientation: 'landscape',
        pageNo: pageNo[kind],
        pageCount: 15,
        logoAspect: logo.width / logo.height,
        year: new Date().getFullYear(),
      })
      const ir = await api.renderIrPage(composed, brand, logo, 0.5, api.NO_DECISIONS)

      const legacyRecorded = (
        await api.recordPages(
          [{ kind, variant: 0, on: true }],
          brand,
          logo,
          'landscape',
          undefined,
          api.NO_DECISIONS,
          [],
        )
      )[0]
      const recordComposed = api.composeCompatibilityPage(kind, {
        brand,
        orientation: 'landscape',
        pageNo: 1,
        pageCount: 1,
        logoAspect: logo.width / logo.height,
        year: new Date().getFullYear(),
      })
      const irRecorded = await api.recordIrPage(recordComposed, brand, logo, api.NO_DECISIONS)

      out.push({
        fixture: fixture.id,
        fixtureName: fixture.name,
        kind,
        pixel: pixelMetric(legacy, ir),
        recorder: recorderMetric(legacyRecorded, irRecorded),
        legacy: legacy.toDataURL('image/jpeg', 0.82),
        ir: ir.toDataURL('image/jpeg', 0.82),
      })
    }
  }
  return out
}, payload)

const serialisable = rows.map(({ legacy, ir, ...row }) => row)
await writeFile(`${OUT}/metrics.json`, JSON.stringify(serialisable, null, 2))

await page.setContent(`<!doctype html><html><body style="margin:24px;background:#101010;color:#eee;font:13px Arial"><h1 style="font-size:22px">Brand V2 Phase 1 · legacy / IR parity</h1><p style="color:#aaa">Left is current production. Right is IR. Metrics are written to metrics.json.</p><div id="rows"></div></body></html>`)
await page.evaluate((rows) => {
  const root = document.getElementById('rows')
  for (const row of rows) {
    const section = document.createElement('section')
    section.style.cssText = 'margin:28px 0 42px;border-top:1px solid #333;padding-top:16px'
    section.innerHTML = `<h2 style="font-size:16px">${row.fixtureName} · ${row.kind}</h2><p style="color:#aaa">mean RGB drift ${row.pixel.meanRgbAbsolute.toFixed(2)} · changed ${(row.pixel.changedPixelShare * 100).toFixed(2)}% · shared recorder text ${row.recorder.sharedTextCount}/${row.recorder.legacyTextCount}</p>`
    const grid = document.createElement('div')
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px'
    for (const [label, src] of [['Legacy', row.legacy], ['IR', row.ir]]) {
      const card = document.createElement('div')
      card.innerHTML = `<div style="margin-bottom:6px;color:#bbb">${label}</div><img style="display:block;width:100%;height:auto;background:#fff" src="${src}">`
      grid.append(card)
    }
    section.append(grid)
    root.append(section)
  }
}, rows)
await page.screenshot({ path: `${OUT}/contact-sheet.png`, fullPage: true })

console.log(JSON.stringify(serialisable, null, 2))
await browser.close()
