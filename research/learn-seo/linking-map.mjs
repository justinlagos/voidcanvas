// Generates linking-map.md from the live content graph: goals -> guides, cornerstones -> supporting pages,
// and the contextual before/next/also links. Run after any change to goals.ts, signposts.ts or problems.ts.
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

await build({ entryPoints: ['src/content/learn/index.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'research/learn-seo/.tmp/learn-bundle.mjs', logLevel: 'silent' })
const { ARTICLES, GOALS, getArticle, CATEGORIES } = await import(pathToFileURL('research/learn-seo/.tmp/learn-bundle.mjs').href + '?t=' + Date.now())

const textOf = b => b.t === 'steps' || b.t === 'list' || b.t === 'checklist' ? b.items.join(' ') : b.t === 'table' ? [...b.head, ...b.rows.flat()].join(' ') : b.t === 'keys' ? b.rows.flat().join(' ') : b.t === 'faq' ? b.items.map(i => i.q + ' ' + i.a).join(' ') : b.t === 'try' ? '' : (b.text ?? b.caption ?? '')
const inbound = new Map(ARTICLES.map(a => [a.slug, new Set()]))
const edge = (from, to, kind) => { if (inbound.has(to) && from !== to) inbound.get(to).add(`${from} (${kind})`) }
for (const a of ARTICLES) {
  const text = a.body.map(textOf).join(' ')
  for (const m of text.matchAll(/\]\(\/learn\/([a-z0-9-]+)/g)) edge(a.slug, m[1], 'body')
  for (const r of a.related ?? []) edge(a.slug, r, 'also useful')
  for (const r of a.guide?.before ?? []) edge(a.slug, r, 'before')
  for (const r of a.guide?.next ?? []) edge(a.slug, r, 'next')
  for (const r of a.guide?.also ?? []) edge(a.slug, r.slug, 'if')
}
for (const g of GOALS) for (const s of g.steps) edge(`route:${g.id}`, s.slug, 'route')

const L = ['# Internal linking map', '', `Generated from the content graph on ${new Date().toISOString().slice(0, 10)} by \`linking-map.mjs\`. Every guide is reachable from the hub (topic index), from at least one route where it belongs, and from the contextual links (before, next, if) on neighbouring guides. Orphans are listed at the end and should be zero.`, '']
L.push('## Routes (goal pages) and the guides they order', '')
for (const g of GOALS) { L.push(`### /learn/do/${g.id}: ${g.prompt}`, ''); g.steps.forEach((s, i) => L.push(`${i + 1}. [${getArticle(s.slug)?.title ?? s.slug}](/learn/${s.slug}) · ${s.why}`)); L.push('') }
L.push('## Clusters: cornerstone and the pages that support it', '', 'A cornerstone answers the head query and links down; supporting pages answer one question and link back up through "Before you start" or the route.', '')
for (const c of ARTICLES.filter(a => a.role === 'cornerstone')) {
  const down = new Set([...(c.guide?.next ?? []), ...(c.guide?.also ?? []).map(x => x.slug), ...(c.related ?? [])])
  const up = [...inbound.get(c.slug)].filter(x => !x.startsWith('route:'))
  L.push(`### ${c.title} (/learn/${c.slug})`, '', `Links down to: ${[...down].map(s => `[${s}](/learn/${s})`).join(', ') || 'none'}`, '', `Linked from: ${up.join(', ') || 'none'}`, '')
}
L.push('## Contextual links per guide', '', '| Guide | Before you start | Next | If… |', '|---|---|---|---|')
for (const a of ARTICLES) L.push(`| ${a.slug} | ${(a.guide?.before ?? []).join(', ')} | ${(a.guide?.next ?? []).join(', ')} | ${(a.guide?.also ?? []).map(x => `${x.when}: ${x.slug}`).join('; ')} |`)
L.push('', '## Inbound links per guide', '', '| Guide | Inbound | From |', '|---|---|---|')
for (const a of [...ARTICLES].sort((x, y) => inbound.get(x.slug).size - inbound.get(y.slug).size)) L.push(`| ${a.slug} | ${inbound.get(a.slug).size} | ${[...inbound.get(a.slug)].slice(0, 8).join(', ')}${inbound.get(a.slug).size > 8 ? ', …' : ''} |`)
const orphans = ARTICLES.filter(a => inbound.get(a.slug).size === 0).map(a => a.slug)
L.push('', `## Orphans: ${orphans.length ? orphans.join(', ') : 'none'}`, '')
L.push('## Topic pages', '', CATEGORIES.map(c => `- /learn/topic/${c.id}: ${c.name} (${ARTICLES.filter(a => a.category === c.id).length} guides)`).join('\n'), '')
writeFileSync('research/learn-seo/linking-map.md', L.join('\n'))
console.log('guides', ARTICLES.length, 'orphans', orphans.length, 'min inbound', Math.min(...ARTICLES.map(a => inbound.get(a.slug).size)))
