import type { Brand } from '@/studio/brand/tokens'
import type { DirectionFamily } from './families'
import type { Page, PageGenome, Paint, Rect, TextRole } from './types'

export interface CoverContext {
  brand: Brand
  family: DirectionFamily
  seed: number
  logoAspect?: number
  deviceAngle?: number
}

type CoverComposition = (ctx: CoverContext) => Page | null

const W = 1600, H = 900
const brand: Paint = { role: 'brand' }
const secondary: Paint = { role: 'secondary' }
const accent: Paint = { role: 'accent' }
const paper: Paint = { role: 'paper' }
const ink: Paint = { role: 'ink' }
const light: Paint = { role: 'surface-light' }
const dark: Paint = { role: 'surface-dark' }

const heading = (size: number, weight = 700): TextRole => ({ family: 'heading', size, weight, lineHeight: 1.02, tracking: -0.02 })
const body = (size: number, weight = 500): TextRole => ({ family: 'body', size, weight, lineHeight: 1.25 })
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const r = (seed: number, salt: number) => {
  let x = (seed + 1) * 2654435761 + salt * 1013904223
  x ^= x >>> 16
  x = Math.imul(x, 2246822519)
  x ^= x >>> 13
  return (x >>> 0) / 4294967295
}
const axisFor = (id: string): PageGenome['axis'] => id.includes('centre') ? 'center' : id.includes('diagonal') ? 'diagonal' : id.includes('split') || id.includes('offset') ? 'asymmetric' : 'left'
const genome = (id: string, ctx: CoverContext, extra: Partial<PageGenome> = {}): PageGenome => ({
  compositionId: id,
  grid: ctx.family.grids[Math.floor(r(ctx.seed, 2) * ctx.family.grids.length)] ?? 'column',
  axis: axisFor(id),
  marginRatio: ctx.family.margin[0] + (ctx.family.margin[1] - ctx.family.margin[0]) * r(ctx.seed, 3),
  typeTreatment: id,
  colourBlocking: id.includes('flood') || id.includes('split') ? 'flood' : 'quiet',
  devices: id.includes('crop') ? ['supergraphic'] : id.includes('diagonal') ? ['angle-field'] : [],
  density: ctx.family.density[0] + (ctx.family.density[1] - ctx.family.density[0]) * r(ctx.seed, 4),
  parameters: { seed: ctx.seed, family: ctx.family.id },
  ...extra,
})

const title = (ctx: CoverContext, box: Rect, size: number, color: Paint = ink, align: 'left' | 'center' | 'right' = 'left') => ({
  t: 'text' as const,
  id: 'brand-name',
  rect: box,
  style: heading(size),
  text: ctx.brand.name,
  align,
  color,
  fit: 'shrink' as const,
  maxLines: 2,
  source: 'designer' as const,
})
const eyebrow = (box: Rect, color: Paint = ink, align: 'left' | 'center' | 'right' = 'left') => ({
  t: 'text' as const,
  id: 'eyebrow',
  rect: box,
  style: body(22, 600),
  text: 'BRAND GUIDELINES',
  align,
  case: 'upper' as const,
  color,
  fit: 'shrink' as const,
  maxLines: 1,
  source: 'suggested' as const,
})
const logo = (box: Rect, on: Paint) => ({ t: 'logo' as const, id: 'logo', rect: box, version: 'auto' as const, on, clearSpace: true })

const flushLeft: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: paper,
  nodes: [
    logo(rect(110, 90, 150, 120), paper),
    eyebrow(rect(110, 390, 500, 40)),
    title(ctx, rect(110, 455, 1220, 220), 150),
    { t: 'frame', id: 'rule', rect: rect(110, 760, 1380, 2), fill: brand, children: [] },
  ],
  genome: genome('cover-flush-left', ctx),
})

const centreAxis: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: light,
  nodes: [
    logo(rect(650, 120, 300, 170), light),
    eyebrow(rect(500, 370, 600, 40), ink, 'center'),
    title(ctx, rect(250, 430, 1100, 210), 136, ink, 'center'),
    { t: 'frame', id: 'signal', rect: rect(760, 720, 80, 8), fill: accent, children: [] },
  ],
  genome: genome('cover-centre-axis', ctx, { axis: 'center', density: 0.24 }),
})

const splitField: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: paper,
  nodes: [
    { t: 'frame', id: 'field', rect: rect(920, 0, 680, H), fill: brand, children: [] },
    logo(rect(1050, 110, 320, 210), brand),
    eyebrow(rect(110, 320, 600, 40)),
    title(ctx, rect(110, 390, 700, 300), 128),
  ],
  genome: genome('cover-split-field', ctx, { axis: 'asymmetric', colourBlocking: 'flood' }),
})

const monumentalType: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: dark,
  nodes: [
    eyebrow(rect(100, 92, 500, 40), light),
    title(ctx, rect(90, 210, 1420, 430), 220, light),
    logo(rect(1260, 690, 220, 110), dark),
  ],
  genome: genome('cover-monumental-type', ctx, { density: 0.7, colourBlocking: 'flood' }),
})

const croppedMark: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: light,
  nodes: [
    { t: 'device', id: 'supergraphic', rect: rect(800, 0, 800, 900), kind: 'supergraphic', params: { crop: true, opacity: 0.12, scale: 1.2, offsetY: -0.14 } },
    eyebrow(rect(110, 130, 500, 40)),
    title(ctx, rect(110, 500, 980, 250), 154),
    logo(rect(110, 260, 220, 150), light),
  ],
  genome: genome('cover-cropped-mark', ctx, { devices: ['supergraphic'] }),
})

const diagonalMotion: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: secondary,
  nodes: [
    { t: 'device', id: 'angle-field', rect: rect(0, 0, W, H), kind: 'angle-field', params: { angle: ctx.deviceAngle ?? 23, spacing: 54, opacity: 0.16 } },
    { t: 'frame', id: 'top-signal', rect: rect(0, 0, W, 150), fill: brand, children: [] },
    { t: 'frame', id: 'type-band', rect: rect(0, 285, W, 365), fill: paper, children: [] },
    eyebrow(rect(1050, 72, 430, 40), light, 'right'),
    title(ctx, rect(120, 350, 1360, 220), 150, ink, 'center'),
    logo(rect(1240, 700, 240, 120), secondary),
  ],
  genome: genome('cover-diagonal-motion', ctx, { axis: 'diagonal', devices: ['angle-field'], colourBlocking: 'banded-flood', density: 0.76 }),
})

const specimenPlate: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: paper,
  nodes: [
    { t: 'frame', id: 'outer', rect: rect(70, 70, 1460, 760), stroke: ink, strokeWidth: 2, children: [] },
    eyebrow(rect(110, 110, 500, 40)),
    logo(rect(110, 230, 280, 190), paper),
    title(ctx, rect(110, 500, 920, 210), 122),
    { t: 'text', id: 'folio', rect: rect(1240, 720, 220, 40), style: body(18, 600), text: '01 / IDENTITY', align: 'right', color: ink, fit: 'shrink', source: 'suggested' },
  ],
  genome: genome('cover-specimen-plate', ctx, { density: 0.58 }),
})

const offsetCards: CoverComposition = (ctx) => ({
  kind: 'cover', width: W, height: H, background: dark,
  nodes: [
    { t: 'frame', id: 'card-a', rect: rect(90, 110, 980, 650), fill: paper, radius: 18, children: [] },
    { t: 'frame', id: 'card-b', rect: rect(1110, 230, 360, 430), fill: brand, radius: 18, children: [] },
    eyebrow(rect(150, 190, 500, 40)),
    title(ctx, rect(150, 390, 820, 240), 132),
    logo(rect(1160, 340, 260, 190), brand),
  ],
  genome: genome('cover-offset-cards', ctx, { axis: 'asymmetric', devices: ['cards'] }),
})

export const COVER_COMPOSITIONS: readonly { id: string; compose: CoverComposition }[] = [
  { id: 'cover-flush-left', compose: flushLeft },
  { id: 'cover-centre-axis', compose: centreAxis },
  { id: 'cover-split-field', compose: splitField },
  { id: 'cover-monumental-type', compose: monumentalType },
  { id: 'cover-cropped-mark', compose: croppedMark },
  { id: 'cover-diagonal-motion', compose: diagonalMotion },
  { id: 'cover-specimen-plate', compose: specimenPlate },
  { id: 'cover-offset-cards', compose: offsetCards },
]

export function composeCoverCandidates(ctx: CoverContext) {
  return COVER_COMPOSITIONS.map(({ compose }) => compose(ctx)).filter((p): p is Page => !!p)
}
