// Brand Guidelines V2 Phase 0 diversity baseline.
//
// Run after a production build:
//   node e2e/brand-diversity-baseline.mjs
//
// It renders 50 deterministic generated brands with the current production renderer,
// records structural reuse and 64-bit perceptual hashes, and writes contact sheets plus
// raw JSON to e2e/.out/brand-diversity/. This is a measurement tool only. It does not
// change product behaviour.

import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { BRAND_FIXTURES, CORPUS_NAMES, BASELINE_PAGE_KINDS } from './fixtures/brand/fixtures.mjs'

const OUT = 'e2e/.out/brand-diversity'
await mkdir(OUT, { recursive: true })

const compiled = await build({
  stdin: {
    contents: `
      import { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      import { renderPage, PAGE_DEFS } from './src/studio/brand-pages'
      import { NO_DECISIONS } from './src/studio/brand/logo'
      export { buildBrand, initialTokens, resolve, renderPage, PAGE_DEFS, NO_DECISIONS }
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'BrandBaseline',
  write: false,
})

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } })
await page.setContent('<!doctype html><html><body style="margin:0;background:#111"></body></html>')
await page.addScriptTag({ content: compiled.outputFiles[0].text })

const sample = []
for (let i = 0; i < 50; i++) {
  const fixture = BRAND_FIXTURES[i % BRAND_FIXTURES.length]
  const name = fixture.fixedName ?? CORPUS_NAMES[Math.floor(i / BRAND_FIXTURES.length) % CORPUS_NAMES.length]
  sample.push({ fixture, name, seed: i })
}

const results = []
for (const item of sample) {
  const rendered = await page.evaluate(async ({ fixture, name, seed, pageKinds }) => {
    const api = window.BrandBaseline
    const profile = {
      width: Math.max(64, Math.round(320 * Math.max(1, fixture.aspect))),
      height: Math.max(64, Math.round(320 / Math.max(1, fixture.aspect))),
      bounds: { x: 0, y: 0, w: 1, h: 1 },
      aspect: fixture.aspect,
      transparent: fixture.transparent,
      coverage: fixture.coverage,
      luminance: fixture.colors.reduce((n, c) => n + c.luminance * c.share, 0),
      tone: fixture.colors.every(c => c.luminance < 0.25) ? 'dark' : fixture.colors.every(c => c.luminance > 0.75) ? 'light' : 'mixed',
      colors: fixture.colors,
      mono: fixture.mono,
      chromatic: fixture.chromatic,
      internalEdges: fixture.internalEdges,
      boundary: fixture.boundary ?? null,
      minStroke: fixture.minStroke,
      components: fixture.components,
      kind: fixture.kind,
      flatBackground: fixture.flatBackground,
    }

    const logoCanvas = document.createElement('canvas')
    logoCanvas.width = profile.width
    logoCanvas.height = profile.height
    const lx = logoCanvas.getContext('2d')
    lx.clearRect(0, 0, logoCanvas.width, logoCanvas.height)
    const pad = Math.max(4, Math.round(Math.min(logoCanvas.width, logoCanvas.height) * 0.08))
    if (fixture.colors.length === 1) {
      lx.fillStyle = fixture.colors[0].hex
      if (fixture.kind === 'wordmark') {
        lx.font = `700 ${Math.max(22, Math.round(logoCanvas.height * 0.62))}px Arial`
        lx.textBaseline = 'middle'
        lx.fillText(name, pad, logoCanvas.height / 2)
      } else {
        lx.fillRect(pad, pad, logoCanvas.width - pad * 2, logoCanvas.height - pad * 2)
      }
    } else {
      const stripe = (logoCanvas.width - pad * 2) / fixture.colors.length
      fixture.colors.forEach((c, i) => {
        lx.fillStyle = c.hex
        lx.fillRect(pad + stripe * i, pad, stripe + 1, logoCanvas.height - pad * 2)
      })
    }
    const logo = {
      img: logoCanvas,
      width: logoCanvas.width,
      height: logoCanvas.height,
      color: fixture.colors[0]?.hex ?? '#000000',
      colors: fixture.colors.map(c => ({ hex: c.hex, share: c.share })),
      knockedOut: !!fixture.flatBackground,
      svg: fixture.svg ? '<svg xmlns="http://www.w3.org/2000/svg"></svg>' : null,
      fileName: `${fixture.id}.${fixture.svg ? 'svg' : 'png'}`,
      profile,
    }

    let tokens = api.initialTokens()
    tokens = {
      ...tokens,
      name,
      tagline: fixture.tagline ?? 'A deterministic baseline identity',
      brandColor: fixture.brandColor,
      salt: seed,
      layoutSalt: seed,
      personality: seed % 6,
    }
    const resolved = api.resolve(tokens)
    const brand = api.buildBrand(resolved)

    const bitsFor = (canvas) => {
      const c = document.createElement('canvas')
      c.width = 8; c.height = 8
      const x = c.getContext('2d', { willReadFrequently: true })
      x.drawImage(canvas, 0, 0, 8, 8)
      const p = x.getImageData(0, 0, 8, 8).data
      const g = []
      for (let i = 0; i < p.length; i += 4) g.push(0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2])
      const avg = g.reduce((a, b) => a + b, 0) / g.length
      return g.map(v => v >= avg ? '1' : '0').join('')
    }

    const pages = []
    for (const kind of pageKinds) {
      const def = api.PAGE_DEFS[kind]
      if (!def) continue
      const variant = seed % def.variants.length
      const canvas = await api.renderPage({ kind, variant, on: true }, pages.length + 1, pageKinds.length, brand, logo, 'landscape', 0.34, api.NO_DECISIONS, [])
      pages.push({
        kind,
        variant,
        hash: bitsFor(canvas),
        data: canvas.toDataURL('image/jpeg', 0.72),
      })
    }

    return {
      id: `${fixture.id}-${seed}`,
      fixture: fixture.id,
      name,
      seed,
      direction: brand.direction,
      personality: brand.personality,
      gridCols: brand.grid.cols,
      radius: brand.radius,
      pages,
    }
  }, { ...item, pageKinds: BASELINE_PAGE_KINDS })
  results.push(rendered)
  console.log(`Rendered ${results.length}/50 ${rendered.fixture} ${rendered.name}`)
}

function hamming(a, b) {
  let d = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++
  return d + Math.abs(a.length - b.length)
}

function structuralDistance(a, b) {
  let score = 0
  if (a.direction !== b.direction) score += 1
  if (a.personality !== b.personality) score += 1
  if (a.gridCols !== b.gridCols) score += 1
  if (a.radius !== b.radius) score += 1
  const n = Math.max(a.pages.length, b.pages.length)
  for (let i = 0; i < n; i++) {
    const x = a.pages[i], y = b.pages[i]
    if (!x || !y) { score += 2; continue }
    if (x.kind !== y.kind) score += 1
    if (x.variant !== y.variant) score += 1
  }
  return score
}

const pairs = []
for (let i = 0; i < results.length; i++) {
  for (let j = i + 1; j < results.length; j++) {
    const a = results[i], b = results[j]
    pairs.push({
      a: a.id,
      b: b.id,
      structural: structuralDistance(a, b),
      coverHash: hamming(a.pages.find(p => p.kind === 'cover')?.hash ?? '', b.pages.find(p => p.kind === 'cover')?.hash ?? ''),
    })
  }
}

const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
const samePosition = BASELINE_PAGE_KINDS.map((kind, index) => {
  const keys = results.map(r => `${r.pages[index]?.kind ?? 'none'}:${r.pages[index]?.variant ?? -1}`)
  const counts = new Map()
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['none', 0]
  return { kind, mostCommonStructure: top[0], share: top[1] / keys.length }
})

const summary = {
  generatedAt: new Date().toISOString(),
  sampleSize: results.length,
  pageKinds: BASELINE_PAGE_KINDS,
  meanPairwiseStructuralDistance: mean(pairs.map(p => p.structural)),
  meanCoverHashDistanceBits: mean(pairs.map(p => p.coverHash)),
  minCoverHashDistanceBits: Math.min(...pairs.map(p => p.coverHash)),
  maxCoverHashDistanceBits: Math.max(...pairs.map(p => p.coverHash)),
  samePosition,
}

await writeFile(`${OUT}/baseline.json`, JSON.stringify({ summary, documents: results.map(r => ({ ...r, pages: r.pages.map(({ data, ...p }) => p) })), pairs }, null, 2))

// Twelve compact contact sheets, one per fixture. Each sheet shows up to five baseline documents
// with cover plus three representative interior pages.
for (const fixture of BRAND_FIXTURES) {
  const docs = results.filter(r => r.fixture === fixture.id).slice(0, 5)
  if (!docs.length) continue
  await page.setContent(`<!doctype html><html><body style="margin:24px;background:#111;color:#eee;font:14px Arial"><h1 style="font-size:20px">${fixture.label}</h1><div id="grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px"></div></body></html>`)
  await page.evaluate(({ docs }) => {
    const grid = document.getElementById('grid')
    for (const d of docs) {
      for (const p of d.pages) {
        const card = document.createElement('div')
        card.style.cssText = 'background:#1d1d1d;padding:8px;border-radius:8px;overflow:hidden'
        const img = document.createElement('img')
        img.src = p.data
        img.style.cssText = 'display:block;width:100%;height:auto;background:#fff'
        const cap = document.createElement('div')
        cap.textContent = `${d.name} · seed ${d.seed} · ${p.kind} v${p.variant}`
        cap.style.cssText = 'padding-top:6px;font-size:11px;color:#bbb'
        card.append(img, cap)
        grid.append(card)
      }
    }
  }, { docs })
  await page.screenshot({ path: `${OUT}/${fixture.id}.png`, fullPage: true })
}

console.log(JSON.stringify(summary, null, 2))
await browser.close()
