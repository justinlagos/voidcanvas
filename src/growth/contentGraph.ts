import type { Article } from '@/content/types'
import { ARTICLES } from '@/content/learn/index'
import { TOOLS } from '@/tools/defs'

export interface ToolLearnLink {
  tool: string
  article: string
  title: string
  direct: boolean
}

const toolHref = (slug: string) => `/tools/${slug}`

/**
 * Build links from content that already exists. This deliberately does not infer
 * a relationship just because two pages share a word. A Learn guide joins a
 * tool cluster only when its structured body links to that tool.
 */
export function toolsMentionedByArticle(article: Article): string[] {
  const body = JSON.stringify(article.body)
  return Object.keys(TOOLS).filter(slug => body.includes(toolHref(slug)))
}

export function learnForTool(slug: string): ToolLearnLink[] {
  if (!TOOLS[slug]) return []
  return ARTICLES
    .filter(article => toolsMentionedByArticle(article).includes(slug))
    .map(article => ({
      tool: slug,
      article: article.slug,
      title: article.title,
      direct: article.body.some(block => (block.t === 'try' || block.t === 'product') && block.href.startsWith(toolHref(slug))),
    }))
    .sort((a, b) => Number(b.direct) - Number(a.direct) || a.title.localeCompare(b.title))
}

/**
 * Only an explicit structured try/product block may replace the generic Editor,
 * Effects or Studio CTA. A casual mention in prose/table is not enough.
 */
export function toolForArticle(article: Article): { slug: string; label: string; href: string } | null {
  const direct = article.body.find(block => (block.t === 'try' || block.t === 'product') && Object.keys(TOOLS).some(slug => block.href.startsWith(toolHref(slug))))
  if (!direct || !('href' in direct)) return null
  const slug = Object.keys(TOOLS).find(id => direct.href.startsWith(toolHref(id)))
  if (!slug) return null
  const def = TOOLS[slug]
  const short = def.name.replace(/\s+(Image\s+)?Generator$/i, '')
  return { slug, label: `Open the ${short} tool`, href: toolHref(slug) }
}

export function buildToolLearnGraph(): ToolLearnLink[] {
  return Object.keys(TOOLS).flatMap(learnForTool)
}

/** Catch stale Learn links before deploy. */
export function invalidToolLinks(): string[] {
  const out: string[] = []
  const known = new Set(Object.keys(TOOLS))
  const re = /\/tools\/([a-z0-9-]+)/g
  for (const article of ARTICLES) {
    const body = JSON.stringify(article.body)
    for (const match of body.matchAll(re)) if (!known.has(match[1])) out.push(`${article.slug} -> /tools/${match[1]}`)
  }
  return Array.from(new Set(out)).sort()
}
