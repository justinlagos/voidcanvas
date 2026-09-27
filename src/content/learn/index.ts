import type { Article, LearnCategory } from '../types'
import { answerOf, minutes, plain, slugify, wordCount } from '../util'
import { articles as start } from './start'
import { articles as editorCore } from './editor-core'
import { articles as editorImage } from './editor-image'
import { articles as editorOutput } from './editor-output'
import { articles as studio } from './studio'
import { articles as effects } from './effects'
import { articles as workflows } from './workflows'
import { articles as craft } from './craft'
import { articles as reference } from './reference'
import { articles as problems } from './problems'
import { articles as supporting } from './supporting'
import { articles as longtail } from './longtail'
import { SIGNPOSTS } from './signposts'
import { GOALS, type Goal } from './goals'

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

/** Short courses in order. Kept for the landing page and the ?path= reading mode; the hub itself now routes by goal. */
export const PATHS: { id: string; name: string; blurb: string; slugs: string[] }[] = [
  { id: 'new', name: 'New to Voidcanvas', blurb: 'From opening the app to your first exported design.', slugs: ['what-is-voidcanvas', 'your-first-design', 'editor-tour', 'layers', 'type', 'export-for-screen', 'saving-and-your-files', 'desktop-app', 'account-and-sync', 'teams'] },
  { id: 'photoshop', name: 'Coming from Photoshop', blurb: 'What carries over, what is different, and where everything lives.', slugs: ['edit-a-psd-without-photoshop', 'editor-tour', 'keyboard-shortcuts', 'import-psd-and-pdf', 'masks', 'adjustment-layers', 'command-palette-and-menus'] },
  { id: 'client', name: 'Client work with Studio', blurb: 'Run a job from the brief to signed-off, named files.', slugs: ['studio-overview', 'start-a-job-from-a-brief', 'references-and-palettes', 'directions-and-review', 'delivering-files', 'brand-guidelines'] },
  { id: 'print', name: 'Designing for print', blurb: 'Resolution, bleed and PDFs a printer will accept.', slugs: ['prepare-a-poster-for-print', 'image-resolution-explained', 'designing-for-print', 'export-for-print', 'workflow-print-flyer', 'delivering-files'] },
]

const ORDER = CATEGORIES.map(c => c.id)
const RAW: Article[] = [...start, ...editorCore, ...editorImage, ...editorOutput, ...studio, ...effects, ...workflows, ...craft, ...reference, ...problems, ...supporting, ...longtail]
/** Every article, with its signposts merged in. Fields set on the article itself win. */
export const ARTICLES: Article[] = RAW.map(a => ({ ...(SIGNPOSTS[a.slug] ?? {}), ...a }))
  .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category))

const BY_SLUG = new Map(ARTICLES.map(a => [a.slug, a]))
export const getArticle = (slug: string) => BY_SLUG.get(slug)
export const categoryOf = (id: LearnCategory) => CATEGORIES.find(c => c.id === id)!
export const inCategory = (id: LearnCategory) => ARTICLES.filter(a => a.category === id)
export const inGoal = (g: Goal) => g.steps.map(s => getArticle(s.slug)).filter((a): a is Article => !!a)
export const cornerstones = () => ARTICLES.filter(a => a.role === 'cornerstone')
export { GOALS, getGoal, PRIMARY_GOALS } from './goals'
export type { Goal, GoalStep } from './goals'

export { plain, slugify, minutes, wordCount, answerOf }

export interface LearnEntry {
  slug: string; title: string; summary: string; category: LearnCategory; level: Article['level']; minutes: number
  terms: string      // headings and keywords, lower case, for the weakest match
  answers: string    // the questions it answers, lower case, pipe separated: strong match
  answer?: string    // the quick answer, for the result card
  feature?: string
  goals: string[]
  role?: Article['role']
}

/** The light index used by the hub search and the goal picker. No bodies. */
export function learnIndex(): LearnEntry[] {
  return ARTICLES.map(a => ({
    slug: a.slug, title: a.title, summary: a.summary, category: a.category, level: a.level, minutes: minutes(a.body),
    terms: [a.keywords ?? '', ...a.body.filter(b => b.t === 'h' || b.t === 'h3').map(b => plain((b as { text: string }).text))].join(' ').toLowerCase(),
    answers: (a.answers ?? []).join(' | ').toLowerCase(),
    answer: answerOf(a.body),
    feature: a.feature, goals: a.goals ?? [], role: a.role,
  }))
}

/** Goals in the light form the client needs: names, prompts, queries and the ordered slugs. */
export interface GoalLite { id: string; name: string; prompt: string; blurb: string; answer: string; queries: string; steps: { slug: string; why: string }[]; primary: boolean; product: { label: string; href: string } }
export const goalIndex = (): GoalLite[] => GOALS.map(g => ({ id: g.id, name: g.name, prompt: g.prompt, blurb: g.blurb, answer: g.answer, queries: g.queries.join(' | ').toLowerCase(), steps: g.steps.map(s => ({ slug: s.slug, why: s.why })), primary: !!g.primary, product: { label: g.product.label, href: g.product.href } }))

/** Sanity checks used by the unit tests: every referenced slug exists. */
export function danglingSlugs(): string[] {
  const out: string[] = []
  const has = (s: string) => BY_SLUG.has(s)
  for (const a of ARTICLES) {
    for (const r of a.related ?? []) if (!has(r)) out.push(`${a.slug} related -> ${r}`)
    for (const r of [...(a.guide?.before ?? []), ...(a.guide?.next ?? []), ...(a.guide?.also ?? []).map(x => x.slug)]) if (!has(r)) out.push(`${a.slug} guide -> ${r}`)
    for (const g of a.goals ?? []) if (!GOALS.some(x => x.id === g)) out.push(`${a.slug} goal -> ${g}`)
  }
  for (const g of GOALS) for (const s of g.steps) if (!has(s.slug)) out.push(`goal ${g.id} -> ${s.slug}`)
  for (const p of PATHS) for (const s of p.slugs) if (!has(s)) out.push(`path ${p.id} -> ${s}`)
  for (const s of Object.keys(SIGNPOSTS)) if (!has(s)) out.push(`signpost for missing ${s}`)
  return out
}
