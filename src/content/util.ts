// Tiny text helpers shared by Learn, the Blog and their renderer.
export const plain = (s: string) => s.replace(/\*\*|`|\{\{|\}\}/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
export const slugify = (s: string) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

import type { Block } from './types'
export const textOf = (b: Block): string => {
  switch (b.t) {
    case 'steps': case 'list': case 'checklist': return b.items.join(' ')
    case 'table': return [...b.head, ...b.rows.flat()].join(' ')
    case 'keys': return b.rows.flat().join(' ')
    case 'faq': return b.items.map(i => `${i.q} ${i.a}`).join(' ')
    case 'try': return ''
    case 'figure': return b.caption ?? ''
    case 'demo': return b.caption ?? ''
    default: return b.text
  }
}
export const wordCount = (body: Block[]) => body.reduce((n, b) => n + textOf(b).split(/\s+/).filter(Boolean).length, 0)
export const minutes = (body: Block[]) => Math.max(1, Math.round(wordCount(body) / 220))

/** The quick answer of an article, if it has one. */
export const answerOf = (body: Block[]) => { const b = body.find(x => x.t === 'answer'); return b && b.t === 'answer' ? plain(b.text) : undefined }

/** Cuts a sentence-shaped meta description at a sentence end under `max` characters, or at a word if none fits. */
export function metaDescription(s: string, max = 158) {
  const t = plain(s).trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  if (end > 60) return cut.slice(0, end + 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,:;]$/, '') + '.'
}
