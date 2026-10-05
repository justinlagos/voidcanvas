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
      export { DIRECTION_FAMILIES } from './src/brand/compose/families'
      export { composeBrandTakes } from './src/brand/compose/document'
      export { samePositionStructureShare, structureSignature, documentGenomeDistance } from './src/brand/compose/genome'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})

const mod = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const { buildBrand, initialTokens, resolve, DIRECTION_FAMILIES, composeBrandTakes, samePositionStructureShare, structureSignature, documentGenomeDistance } = mod

const documents = []
const signatures = new Map()
const groupStats = []

for (let fixtureIndex = 0; fixtureIndex < BRAND_FIXTURE_CASES.length; fixtureIndex++) {
  const fixture = BRAND_FIXTURE_CASES[fixtureIndex]
  for (let nameIndex = 0; nameIndex < BRAND_NAMES.length; nameIndex++) {
    const name = BRAND_NAMES[nameIndex]
    const tokens = initialTokens()
    tokens.name = `${name} ${fixture.name}`
    tokens.tagline = fixture.tagline
    tokens.personality = (fixtureIndex + nameIndex) % 6
    tokens.salt = fixtureIndex * 17 + nameIndex
    if (fixture.expected?.primary) tokens.brandColor = fixture.expected.primary
    const brand = buildBrand(resolve(tokens))
    const family = DIRECTION_FAMILIES[(fixtureIndex * BRAND_NAMES.length + nameIndex) % DIRECTION_FAMILIES.length]
    const takes = composeBrandTakes({ brand, family, startSeed: 0, count: 10 })
    const covers = takes.map((take) => take.pages[0].genome.compositionId)
    const coverUnique = new Set(covers).size
    let groupMaxReuse = 0
    for (let i = 0; i < takes.length; i++) {
      const signature = structureSignature(takes[i].genome)
      signatures.set(signature, (signatures.get(signature) ?? 0) + 1)
      documents.push({
        fixture: fixture.id,
        name,
        take: i,
        family: family.id,
        signature,
        genome: takes[i].genome,
      })
      for (let j = i + 1; j < takes.length; j++) groupMaxReuse = Math.max(groupMaxReuse, samePositionStructureShare(takes[i].genome, takes[j].genome))
    }
    groupStats.push({ fixture: fixture.id, name, family: family.id, coverUnique, maxSamePositionReuse: +groupMaxReuse.toFixed(4) })
  }
}

let pairs = 0
let reuseTotal = 0
let reuseMax = 0
let distanceTotal = 0
let distanceMin = 1
for (let i = 0; i < documents.length; i++) {
  for (let j = i + 1; j < documents.length; j++) {
    const reuse = samePositionStructureShare(documents[i].genome, documents[j].genome)
    const distance = documentGenomeDistance(documents[i].genome, documents[j].genome)
    reuseTotal += reuse
    reuseMax = Math.max(reuseMax, reuse)
    distanceTotal += distance
    distanceMin = Math.min(distanceMin, distance)
    pairs++
  }
}

const mostCommon = Math.max(...signatures.values())
const summary = {
  generatedAt: new Date().toISOString(),
  corpus: {
    fixtures: BRAND_FIXTURE_CASES.length,
    namesPerFixture: BRAND_NAMES.length,
    takesPerBrand: 10,
    documents: documents.length,
  },
  phase0Comparison: {
    phase0UniqueStructureSignatures: 1,
    phase0MeanSamePositionReuse: 1,
    phase0MaxSamePositionReuse: 1,
    phase0MostCommonStructureShare: 1,
  },
  phase2Structural: {
    uniqueStructureSignatures: signatures.size,
    meanSamePositionReuse: +(reuseTotal / Math.max(1, pairs)).toFixed(4),
    maxSamePositionReuse: +reuseMax.toFixed(4),
    mostCommonStructureShare: +(mostCommon / documents.length).toFixed(4),
    meanDocumentGenomeDistance: +(distanceTotal / Math.max(1, pairs)).toFixed(4),
    minDocumentGenomeDistance: +distanceMin.toFixed(4),
    groupsWithEightUniqueCovers: groupStats.filter((g) => g.coverUnique >= 8).length,
    groups: groupStats.length,
  },
  acceptance: {
    targetMaxSamePositionReuse: 0.3,
    targetCoverNoRepeatWithinEight: true,
    maxSamePositionReusePass: reuseMax <= 0.3,
    coverNoRepeatWithinEightPass: groupStats.every((g) => g.coverUnique >= 8),
  },
}

fs.writeFileSync(path.join(outDir, 'phase2-structural-summary.json'), JSON.stringify(summary, null, 2))
fs.writeFileSync(path.join(outDir, 'phase2-structural-documents.json'), JSON.stringify(documents, null, 2))
console.log(JSON.stringify(summary, null, 2))

if (documents.length !== 1200) throw new Error(`Expected 1200 documents, got ${documents.length}`)
if (!summary.acceptance.coverNoRepeatWithinEightPass) throw new Error('Cover composition repeated inside the required eight-take window.')
