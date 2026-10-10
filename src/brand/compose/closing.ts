// Brand Guidelines V2: the closing page. It carries the mark, the name and the line the brand ends on,
// so it is composed as a quiet full page rather than a content page: six structures, each giving the mark
// a surface the runtime then picks the right logo version for.

import type { Brand } from '@/studio/brand/tokens'
import type { DirectionFamily } from './families'
import type { Node, Page, PageGenome, Paint, Rect, TextRole } from './types'

export type ClosingStructure = 'brand-centred' | 'paper-corner' | 'dark-monolith' | 'split-field' | 'quiet-centre' | 'band-foot'
export const CLOSING_STRUCTURES: readonly ClosingStructure[] = ['brand-centred', 'paper-corner', 'dark-monolith', 'split-field', 'quiet-centre', 'band-foot']

export interface ClosingContext {
  brand: Brand
  family: DirectionFamily
  seed: number
  logoAspect?: number
}

const W = 1600, H = 900
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const heading = (size: number): TextRole => ({ family: 'heading', size, weight: 700, lineHeight: 1.04, tracking: -0.02 })
const body = (size: number, weight = 400): TextRole => ({ family: 'body', size, weight, lineHeight: 1.35 })
const brandP: Paint = { role: 'brand' }, onBrand: Paint = { role: 'on-brand' }, paper: Paint = { role: 'paper' }
const ink: Paint = { role: 'ink' }, dark: Paint = { role: 'surface-dark' }, light: Paint = { role: 'surface-light' }

function seeded(seed: number, salt: number) {
  let x = Math.imul(seed + 211, 0x9e3779b1) ^ Math.imul(salt + 23, 0x85ebca6b)
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  return (x >>> 0) / 4294967295
}

function text(id: string, box: Rect, value: string, style: TextRole, color: Paint, align: 'left' | 'center' | 'right' = 'left'): Node {
  return { t: 'text', id, rect: box, style, text: value, align, color, fit: 'shrink', source: 'suggested' }
}

/** A box of the mark's proportions that fits inside the space given. */
function markBox(ctx: ClosingContext, x: number, y: number, maxW: number, maxH: number, align: 'left' | 'center' | 'right' = 'left'): Rect {
  const ar = Math.max(0.2, Math.min(8, ctx.logoAspect ?? 1))
  let h = maxH, w = h * ar
  if (w > maxW) { w = maxW; h = w / ar }
  // Never below the brand's own minimum width, as far as the space allows.
  const minW = ctx.brand.logo.minWidth
  if (w < minW) { w = Math.min(minW, maxW * 1.3); h = w / ar; if (h > maxH * 1.8) { h = maxH * 1.8; w = h * ar } }
  return rect(align === 'center' ? x + (maxW - w) / 2 : align === 'right' ? x + maxW - w : x, y + (maxH - h) / 2, w, h)
}

const logo = (id: string, box: Rect, on: Paint): Node => ({ t: 'logo', id, rect: box, version: 'auto', on, clearSpace: false })

function genome(ctx: ClosingContext, structure: ClosingStructure, g: { axis: PageGenome['axis']; colourBlocking: string; density: number }): PageGenome {
  return {
    compositionId: `closing-${structure}`,
    grid: ctx.family.grids[Math.floor(seeded(ctx.seed, structure.length) * ctx.family.grids.length)] ?? 'column',
    axis: g.axis,
    marginRatio: 0.06,
    typeTreatment: structure,
    colourBlocking: g.colourBlocking,
    devices: [],
    density: g.density,
    parameters: { family: ctx.family.id, seed: ctx.seed, pageKind: 'closing', structure },
  }
}

function compose(ctx: ClosingContext, structure: ClosingStructure): Page {
  const b = ctx.brand
  const line = b.tagline || 'Brand guidelines'
  const year = `Brand guidelines, ${new Date().getFullYear()}`
  const display = Math.round(Math.max(72, Math.min(150, 70 * ((ctx.family.displayScale[0] + ctx.family.displayScale[1]) / 2))))
  let background: Paint = paper, nodes: Node[] = [], g: Parameters<typeof genome>[2]
  switch (structure) {
    case 'brand-centred':
      background = brandP
      nodes = [
        logo('mark', markBox(ctx, 500, 190, 600, 200, 'center'), brandP),
        text('name', rect(160, 440, W - 320, display * 1.15), b.name, heading(display), onBrand, 'center'),
        text('line', rect(260, 470 + display * 1.15, W - 520, 44), line, body(26), { role: 'on-brand', alpha: 0.82 }, 'center'),
        text('year', rect(160, H - 76, W - 320, 26), year, body(16, 500), { role: 'on-brand', alpha: 0.7 }, 'center'),
      ]
      g = { axis: 'center', colourBlocking: 'flood', density: 0.3 }
      break
    case 'paper-corner':
      nodes = [
        { t: 'frame', id: 'accent-bar', rect: rect(W - 92, 80, 12, H - 160), fill: { role: 'accent' }, children: [] },
        logo('mark', markBox(ctx, 90, 300, 420, 140), paper),
        text('name', rect(90, 480, 1200, display * 1.15), b.name, heading(display), ink),
        text('line', rect(94, 500 + display * 1.15, 1000, 40), line, body(24), { role: 'ink', alpha: 0.66 }),
        text('year', rect(94, H - 76, 600, 26), year, body(16, 500), { role: 'ink', alpha: 0.62 }),
      ]
      g = { axis: 'left', colourBlocking: 'quiet', density: 0.28 }
      break
    case 'dark-monolith':
      background = dark
      nodes = [
        logo('mark', markBox(ctx, W - 90 - 320, 80, 320, 120, 'right'), dark),
        text('year', rect(90, 96, 700, 26), year, body(18, 500), { role: 'surface-light', alpha: 0.7 }),
        text('name', rect(80, 380, W - 160, 300), b.name, heading(Math.round(display * 1.6)), light),
        text('line', rect(90, 720, 1100, 40), line, body(26), { role: 'surface-light', alpha: 0.82 }),
      ]
      g = { axis: 'left', colourBlocking: 'flood', density: 0.36 }
      break
    case 'split-field':
      nodes = [
        { t: 'frame', id: 'field', rect: rect(0, 0, W * 0.48, H), fill: brandP, children: [] },
        logo('mark', markBox(ctx, 100, 300, W * 0.48 - 200, 300, 'center'), brandP),
        text('name', rect(W * 0.54, 330, W * 0.46 - 90, display * 1.15), b.name, heading(Math.round(display * 0.8)), ink),
        text('line', rect(W * 0.54 + 4, 350 + display * 0.92, W * 0.46 - 90, 80), line, body(24), { role: 'ink', alpha: 0.66 }),
        text('year', rect(W * 0.54 + 4, H - 76, 600, 26), year, body(16, 500), { role: 'ink', alpha: 0.62 }),
      ]
      g = { axis: 'asymmetric', colourBlocking: 'split', density: 0.34 }
      break
    case 'quiet-centre':
      background = light
      nodes = [
        logo('mark', markBox(ctx, 640, 250, 320, 120, 'center'), light),
        { t: 'frame', id: 'rule', rect: rect(W / 2 - 60, 420, 120, 1.5), fill: { role: 'ink', alpha: 0.24 }, children: [] },
        text('name', rect(200, 460, W - 400, 72), b.name, heading(Math.round(display * 0.5)), ink, 'center'),
        text('line', rect(300, 548, W - 600, 36), line, body(20), { role: 'ink', alpha: 0.66 }, 'center'),
        text('year', rect(200, H - 76, W - 400, 26), year, body(15, 500), { role: 'ink', alpha: 0.62 }, 'center'),
      ]
      g = { axis: 'center', colourBlocking: 'quiet', density: 0.18 }
      break
    case 'band-foot':
      nodes = [
        text('name', rect(90, 150, W - 180, display * 1.15), b.name, heading(display), ink),
        text('line', rect(94, 170 + display * 1.15, 1100, 40), line, body(24), { role: 'ink', alpha: 0.66 }),
        { t: 'frame', id: 'band', rect: rect(0, 560, W, H - 560), fill: brandP, children: [] },
        logo('mark', markBox(ctx, 90, 630, 440, 150), brandP),
        text('year', rect(W - 90 - 600, H - 90, 600, 26), year, body(16, 500), { role: 'on-brand', alpha: 0.78 }, 'right'),
      ]
      g = { axis: 'left', colourBlocking: 'banded-flood', density: 0.32 }
      break
  }
  return { kind: 'closing', width: W, height: H, background, nodes, genome: genome(ctx, structure, g) }
}

export function composeClosingCandidates(ctx: ClosingContext): Page[] {
  return CLOSING_STRUCTURES.map((structure) => compose(ctx, structure))
}
