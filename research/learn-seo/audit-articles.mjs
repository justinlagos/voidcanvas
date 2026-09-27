// Audit of the existing Learn library. Bundles the content with esbuild and reports on links, related,
// keywords, headings, tries, duplicates, and title/meta lengths. Output: research/learn-seo/audit-data.json
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

await build({
  entryPoints: ['src/content/learn/index.ts'], bundle: true, platform: 'node', format: 'esm',
  outfile: 'research/learn-seo/.tmp/learn-bundle.mjs', logLevel: 'silent',
})
const m = await import(pathToFileURL('research/learn-seo/.tmp/learn-bundle.mjs').href)
const { ARTICLES, CATEGORIES, PATHS, plain, wordCount, minutes } = m
const slugs = new Set(ARTICLES.map(a => a.slug))
const textOf = b => b.t === 'steps' || b.t === 'list' ? b.items.join(' ') : b.t === 'table' ? [...b.head, ...b.rows.flat()].join(' ') : b.t === 'keys' ? b.rows.flat().join(' ') : b.t === 'try' ? '' : b.text
const inbound = new Map(ARTICLES.map(a => [a.slug, []]))
const rows = ARTICLES.map(a => {
  const text = a.body.map(textOf).join(' ')
  const links = [...text.matchAll(/\]\((\/learn\/([a-z0-9-]+))(#[^)]*)?\)/g)].map(x => x[2])
  const ext = [...text.matchAll(/\]\((https?:[^)]+)\)/g)].map(x => x[1])
  const product = [...text.matchAll(/\]\((\/(?:editor|studio|effects|tools)[^)]*)\)/g)].map(x => x[1])
  const broken = links.filter(l => !slugs.has(l))
  for (const l of links) if (inbound.has(l) && l !== a.slug) inbound.get(l).push(a.slug)
  for (const r of a.related ?? []) if (inbound.has(r) && r !== a.slug) inbound.get(r).push(a.slug + ' (related)')
  const tries = a.body.filter(b => b.t === 'try').map(b => b.href)
  const hs = a.body.filter(b => b.t === 'h').map(b => plain(b.text))
  const first = a.body[0]
  return {
    slug: a.slug, title: a.title, titleLen: a.title.length, metaTitleLen: (a.title + ' · Learn Voidcanvas').length, summary: a.summary, summaryLen: a.summary.length,
    category: a.category, level: a.level, updated: a.updated, words: wordCount(a.body), minutes: minutes(a.body),
    related: a.related ?? [], relatedBroken: (a.related ?? []).filter(r => !slugs.has(r)), keywords: a.keywords ?? '', hasKeywords: !!a.keywords,
    internalLinks: [...new Set(links)], brokenLinks: broken, externalLinks: ext, productLinks: [...new Set(product)], tries, headings: hs,
    firstBlockType: first?.t, firstBlockWords: first ? textOf(first).split(/\s+/).length : 0,
    blocks: a.body.length, blockTypes: Object.fromEntries(a.body.reduce((m, b) => m.set(b.t, (m.get(b.t) || 0) + 1), new Map())),
    hasProblems: hs.some(h => /problem|good to know|mistake|troubleshoot|watch/i.test(h)),
  }
})
for (const r of rows) r.inbound = [...new Set(inbound.get(r.slug))]
const orphans = rows.filter(r => r.inbound.length === 0).map(r => r.slug)
const inPaths = new Set(PATHS.flatMap(p => p.slugs))
const out = {
  count: rows.length, totalWords: rows.reduce((n, r) => n + r.words, 0), totalMinutes: rows.reduce((n, r) => n + r.minutes, 0),
  categories: CATEGORIES.map(c => ({ id: c.id, name: c.name, n: rows.filter(r => r.category === c.id).length })),
  paths: PATHS.map(p => ({ id: p.id, name: p.name, n: p.slugs.length, missing: p.slugs.filter(s => !slugs.has(s)) })),
  notInAnyPath: rows.filter(r => !inPaths.has(r.slug)).map(r => r.slug),
  orphans, noKeywords: rows.filter(r => !r.hasKeywords).map(r => r.slug), noTry: rows.filter(r => !r.tries.length).map(r => r.slug),
  noRelated: rows.filter(r => !r.related.length).map(r => r.slug), brokenLinks: rows.filter(r => r.brokenLinks.length).map(r => ({ slug: r.slug, broken: r.brokenLinks })),
  brokenRelated: rows.filter(r => r.relatedBroken.length).map(r => ({ slug: r.slug, broken: r.relatedBroken })),
  longMetaTitles: rows.filter(r => r.metaTitleLen > 60).map(r => ({ slug: r.slug, len: r.metaTitleLen })),
  summaryLens: { under70: rows.filter(r => r.summaryLen < 70).map(r => r.slug), over160: rows.filter(r => r.summaryLen > 160).map(r => r.slug) },
  noProblemsSection: rows.filter(r => !r.hasProblems).map(r => r.slug),
  fewInbound: rows.filter(r => r.inbound.length <= 1).map(r => ({ slug: r.slug, inbound: r.inbound })),
  levels: Object.fromEntries(rows.reduce((m, r) => m.set(r.level, (m.get(r.level) || 0) + 1), new Map())),
  articles: rows,
}
mkdirSync('research/learn-seo', { recursive: true })
writeFileSync('research/learn-seo/audit-data.json', JSON.stringify(out, null, 1))
const { articles, ...summary } = out
console.log(JSON.stringify(summary, null, 1))
