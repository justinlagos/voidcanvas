import type { Article, LearnCategory } from '../types'
import { plain, slugify, minutes, wordCount } from '../util'
import { articles as start } from './start'
import { articles as editorCore } from './editor-core'
import { articles as editorImage } from './editor-image'
import { articles as editorOutput } from './editor-output'
import { articles as studio } from './studio'
import { articles as effects } from './effects'
import { articles as workflows } from './workflows'
import { articles as craft } from './craft'
import { articles as reference } from './reference'

// Server-only: this pulls in every article body. Client components get the light index from learnIndex().

export const CATEGORIES: { id: LearnCategory; name: string; blurb: string }[] = [
  { id: 'start', name: 'Start here', blurb: 'What Voidcanvas is, a first design in five minutes, and where your work lives.' },
  { id: 'editor', name: 'Editor', blurb: 'Layers, masks, type, selections, retouching, filters, boards and export.' },
  { id: 'studio', name: 'Studio', blurb: 'Client jobs from the brief to delivery, and brand guidelines.' },
  { id: 'effects', name: 'Effects', blurb: 'Every effect and every setting, and the quick tools.' },
  { id: 'workflows', name: 'Workflows', blurb: 'Complete projects, step by step, from a blank page to the finished file.' },
  { id: 'craft', name: 'Design craft', blurb: 'Type, colour, layout, resolution, print and social, taught properly.' },
  { id: 'reference', name: 'Reference', blurb: 'Every shortcut, size preset and file format, and a glossary.' },
  { id: 'help', name: 'Help and privacy', blurb: 'What is sent and what is not, troubleshooting, and reporting a bug.' },
]

export const PATHS: { id: string; name: string; blurb: string; slugs: string[] }[] = [
  { id: 'new', name: 'New to Voidcanvas', blurb: 'From opening the app to your first exported design.', slugs: ['what-is-voidcanvas', 'your-first-design', 'editor-tour', 'layers', 'type', 'export-for-screen', 'saving-and-your-files'] },
  { id: 'photoshop', name: 'Coming from Photoshop', blurb: 'What carries over, what is different, and where everything lives.', slugs: ['editor-tour', 'keyboard-shortcuts', 'import-psd-and-pdf', 'masks', 'adjustment-layers', 'command-palette-and-menus'] },
  { id: 'client', name: 'Client work with Studio', blurb: 'Run a job from the brief to signed-off, named files.', slugs: ['studio-overview', 'start-a-job-from-a-brief', 'references-and-palettes', 'directions-and-review', 'delivering-files', 'brand-guidelines'] },
  { id: 'print', name: 'Designing for print', blurb: 'Resolution, bleed and PDFs a printer will accept.', slugs: ['image-resolution-explained', 'designing-for-print', 'export-for-print', 'workflow-print-flyer', 'delivering-files'] },
]

const ORDER = CATEGORIES.map(c => c.id)
export const ARTICLES: Article[] = [...start, ...editorCore, ...editorImage, ...editorOutput, ...studio, ...effects, ...workflows, ...craft, ...reference]
  .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category))

const BY_SLUG = new Map(ARTICLES.map(a => [a.slug, a]))
export const getArticle = (slug: string) => BY_SLUG.get(slug)
export const categoryOf = (id: LearnCategory) => CATEGORIES.find(c => c.id === id)!
export const inCategory = (id: LearnCategory) => ARTICLES.filter(a => a.category === id)

export { plain, slugify, minutes, wordCount }

export interface LearnEntry { slug: string; title: string; summary: string; category: LearnCategory; level: Article['level']; minutes: number; terms: string }

/** The light index used by the hub search and the landing page. Headings go into the search terms. */
export function learnIndex(): LearnEntry[] {
  return ARTICLES.map(a => ({
    slug: a.slug, title: a.title, summary: a.summary, category: a.category, level: a.level, minutes: minutes(a.body),
    terms: [a.keywords ?? '', ...a.body.filter(b => b.t === 'h' || b.t === 'h3').map(b => plain((b as { text: string }).text))].join(' ').toLowerCase(),
  }))
}
