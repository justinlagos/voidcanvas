// Tiny text helpers shared by Learn, the Blog and their renderer.
export const plain = (s: string) => s.replace(/\*\*|`|\{\{|\}\}/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
export const slugify = (s: string) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

import type { Block } from './types'
const textOf = (b: Block): string => {
  switch (b.t) {
    case 'steps': case 'list': return b.items.join(' ')
    case 'table': return [...b.head, ...b.rows.flat()].join(' ')
    case 'keys': return b.rows.flat().join(' ')
    case 'try': return ''
    default: return b.text
  }
}
export const wordCount = (body: Block[]) => body.reduce((n, b) => n + textOf(b).split(/\s+/).filter(Boolean).length, 0)
export const minutes = (body: Block[]) => Math.max(1, Math.round(wordCount(body) / 220))
