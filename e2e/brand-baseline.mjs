import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { BRAND_FIXTURE_CASES, BRAND_NAMES } from './brand-fixtures.mjs'

const outDir = path.resolve('e2e/.out/brand-diversity')
fs.mkdirSync(outDir, { recursive: true })

const compiled = await build({
  stdin: {
    contents: `
      export { buildBrand, initialTokens, resolve } from './src/studio/brand/tokens'
      export { PAGE_DEFS, DEFAULT_PAGES } from './src/studio/brand-pages'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})

const mod = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const { buildBrand, initialTokens, resolve, PAGE_DEFS, DEFAULT_PAGES } = mod

const variantCounts = Object.fromEntries(Object.entries(PAGE_DEFS).map(([kind, def]) => [kind, def.variants.length]))
const totalVariants = Object.values(variantCounts).reduce((a, b) => a + b, 0)
const singleVariantKinds = Object.values(variantCounts).filter(v => v === 1).length

const directions = new Set()
const structures = new Map()
const documents = []

function signature(tokens) {
  const r = resolve(tokens)
  const b = buildBrand(r)
  directions.add(b.direction)
  const pages = DEFAULT_PAGES.filter(p => p.on).map(p => `${p.kind}:${p.variant}`)
  const sig = pages.join('|')
  structures.set(sig, (structures.get(sig) ?? 0) + 1)
  return {
    direction: b.direction,
    pages,
    gridCols: b.grid.cols,
    radius: b.radius,
    margin: b.grid.margin,
    gutter: b.grid.gutter,
    heading: b.fonts.heading.family,
    body: b.fonts.body.family,
    primary: b.roles[0].hex,
    secondary: b.roles[1].hex,
    accent: b.roles[2].hex,
  }
}

for (const fixture of BRAND_FIXTURE_CASES) {
  for (const name of BRAND_NAMES) {
    for (let seed = 0; seed < 10; seed++) {
      const t = initialTokens()
      t.name = name
      t.tagline = fixture.tagline
      t.salt = seed
      t.personality = seed % 6
      const s = signature(t)
      documents.push({ fixture: fixture.id, name, seed, ...s })
    }
  }
}

function positionalReuse(a, b) {
  const n = Math.max(a.pages.length, b.pages.length)
  let same = 0
  for (let i = 0; i < n; i++) if (a.pages[i] === b.pages[i]) same++
  return n ? same / n : 1
}

let pairs = 0
let reuseTotal = 0
let reuseMax = 0
for (let i = 0; i < documents.length; i++) {
  for (let j = i + 1; j < documents.length; j++) {
    const reuse = positionalReuse(documents[i], documents[j])
    reuseTotal += reuse
    reuseMax = Math.max(reuseMax, reuse)
    pairs++
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  corpus: {
    fixtures: BRAND_FIXTURE_CASES.length,
    namesPerFixture: BRAND_NAMES.length,
    seedsPerName: 10,
    documents: documents.length,
  },
  currentRenderer: {
    pageKinds: Object.keys(variantCounts).length,
    variants: totalVariants,
    singleVariantKinds,
    defaultPageCount: DEFAULT_PAGES.filter(p => p.on).length,
    observedArtDirections: [...directions].sort(),
    uniqueStructureSignatures: structures.size,
  },
  structuralBaseline: {
    meanSamePositionReuse: +(reuseTotal / Math.max(1, pairs)).toFixed(4),
    maxSamePositionReuse: +reuseMax.toFixed(4),
    mostCommonStructureShare: +(Math.max(...structures.values()) / documents.length).toFixed(4),
  },
  variantCounts,
  structures: [...structures.entries()].sort((a, b) => b[1] - a[1]).map(([structure, count]) => ({ structure, count })),
}

fs.writeFileSync(path.join(outDir, 'baseline-summary.json'), JSON.stringify(summary, null, 2))
fs.writeFileSync(path.join(outDir, 'baseline-documents.json'), JSON.stringify(documents, null, 2))

console.log(JSON.stringify(summary, null, 2))

if (summary.corpus.documents !== 1200) throw new Error(`Expected 1200 documents, got ${summary.corpus.documents}`)
if (summary.currentRenderer.pageKinds !== 16) throw new Error(`Expected 16 page kinds, got ${summary.currentRenderer.pageKinds}`)
if (summary.currentRenderer.variants !== 23) throw new Error(`Expected 23 variants, got ${summary.currentRenderer.variants}`)
if (summary.currentRenderer.singleVariantKinds !== 10) throw new Error(`Expected 10 single-variant kinds, got ${summary.currentRenderer.singleVariantKinds}`)
