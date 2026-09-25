// Content for Learn and the Blog is plain TypeScript data: typed, searchable, rendered on the server,
// so the pages ship almost no JavaScript. Inline text supports a tiny markup:
//   **bold**   `code`   [label](/learn/slug or https://...)   {{Ctrl+K}} for a key
// Write in plain English. No em dashes.

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }                       // section heading (h2), gets an anchor and a place in "On this page"
  | { t: 'h3'; text: string }
  | { t: 'steps'; items: string[] }                // numbered, for things to do in order
  | { t: 'list'; items: string[] }
  | { t: 'tip'; text: string }
  | { t: 'note'; text: string }
  | { t: 'warn'; text: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'keys'; rows: [keys: string, what: string][] } // shortcut table; keys like "Ctrl+Shift+Z" or "V"
  | { t: 'quote'; text: string; by?: string }
  | { t: 'try'; label: string; href: string }      // a button into the product, e.g. { label: 'Open the Editor', href: '/editor' }

export type LearnCategory = 'start' | 'editor' | 'studio' | 'effects' | 'workflows' | 'craft' | 'reference' | 'help'
export type Level = 'Beginner' | 'Intermediate' | 'Advanced'

export interface Article {
  slug: string                 // kebab-case, unique across Learn
  title: string                // sentence case, says what you will be able to do
  summary: string              // one or two sentences, shown on cards and as the meta description
  category: LearnCategory
  level: Level
  updated: string              // ISO date, e.g. '2026-09-25'
  related?: string[]           // other slugs
  keywords?: string            // extra search terms, space separated
  body: Block[]
}

export interface Post {
  slug: string
  title: string
  summary: string
  date: string                 // ISO date the post goes live. Posts dated in the future stay hidden until then.
  author: string
  tags: string[]
  body: Block[]
}
