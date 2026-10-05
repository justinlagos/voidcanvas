import type { GrowthRisk } from './knowledge'

export type GrowthSurface = 'tool' | 'learn' | 'template' | 'social' | 'comparison' | 'creator' | 'agency' | 'education' | 'product-loop'
export type Autonomy = 'A0' | 'A1' | 'A2' | 'A3'

export interface OpportunityInput {
  id: string
  title: string
  intent: string
  audience: string
  problem: string
  capability: string
  surface: GrowthSurface
  demand: number
  relevance: number
  advantage: number
  conversion: number
  shareability: number
  confidence: number
  competition: number
  risk: GrowthRisk
  autonomy: Autonomy
  notes?: string
}

export interface Opportunity extends OpportunityInput {
  score: number
  status: 'seed' | 'validate' | 'build' | 'live' | 'hold'
}

const clamp10 = (n: number) => Math.max(0, Math.min(10, Number.isFinite(n) ? n : 0))
const riskPenalty: Record<GrowthRisk, number> = { low: 0, medium: 8, high: 20 }

/**
 * 0-100 opportunity score.
 * Positive factors intentionally outweigh raw demand so niche, highly-native
 * VoidCanvas workflows can beat broad, expensive generic keywords.
 */
export function scoreOpportunity(o: OpportunityInput): number {
  const demand = clamp10(o.demand)
  const relevance = clamp10(o.relevance)
  const advantage = clamp10(o.advantage)
  const conversion = clamp10(o.conversion)
  const shareability = clamp10(o.shareability)
  const confidence = clamp10(o.confidence)
  const competition = clamp10(o.competition)

  const positive =
    demand * 1.4 +
    relevance * 2.0 +
    advantage * 2.2 +
    conversion * 2.0 +
    shareability * 1.1 +
    confidence * 1.3

  const negative = competition * 1.2 + riskPenalty[o.risk]
  return Math.max(0, Math.min(100, Math.round((positive - negative) / 0.88)))
}

const seeds: OpportunityInput[] = [
  {
    id: 'cascade-social-sizes',
    title: 'One design to every social size',
    intent: 'resize one design for every social media platform',
    audience: 'working designers, agencies and social teams',
    problem: 'A finished master design still has to be rebuilt or manually adjusted across many delivery sizes.',
    capability: 'cascade', surface: 'learn',
    demand: 8, relevance: 10, advantage: 10, conversion: 10, shareability: 9, confidence: 9, competition: 6,
    risk: 'low', autonomy: 'A2', notes: 'Build a task-led landing/tutorial around a real multi-format job and hand directly into Cascade.',
  },
  {
    id: 'tool-halftone',
    title: 'Halftone image generator',
    intent: 'halftone image generator online',
    audience: 'poster, print and editorial designers',
    problem: 'Apply and control a halftone treatment quickly without installing software.',
    capability: 'quick-tools', surface: 'tool',
    demand: 7, relevance: 10, advantage: 8, conversion: 9, shareability: 9, confidence: 10, competition: 6,
    risk: 'low', autonomy: 'A3', notes: 'Already live. Optimise the acquisition-to-editor handoff and supporting visual-intent content.',
  },
  {
    id: 'tool-dither',
    title: 'Dither image tool',
    intent: 'dither image online',
    audience: 'digital, retro and experimental designers',
    problem: 'Create a controllable dither treatment quickly in-browser.',
    capability: 'quick-tools', surface: 'tool',
    demand: 6, relevance: 10, advantage: 8, conversion: 8, shareability: 9, confidence: 9, competition: 5,
    risk: 'low', autonomy: 'A3', notes: 'Already live. Expand examples, related intents and editor continuation.',
  },
  {
    id: 'tool-glitch',
    title: 'Glitch effect generator',
    intent: 'glitch effect generator online',
    audience: 'social, music and experimental designers',
    problem: 'Make a controllable glitch treatment without destructive desktop setup.',
    capability: 'quick-tools', surface: 'tool',
    demand: 7, relevance: 9, advantage: 7, conversion: 8, shareability: 10, confidence: 9, competition: 7,
    risk: 'low', autonomy: 'A3', notes: 'Already live. Prioritise visual search and short-form demonstrations.',
  },
  {
    id: 'psd-without-photoshop',
    title: 'Edit a PSD without Photoshop',
    intent: 'edit psd without photoshop',
    audience: 'designers receiving PSD files without access to Photoshop',
    problem: 'Open and continue useful layered work in a PSD without installing Photoshop.',
    capability: 'psd-import', surface: 'learn',
    demand: 9, relevance: 10, advantage: 8, conversion: 10, shareability: 6, confidence: 9, competition: 9,
    risk: 'medium', autonomy: 'A2', notes: 'Must state supported fidelity precisely. Pair with real import report screenshots and test files.',
  },
  {
    id: 'editable-png',
    title: 'Editable PNG as a shareable design object',
    intent: 'editable png design file',
    audience: 'designers sharing templates, exercises and editable resources',
    problem: 'Share something that previews like an image while retaining an editable project.',
    capability: 'void-png', surface: 'product-loop',
    demand: 4, relevance: 9, advantage: 10, conversion: 9, shareability: 10, confidence: 8, competition: 2,
    risk: 'low', autonomy: 'A2', notes: 'Product-led distribution opportunity. Teach the limitation that external editors may strip embedded project data.',
  },
  {
    id: 'open-in-voidcanvas',
    title: 'Open in VoidCanvas integration contract',
    intent: 'edit downloadable design resource online',
    audience: 'resource sites and independent template creators',
    problem: 'Resource visitors must download a file, find software and manually reopen it before they can edit.',
    capability: 'void-format', surface: 'product-loop',
    demand: 5, relevance: 9, advantage: 10, conversion: 10, shareability: 10, confidence: 7, competition: 3,
    risk: 'medium', autonomy: 'A1', notes: 'Define a deep-link/import contract first; partnerships remain approval-gated.',
  },
  {
    id: 'agency-cascade-proof',
    title: 'Agency campaign production proof',
    intent: 'resize campaign artwork efficiently',
    audience: 'agency design and production teams',
    problem: 'High-volume adaptation work consumes senior and production design time after the creative route is approved.',
    capability: 'cascade', surface: 'agency',
    demand: 8, relevance: 10, advantage: 10, conversion: 10, shareability: 5, confidence: 8, competition: 5,
    risk: 'medium', autonomy: 'A1', notes: 'Use one real campaign and compare production time. Outreach stays human-approved.',
  },
  {
    id: 'brand-share-page',
    title: 'Shareable brand guideline page',
    intent: 'share brand guidelines online',
    audience: 'brand designers, studios and client teams',
    problem: 'Brand guidelines are often static PDFs that make copying assets, colours and guidance cumbersome.',
    capability: 'brand-system', surface: 'product-loop',
    demand: 7, relevance: 10, advantage: 9, conversion: 9, shareability: 10, confidence: 8, competition: 6,
    risk: 'low', autonomy: 'A2', notes: 'Make each published guideline a useful client surface and a quiet acquisition surface.',
  },
  {
    id: 'designer-classroom',
    title: 'Browser design classroom packs',
    intent: 'graphic design exercises for students',
    audience: 'design lecturers, bootcamps and tutorial creators',
    problem: 'Teaching practical design workflows is slowed by installs, licences and inconsistent lab setups.',
    capability: 'professional-editor', surface: 'education',
    demand: 6, relevance: 9, advantage: 8, conversion: 7, shareability: 8, confidence: 7, competition: 6,
    risk: 'medium', autonomy: 'A1', notes: 'Start with downloadable lesson packs and editable .void exercises; educator outreach remains approval-gated.',
  },
]

export const OPPORTUNITIES: Opportunity[] = seeds
  .map(o => ({ ...o, score: scoreOpportunity(o), status: 'seed' as const }))
  .sort((a, b) => b.score - a.score)

export const opportunityById = (id: string) => OPPORTUNITIES.find(o => o.id === id)
