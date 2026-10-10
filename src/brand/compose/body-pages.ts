// Brand Guidelines V2: content pages composed around the page's real content.
//
// The guideline's content pages (logo on backgrounds, clear space, colour, contrast, type scale and so
// on) carry content a template cannot invent: the logo tested on every surface, refused versions, the
// eight misuse examples, every contrast pair with its ratio. That content is drawn by one block
// renderer per page kind (drawPageBody in studio/brand-pages), the same code the fixed layouts use, so
// it can never drift from them. What V2 composes is everything around it: where the title and intro go,
// the page's colour blocking, its furniture, margins and type scale, all taken from the direction
// family and the seed. Each kind has six structures; one that would shrink the content below 85% of its
// natural size is rejected by lint and never shown.

import type { Brand } from '@/studio/brand/tokens'
import type { DirectionFamily } from './families'
import type { Node, Page, PageGenome, Paint, Rect, TextRole } from './types'

/** The smallest box each kind's content lays out in without crowding. Mirrors BODY_MIN in studio/brand-pages. */
export const BODY_KIND_MIN = {
  principles: { w: 1000, h: 380 },
  logo: { w: 1100, h: 560 },
  clearspace: { w: 1100, h: 560 },
  minsize: { w: 1100, h: 520 },
  misuse: { w: 1000, h: 520 },
  photo: { w: 1000, h: 560 },
  colour: { w: 1100, h: 640 },
  ramps: { w: 1000, h: 700 },
  access: { w: 1000, h: 560 },
  type: { w: 1000, h: 560 },
  scale: { w: 900, h: 480 },
  mockups: { w: 1000, h: 520 },
  tokens: { w: 700, h: 420 },
  voice: { w: 1000, h: 470 },
} as const
export type BodyPageKind = keyof typeof BODY_KIND_MIN
export const BODY_PAGE_KINDS = Object.keys(BODY_KIND_MIN) as BodyPageKind[]
export const isBodyPageKind = (kind: string): kind is BodyPageKind => kind in BODY_KIND_MIN

/** Below this the content would be drawn too small to read comfortably; lint rejects the composition. */
export const MIN_BODY_SCALE = 0.85

export type BodyStructure = 'header-band' | 'side-title' | 'rail-index' | 'brand-band' | 'centred' | 'split-lead'
export const BODY_STRUCTURES: readonly BodyStructure[] = ['header-band', 'side-title', 'rail-index', 'brand-band', 'centred', 'split-lead']

export interface BodyPageContext {
  kind: BodyPageKind
  brand: Brand
  family: DirectionFamily
  seed: number
  pageNo?: number
  pageCount?: number
}

const W = 1600, H = 900
const ink: Paint = { role: 'ink' }
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function seeded(seed: number, salt: number) {
  let x = Math.imul(seed + 101, 0x9e3779b1) ^ Math.imul(salt + 59, 0x85ebca6b)
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  return (x >>> 0) / 4294967295
}
const lerp = (range: readonly [number, number], t: number) => range[0] + (range[1] - range[0]) * t

const TITLES: Record<BodyPageKind, string> = {
  principles: 'Principles',
  logo: 'Logo on backgrounds',
  clearspace: 'Clear space',
  minsize: 'Minimum size',
  misuse: 'Do not',
  photo: 'On photography',
  colour: 'Colour',
  ramps: 'Tints and shades',
  access: 'Accessible pairings',
  type: 'Typography',
  scale: 'Type scale',
  mockups: 'In use',
  tokens: 'Tokens for developers',
  voice: 'Voice',
}

const count = (n: number) => ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][n] ?? String(n)

function fraction(cs: number) {
  return cs === 0.25 ? 'a quarter of' : cs === 0.5 ? 'half' : cs === 1 ? 'the full' : `${cs} ×`
}

/** One factual line per page, from this brand's values. Never marketing copy. */
export function bodyIntro(kind: BodyPageKind, b: Brand): string {
  switch (kind) {
    case 'principles': return `${count(b.principles.length)} rules that every piece of ${b.name} work follows.`
    case 'logo': return `Which version of the mark to use on each colour in the ${b.name} palette, and how well it reads there.`
    case 'clearspace': return `Keep ${fraction(b.logo.clearSpace)} the height of the mark clear on every side.`
    case 'minsize': return `Never narrower than ${b.logo.minWidth} px on screen or ${b.logo.minPrint} mm in print.`
    case 'misuse': return 'Eight ways the mark gets damaged, each made from the real artwork.'
    case 'photo': return 'Where the mark sits on photos of the brand in use, and where it should not.'
    case 'colour': return `${b.roles.map((r) => r.name).join(', ')}, with the values for screen and print and how much of each to use.`
    case 'ramps': return 'Ten steps for each colour. Equal steps look equally different, whatever the hue.'
    case 'access': return 'Text and background pairs from this palette, tested against WCAG 2.2.'
    case 'type': return `${b.fonts.heading.family} for headings, ${b.fonts.body.family} for reading, ${b.fonts.mono.family} for data and code.`
    case 'scale': return 'Every size in the system, with its line height, tracking and weight.'
    case 'mockups': return 'The system applied to a poster, a card and an interface.'
    case 'tokens': return 'Every value here ships as CSS variables, a Tailwind theme, design tokens JSON and Adobe swatches.'
    case 'voice': return `How ${b.name} sounds in writing, with what to do and what to avoid.`
  }
}

function text(id: string, box: Rect, value: string, style: TextRole, color: Paint = ink, align: 'left' | 'center' | 'right' = 'left'): Node {
  return { t: 'text', id, rect: box, style, text: value, align, color, fit: 'shrink', source: 'suggested' }
}

/** The family's look: margins, title size, rules, furniture. Continuous, seeded, inside the family's ranges. */
function look(ctx: BodyPageContext, structure: BodyStructure) {
  const f = ctx.family, salt = structure.length * 13 + ctx.kind.length * 7
  const margin = clamp(Math.round(W * lerp(f.margin, seeded(ctx.seed, salt))), 64, 120)
  const top = clamp(Math.round(margin * 0.8), 56, 92)
  const display = lerp(f.displayScale, seeded(ctx.seed, salt + 1))
  const title = clamp(Math.round(42 * display), 44, 92)
  const rules = lerp(f.ruleUse, seeded(ctx.seed, salt + 2)) >= 0.45
  const monoFurniture = ['swiss-grid', 'spec-sheet', 'raw', 'archive'].includes(f.id)
  return { margin, top, title, rules, monoFurniture }
}

/** The page number, as the kicker, rail and folio all show it. */
const pageNumber = (ctx: BodyPageContext) => String(Math.max(1, ctx.pageNo ?? 2)).padStart(2, '0')

function furniture(ctx: BodyPageContext, L: ReturnType<typeof look>, opts: { kickerBox?: Rect; kickerColor?: Paint; folioColor?: Paint; align?: 'left' | 'center'; left?: number } = {}): Node[] {
  const no = pageNumber(ctx)
  const kickerStyle: TextRole = L.monoFurniture ? { family: 'mono', size: 15, weight: 500, lineHeight: 1.2, tracking: 0.04 } : { family: 'body', size: 15, weight: 700, lineHeight: 1.2, tracking: 0.08 }
  const folioStyle: TextRole = { family: L.monoFurniture ? 'mono' : 'body', size: 14, weight: 500, lineHeight: 1.2 }
  const folioColor = opts.folioColor ?? { role: 'ink', alpha: 0.62 }
  const nodes: Node[] = []
  if (opts.kickerBox) nodes.push({ ...text('kicker', opts.kickerBox, `${no}  ${TITLES[ctx.kind].toUpperCase()}`, kickerStyle, opts.kickerColor ?? { role: 'ink', alpha: 0.62 }, opts.align ?? 'left'), case: 'as-is' } as Node)
  nodes.push(text('folio-brand', rect(opts.left ?? L.margin, H - 44, 600, 22), `${ctx.brand.name} · Brand guidelines`, folioStyle, folioColor))
  if (ctx.pageNo && ctx.pageCount) nodes.push(text('folio-page', rect(W - L.margin - 200, H - 44, 200, 22), `${String(ctx.pageNo).padStart(2, '0')} / ${String(ctx.pageCount).padStart(2, '0')}`, folioStyle, folioColor, 'right'))
  return nodes
}

function bodyNode(ctx: BodyPageContext, box: Rect): Node {
  const min = BODY_KIND_MIN[ctx.kind]
  return { t: 'device', id: `${ctx.kind}-body`, rect: box, kind: 'page-body', params: { kind: ctx.kind, minW: min.w, minH: min.h } }
}

/** How far a structure's box would shrink this kind's content. */
export function bodyFit(kind: BodyPageKind, box: { w: number; h: number }) {
  const min = BODY_KIND_MIN[kind]
  return Math.min(1, box.w / min.w, box.h / min.h)
}

function genome(ctx: BodyPageContext, structure: BodyStructure, L: ReturnType<typeof look>, g: { axis: PageGenome['axis']; colourBlocking: string; density: number; devices?: string[] }): PageGenome {
  const grid = ctx.family.grids[Math.floor(seeded(ctx.seed, structure.length + 3) * ctx.family.grids.length)] ?? 'column'
  return {
    compositionId: `${ctx.kind}-${structure}`,
    grid,
    axis: g.axis,
    marginRatio: L.margin / W,
    typeTreatment: structure,
    colourBlocking: g.colourBlocking,
    devices: g.devices ?? [],
    density: g.density,
    parameters: { family: ctx.family.id, seed: ctx.seed, pageKind: ctx.kind, structure, titleSize: L.title, rules: L.rules },
  }
}

const background = (kind: BodyPageKind, fallback: Paint): Paint => (kind === 'mockups' ? { role: 'neutral', step: 50 } : fallback)
const heading = (size: number): TextRole => ({ family: 'heading', size, weight: 700, lineHeight: 1.06, tracking: -0.02 })
const intro = (size: number): TextRole => ({ family: 'body', size, weight: 400, lineHeight: 1.4 })
const FOOT = 64

function compose(ctx: BodyPageContext, structure: BodyStructure): Page {
  const L = look(ctx, structure)
  const m = L.margin, t = L.top, b = ctx.brand
  const titleText = TITLES[ctx.kind]
  const introText = bodyIntro(ctx.kind, b)
  const rule = (y: number, x = m, w = W - m * 2): Node => ({ t: 'frame', id: 'rule', rect: rect(x, y, w, 1.5), fill: { role: 'ink', alpha: 0.16 }, children: [] })
  let nodes: Node[] = []
  let bg: Paint = { role: 'paper' }
  let g: Parameters<typeof genome>[3]

  switch (structure) {
    case 'header-band': {
      const titleH = Math.round(L.title * 1.2)
      const introX = Math.round(W * 0.6)
      nodes = [
        ...furniture(ctx, L, { kickerBox: rect(m, t, 700, 22) }),
        text('title', rect(m, t + 34, introX - m - 40, titleH), titleText, heading(L.title)),
        text('intro', rect(introX, t + 38, W - m - introX, titleH), introText, intro(19), { role: 'ink', alpha: 0.72 }),
      ]
      const top = t + 34 + titleH + 22
      if (L.rules) nodes.push(rule(top - 12))
      nodes.push(bodyNode(ctx, rect(m, top + 14, W - m * 2, H - top - 14 - FOOT)))
      g = { axis: 'left', colourBlocking: 'quiet', density: 0.66, devices: L.rules ? ['rule'] : [] }
      break
    }
    case 'side-title': {
      const colW = 360
      nodes = [
        ...furniture(ctx, L, { kickerBox: rect(m, t, colW, 22) }),
        text('title', rect(m, t + 36, colW, Math.round(L.title * 0.8 * 3.4)), titleText, heading(Math.round(L.title * 0.8))),
        text('intro', rect(m, t + 50 + Math.round(L.title * 0.8 * 3.4), colW - 20, 220), introText, intro(18), { role: 'ink', alpha: 0.72 }),
      ]
      const bx = m + colW + 48
      if (L.rules) nodes.push({ t: 'frame', id: 'rule', rect: rect(bx - 24, t, 1.5, H - t - FOOT), fill: { role: 'ink', alpha: 0.14 }, children: [] })
      nodes.push(bodyNode(ctx, rect(bx, t, W - m - bx, H - t - FOOT)))
      g = { axis: 'asymmetric', colourBlocking: 'quiet', density: 0.58, devices: L.rules ? ['column-rule'] : [] }
      break
    }
    case 'rail-index': {
      const railW = 220
      const no = pageNumber(ctx)
      const titleH = Math.round(L.title * 1.2)
      nodes = [
        { t: 'frame', id: 'rail', rect: rect(0, 0, railW, H), fill: { role: 'surface-dark' }, children: [] },
        text('rail-index', rect(40, t, railW - 70, 80), no, { family: 'mono', size: 64, weight: 600, lineHeight: 1 }, { role: 'surface-light' }),
        text('rail-label', rect(40, t + 96, railW - 70, 120), titleText, { family: 'body', size: 16, weight: 600, lineHeight: 1.35 }, { role: 'surface-light', alpha: 0.82 }),
        ...furniture(ctx, L, { left: railW + 56 }),
        text('title', rect(railW + 56, t, W - railW - 56 - m, titleH), titleText, heading(L.title)),
      ]
      const top = t + titleH + 26
      nodes.push(bodyNode(ctx, rect(railW + 56, top, W - railW - 56 - m, H - top - FOOT)))
      g = { axis: 'left', colourBlocking: 'split', density: 0.7, devices: ['index-rail'] }
      break
    }
    case 'brand-band': {
      const bandH = Math.round(t + 34 + L.title * 1.2 + 34)
      nodes = [
        { t: 'frame', id: 'band', rect: rect(0, 0, W, bandH), fill: { role: 'brand' }, children: [] },
        ...furniture(ctx, L, { kickerBox: rect(m, t, 700, 22), kickerColor: { role: 'on-brand', alpha: 0.8 } }),
        text('title', rect(m, t + 34, Math.round(W * 0.56), Math.round(L.title * 1.2)), titleText, heading(L.title), { role: 'on-brand' }),
        text('intro', rect(Math.round(W * 0.6), t + 38, W - m - Math.round(W * 0.6), Math.round(L.title * 1.2)), introText, intro(19), { role: 'on-brand', alpha: 0.86 }),
      ]
      const top = bandH + 34
      nodes.push(bodyNode(ctx, rect(m, top, W - m * 2, H - top - FOOT)))
      g = { axis: 'left', colourBlocking: 'flood', density: 0.62, devices: ['brand-band'] }
      break
    }
    case 'centred': {
      bg = { role: 'surface-light' }
      const titleH = Math.round(L.title * 1.2)
      nodes = [
        ...furniture(ctx, L, { kickerBox: rect(m, t, W - m * 2, 22), align: 'center' }),
        text('title', rect(m * 2, t + 32, W - m * 4, titleH), titleText, heading(L.title), ink, 'center'),
        text('intro', rect(Math.round(W * 0.2), t + 40 + titleH, Math.round(W * 0.6), 54), introText, intro(18), { role: 'ink', alpha: 0.72 }, 'center'),
      ]
      const top = t + 40 + titleH + 72
      const side = Math.round(m * 1.4)
      nodes.push(bodyNode(ctx, rect(side, top, W - side * 2, H - top - FOOT)))
      g = { axis: 'center', colourBlocking: 'quiet', density: 0.4 }
      break
    }
    case 'split-lead': {
      // A tinted lead column from the page edge carries the title and intro; the content takes the rest.
      // The title still comes first in reading order.
      const leadW = m + 340, inner = leadW - m - 40
      const titleSize = Math.round(L.title * 0.78), titleH = Math.round(titleSize * 1.06 * 3.2)
      nodes = [
        { t: 'frame', id: 'lead', rect: rect(0, 0, leadW, H), fill: { role: 'brand', step: 50 }, children: [] },
        ...furniture(ctx, L, { kickerBox: rect(m, t, inner, 22) }),
        text('title', rect(m, t + 36, inner, titleH), titleText, heading(titleSize)),
        text('intro', rect(m, t + 52 + titleH, inner, 240), introText, intro(18), { role: 'ink', alpha: 0.74 }),
      ]
      const bx = leadW + 56
      nodes.push(bodyNode(ctx, rect(bx, t, W - m - bx, H - t - FOOT)))
      g = { axis: 'asymmetric', colourBlocking: 'split', density: 0.56, devices: ['lead-column'] }
      break
    }
  }

  return { kind: ctx.kind, width: W, height: H, background: background(ctx.kind, bg), nodes, genome: genome(ctx, structure, L, g) }
}

export function composeBodyCandidates(ctx: BodyPageContext): Page[] {
  return BODY_STRUCTURES.map((structure) => compose(ctx, structure))
}
