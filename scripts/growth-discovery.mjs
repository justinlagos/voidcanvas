#!/usr/bin/env node

/**
 * Convert the existing Learn SEO opportunity database into a compact runtime
 * artifact for Growth OS. This does not collect fresh search data and must not
 * invent search volume, CPC or keyword difficulty.
 *
 * Source of truth: research/learn-seo/opportunities.csv
 * Output: public/growth-discovery.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT = resolve(ROOT, 'research/learn-seo/opportunities.csv')
const OUTPUT = resolve(ROOT, 'public/growth-discovery.json')

const EXPECTED = [
  'query', 'cluster', 'intent', 'audience', 'problem', 'outcome', 'existing', 'gap',
  'title', 'primary', 'secondary', 'competition', 'opportunity', 'connection', 'type',
  'cta', 'links', 'priority', 'status',
]
const VALID_LEVEL = new Set(['L', 'M', 'H'])
const VALID_STATUS = new Set(['live', 'existing', 'planned'])

export function parseCsv(input) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; continue }
      if (ch === '"') { quoted = false; continue }
      field += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\n') {
      row.push(field.replace(/\r$/, '')); field = ''
      if (row.some(x => x.length)) rows.push(row)
      row = []
      continue
    }
    field += ch
  }
  if (quoted) throw new Error('Malformed CSV: unclosed quoted field')
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''))
    if (row.some(x => x.length)) rows.push(row)
  }
  return rows
}

function assertHeaders(headers) {
  if (headers.length !== EXPECTED.length || EXPECTED.some((x, i) => headers[i] !== x)) {
    throw new Error(`Unexpected opportunities.csv headers. Expected: ${EXPECTED.join(',')}`)
  }
}

export function normalise(rows) {
  if (!rows.length) throw new Error('Opportunity CSV is empty')
  const [headers, ...body] = rows
  assertHeaders(headers)

  const out = body.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Row ${index + 2}: expected ${headers.length} columns, got ${values.length}`)
    const record = Object.fromEntries(headers.map((h, i) => [h, values[i].trim()]))
    const priority = Number(record.priority)
    if (!record.query || !record.cluster || !record.title) throw new Error(`Row ${index + 2}: query, cluster and title are required`)
    if (!VALID_LEVEL.has(record.competition)) throw new Error(`Row ${index + 2}: invalid competition ${record.competition}`)
    if (!VALID_LEVEL.has(record.opportunity)) throw new Error(`Row ${index + 2}: invalid opportunity ${record.opportunity}`)
    if (!VALID_STATUS.has(record.status)) throw new Error(`Row ${index + 2}: invalid status ${record.status}`)
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) throw new Error(`Row ${index + 2}: priority must be 1-5`)
    return { ...record, priority }
  })

  const seen = new Set()
  for (const x of out) {
    const key = x.query.toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate query in opportunities.csv: ${x.query}`)
    seen.add(key)
  }
  return out
}

export function buildArtifact(records) {
  const clusters = Array.from(new Set(records.map(x => x.cluster))).sort()
  const statuses = records.reduce((acc, x) => { acc[x.status] = (acc[x.status] || 0) + 1; return acc }, {})
  return {
    schema: 1,
    source: 'research/learn-seo/opportunities.csv',
    evidence: 'Autocomplete presence plus hand-reviewed SERP notes. No search-volume, CPC or keyword-difficulty data is claimed.',
    total: records.length,
    clusters,
    statuses,
    opportunities: records,
  }
}

async function main() {
  const csv = await readFile(INPUT, 'utf8')
  const records = normalise(parseCsv(csv))
  const artifact = buildArtifact(records)
  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  console.log(`Growth discovery: ${artifact.total} opportunities across ${artifact.clusters.length} clusters -> ${OUTPUT}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1 })
}
