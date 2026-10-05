import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const OUT = path.resolve('e2e/.out/brand-diversity/phase2-visual')
fs.mkdirSync(OUT, { recursive: true })

const compiled = await build({
  stdin: {
    contents: `
      import { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      import { DIRECTION_FAMILIES } from './src/brand/compose/families'
      import { composeBrandTakes } from './src/brand/compose/document'
      import { paintCanvas } from './src/brand/compose/paint-canvas'
      import { createBrandPaintResolver } from './src/brand/compose/brand-resolver'
      window.__brandV2 = { buildBrand, initialTokens, resolve, DIRECTION_FAMILIES, composeBrandTakes, paintCanvas, createBrandPaintResolver }
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  write: false,
})

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
await page.setContent('<!doctype html><html><body style="margin:0;background:#111"></body></html>')
await page.addScriptTag({ content: compiled.outputFiles[0].text })

const fixtures = [
  { name: 'Northbank', tagline: 'Built to last', color: '#111111' },
  { name: 'Kite', tagline: 'Make it visible', color: '#e31f26' },
  { name: 'Flux', tagline: 'Always changing', color: '#7c3aed' },
  { name: 'Ọ̀nà Studio', tagline: 'Ẹ̀wà, ìtẹ́lọ́rùn, ɓuri ɗaya', color: '#0f766e' },
]

const results = []

for (let familyIndex = 0; familyIndex < 12; familyIndex++) {
  const fixture = fixtures[familyIndex % fixtures.length]
  const rendered = await page.evaluate(({ familyIndex, fixture }) => {
    const api = window.__brandV2
    const tokens = api.initialTokens()
    tokens.name = fixture.name
    tokens.tagline = fixture.tagline
    tokens.brandColor = fixture.color
    tokens.personality = familyIndex % 6
    tokens.salt = familyIndex * 13 + 3
    const brand = api.buildBrand(api.resolve(tokens))
    const family = api.DIRECTION_FAMILIES[familyIndex]
    const takes = api.composeBrandTakes({ brand, family, startSeed: 1, count: 8 })

    const contrastInk = (hex) => {
      const h = hex.replace('#', '')
      if (!/^[0-9a-f]{6}$/i.test(h)) return '#111111'
      const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      const l = rgb.reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
      return l > 0.55 ? '#111111' : '#ffffff'
    }

    const makeResolver = () => {
      let resolver
      resolver = api.createBrandPaintResolver(brand, {
        drawLogo(node, ctx) {
          const bg = resolver.colour(node.on)
          const fg = contrastInk(bg)
          const r = node.rect
          const s = Math.min(r.w, r.h) * 0.28
          ctx.save()
          ctx.translate(r.x + r.w / 2, r.y + r.h / 2)
          ctx.strokeStyle = fg
          ctx.lineWidth = Math.max(3, s * 0.12)
          ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(-s * .7, s * .7); ctx.lineTo(s * .7, -s * .7); ctx.stroke()
          ctx.restore()
        },
        drawImage(node, ctx) {
          const r = node.rect
          ctx.save()
          ctx.fillStyle = resolver.colour({ role: 'neutral', step: 200 })
          ctx.fillRect(r.x, r.y, r.w, r.h)
          ctx.fillStyle = resolver.colour({ role: 'brand', alpha: .18 })
          ctx.beginPath(); ctx.arc(r.x + r.w * .68, r.y + r.h * .42, Math.min(r.w, r.h) * .28, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
        },
        drawDevice(node, ctx) {
          const r = node.rect
          ctx.save()
          if (node.kind === 'angle-field') {
            const spacing = Number(node.params.spacing ?? 64)
            const angle = Number(node.params.angle ?? 24) * Math.PI / 180
            ctx.strokeStyle = resolver.colour({ role: 'ink', alpha: Number(node.params.opacity ?? .08) })
            ctx.lineWidth = 3
            ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(angle)
            for (let x = -r.w; x <= r.w; x += spacing) { ctx.beginPath(); ctx.moveTo(x, -r.h); ctx.lineTo(x, r.h); ctx.stroke() }
          } else {
            ctx.fillStyle = resolver.colour({ role: 'brand', alpha: Number(node.params.opacity ?? .12) })
            ctx.beginPath(); ctx.arc(r.x + r.w * .68, r.y + r.h * .38, Math.min(r.w, r.h) * .52, 0, Math.PI * 2); ctx.fill()
          }
          ctx.restore()
        },
        drawSpecimen(node, ctx) {
          const r = node.rect
          ctx.fillStyle = resolver.colour({ role: 'ink' })
          ctx.font = `700 ${Math.min(190, r.h * .42)}px ${JSON.stringify(brand.fonts[node.family].family)}`
          ctx.textBaseline = 'top'
          ctx.fillText(node.mode === 'waterfall' ? 'Aa 72' : brand.name, r.x, r.y, r.w)
          ctx.font = `500 ${Math.min(42, r.h * .11)}px ${JSON.stringify(brand.fonts.body.family)}`
          ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ', r.x, r.y + r.h * .55, r.w)
        },
      })
      return resolver
    }

    function phash(source) {
      const c = document.createElement('canvas'); c.width = 32; c.height = 32
      const x = c.getContext('2d', { willReadFrequently: true })
      x.drawImage(source, 0, 0, 32, 32)
      const data = x.getImageData(0, 0, 32, 32).data
      const g = new Float64Array(1024)
      for (let i = 0; i < 1024; i++) g[i] = data[i * 4] * .299 + data[i * 4 + 1] * .587 + data[i * 4 + 2] * .114
      const coeff = []
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
        let sum = 0
        for (let y = 0; y < 32; y++) for (let xx = 0; xx < 32; xx++) sum += g[y * 32 + xx] * Math.cos(((2 * xx + 1) * u * Math.PI) / 64) * Math.cos(((2 * y + 1) * v * Math.PI) / 64)
        coeff.push(sum)
      }
      const sorted = coeff.slice(1).sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      let bits = ''
      for (const value of coeff) bits += value > median ? '1' : '0'
      let hex = ''
      for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
      return hex
    }

    const sheet = document.createElement('canvas')
    sheet.width = 1280; sheet.height = 760
    const sx = sheet.getContext('2d')
    sx.fillStyle = '#111'; sx.fillRect(0, 0, sheet.width, sheet.height)
    sx.fillStyle = '#fff'; sx.font = '600 22px Arial'; sx.fillText(`${family.name} · ${brand.name}`, 24, 30)

    const hashes = []
    const signatures = []
    for (let i = 0; i < takes.length; i++) {
      const cover = takes[i].pages[0]
      const c = document.createElement('canvas'); c.width = cover.width; c.height = cover.height
      api.paintCanvas(cover, c.getContext('2d'), makeResolver())
      hashes.push(phash(c))
      signatures.push(cover.genome.compositionId)
      const col = i % 4, row = Math.floor(i / 4)
      const x = 24 + col * 310, y = 54 + row * 340
      sx.drawImage(c, x, y, 288, 162)
      sx.fillStyle = '#ddd'; sx.font = '13px Arial'; sx.fillText(`${i + 1}. ${cover.genome.compositionId}`, x, y + 183)
      const interior = takes[i].pages[1 + (i % Math.max(1, takes[i].pages.length - 1))]
      const ic = document.createElement('canvas'); ic.width = interior.width; ic.height = interior.height
      api.paintCanvas(interior, ic.getContext('2d'), makeResolver())
      sx.drawImage(ic, x, y + 195, 288, 162)
    }
    return { family: family.id, brand: brand.name, hashes, signatures, png: sheet.toDataURL('image/png') }
  }, { familyIndex, fixture })

  const b64 = rendered.png.split(',')[1]
  const file = path.join(OUT, `${String(familyIndex + 1).padStart(2, '0')}-${rendered.family}.png`)
  fs.writeFileSync(file, Buffer.from(b64, 'base64'))
  delete rendered.png
  results.push({ ...rendered, file: path.relative(process.cwd(), file) })
}

await browser.close()

function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`)
  let count = 0
  while (x) { count += Number(x & 1n); x >>= 1n }
  return count
}

let globalMin = 64
for (const result of results) {
  let min = 64
  for (let i = 0; i < result.hashes.length; i++) for (let j = i + 1; j < result.hashes.length; j++) min = Math.min(min, hamming(result.hashes[i], result.hashes[j]))
  result.minCoverPHashDistance = min
  globalMin = Math.min(globalMin, min)
}

const summary = {
  generatedAt: new Date().toISOString(),
  families: results.length,
  coversPerFamily: 8,
  targetMinCoverPHashDistance: 12,
  minCoverPHashDistance: globalMin,
  pHashPass: globalMin >= 12,
  results,
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))

if (results.length !== 12) throw new Error(`Expected 12 direction-family contact sheets, got ${results.length}`)
for (const result of results) {
  if (result.hashes.length !== 8 || result.signatures.length !== 8) throw new Error(`Expected eight cover takes for ${result.family}`)
}
if (!summary.pHashPass) throw new Error(`Brand V2 cover diversity regressed: minimum pHash distance ${summary.minCoverPHashDistance}, expected at least ${summary.targetMinCoverPHashDistance}`)
