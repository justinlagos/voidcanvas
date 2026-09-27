// Content for Learn and the Blog is plain TypeScript data: typed, searchable, rendered on the server,
// so the pages ship almost no JavaScript. Inline text supports a tiny markup:
//   **bold**   `code`   [label](/learn/slug or https://...)   {{Ctrl+K}} for a key
// Write in plain English. No em dashes.

export type DemoKind =
  | 'effect'        // a live effect on a sample image with its sliders (props: effect, and optional labels)
  | 'print-setup'   // dpi, bleed and RGB/CMYK toggles on a small poster
  | 'size-calculator' // mm or inches to pixels at a chosen dpi, with the presets
  | 'type-scale'    // a type scale with its ratio, base size and the resulting steps
  | 'before-after'  // a slider between two images

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
  // Added for the problem-first Learn (September 2026):
  | { t: 'answer'; text: string }                  // the quick answer, one short paragraph at the top; also used as the search result line
  | { t: 'checklist'; items: string[] }            // a short list to tick through before you export or send
  | { t: 'faq'; items: { q: string; a: string }[] } // real questions people search for; emits FAQPage schema
  | { t: 'product'; text: string; label: string; href: string } // "How Voidcanvas handles this": the honest product paragraph and one button
  | { t: 'figure'; src: string; alt: string; caption?: string; width: number; height: number } // an image from /public with its size
  | { t: 'demo'; kind: DemoKind; effect?: string; caption?: string; before?: string; after?: string; alt?: string } // an interactive example, loaded only on pages that use it

export type LearnCategory = 'start' | 'editor' | 'studio' | 'effects' | 'workflows' | 'craft' | 'reference' | 'help'
export type Level = 'Beginner' | 'Intermediate' | 'Advanced'
export type ArticleRole = 'cornerstone' | 'supporting' | 'reference'

/** Contextual links shown at the end of an article, in the voice of an editor rather than a "related" dump. */
export interface Guide {
  before?: string[]                       // read first if you are missing the basics
  next?: string[]                         // the natural next step
  also?: { when: string; slug: string }[] // "If you are designing a poster" style branches
}

export interface Article {
  slug: string                 // kebab-case, unique across Learn
  title: string                // sentence case, says what you will be able to do
  summary: string              // one or two sentences, shown on cards and as the meta description
  category: LearnCategory
  level: Level
  updated: string              // ISO date, e.g. '2026-09-25'
  published?: string           // ISO date first published; defaults to updated
  related?: string[]           // other slugs
  keywords?: string            // extra search terms, space separated
  seoTitle?: string            // shorter or query-shaped title for the <title> tag, when the display title is long
  description?: string         // meta description when the summary is too long for one
  answers?: string[]           // the exact questions and searches this article answers, in plain words
  goals?: string[]             // goal ids from goals.ts ("make-a-poster", "prepare-for-print", ...)
  feature?: string             // the Voidcanvas feature it leans on, shown on result cards, e.g. "Editor · Masks"
  role?: ArticleRole           // cornerstone pages get more weight in search and the sitemap
  guide?: Guide
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
