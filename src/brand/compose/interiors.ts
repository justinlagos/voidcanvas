import type { Brand } from '@/studio/brand/tokens'
import type { DirectionFamily } from './families'
import type { Node, Page, PageGenome, Paint, Rect, TextRole } from './types'

export type InteriorKind =
  | 'principles' | 'logo' | 'clearspace' | 'minsize' | 'misuse' | 'photo'
  | 'colour' | 'ramps' | 'access' | 'type' | 'scale' | 'mockups' | 'voice'
  | 'tokens' | 'closing'

export interface InteriorContext {
  kind: InteriorKind
  brand: Brand
  family: DirectionFamily
  seed: number
  pageNo?: number
  pageCount?: number
  deviceAngle?: number
}

interface ContentItem { label: string; body?: string; value?: string }
interface InteriorContent {
  title: string
  intro: string
  items: ContentItem[]
  visual: 'logo' | 'swatches' | 'type' | 'image' | 'table' | 'text'
}

type LayoutId = 'editorial-split' | 'modular-cards' | 'specimen-led' | 'poster-field' | 'quiet-stack' | 'rail-index'

const W = 1600, H = 900
const paper: Paint = { role: 'paper' }, ink: Paint = { role: 'ink' }, light: Paint = { role: 'surface-light' }
const dark: Paint = { role: 'surface-dark' }, brandPaint: Paint = { role: 'brand' }, accent: Paint = { role: 'accent' }
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const heading = (size: number, weight = 700): TextRole => ({ family: 'heading', size, weight, lineHeight: 1.04, tracking: -0.02 })
const body = (size: number, weight = 400): TextRole => ({ family: 'body', size, weight, lineHeight: 1.35 })
const mono = (size: number, weight = 500): TextRole => ({ family: 'mono', size, weight, lineHeight: 1.25 })

const seeded = (seed: number, salt: number) => {
  let x = Math.imul(seed + 17, 0x9e3779b1) ^ Math.imul(salt + 31, 0x85ebca6b)
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15
  return (x >>> 0) / 4294967295
}

const text = (id: string, box: Rect, value: string, style: TextRole, color: Paint = ink, fit: 'wrap' | 'shrink' = 'wrap', align: 'left' | 'center' | 'right' = 'left'): Node => ({
  t: 'text', id, rect: box, style, text: value, align, color, fit, source: 'suggested',
})

function contentFor(ctx: InteriorContext): InteriorContent {
  const b = ctx.brand
  switch (ctx.kind) {
    case 'principles': return { title: 'Principles', intro: 'The few rules that keep the system recognisable across different work.', visual: 'text', items: b.principles.map((p) => ({ label: p.title, body: p.body })) }
    case 'logo': return { title: 'Logo system', intro: 'Use the primary mark consistently and switch version only when the surface requires it.', visual: 'logo', items: [{ label: 'Primary', body: 'Default brand mark' }, { label: 'Reversed', body: 'For dark or brand-colour surfaces' }, { label: 'Mono', body: 'For constrained reproduction' }] }
    case 'clearspace': return { title: 'Clear space', intro: `Keep at least ${Math.round(b.logo.clearSpace * 100)}% of the mark height clear around the logo.`, visual: 'logo', items: [{ label: 'Minimum clear space', value: `${Math.round(b.logo.clearSpace * 100)}%` }, { label: 'Source', value: b.logo.sources.clearSpace }] }
    case 'minsize': return { title: 'Minimum size', intro: 'Protect recognition by respecting the minimum sizes below.', visual: 'logo', items: [{ label: 'Screen', value: `${b.logo.minWidth}px` }, { label: 'Print', value: `${b.logo.minPrint}mm` }] }
    case 'misuse': return { title: 'Logo misuse', intro: 'Keep the logo intact. Avoid changes that make it look like a different identity.', visual: 'logo', items: [{ label: 'Do not stretch' }, { label: 'Do not rotate' }, { label: 'Do not recolour arbitrarily' }, { label: 'Do not crowd the mark' }] }
    case 'photo': return { title: 'Imagery direction', intro: 'Choose images that support the identity rather than compete with it.', visual: 'image', items: [{ label: 'Subject', body: 'Clear focal point' }, { label: 'Crop', body: 'Leave room for communication' }, { label: 'Tone', body: b.personality }] }
    case 'colour': return { title: 'Colour system', intro: 'Primary, supporting and accent colours work as a hierarchy, not equal decoration.', visual: 'swatches', items: b.roles.map((r) => ({ label: r.name, body: r.usage, value: r.hex })) }
    case 'ramps': return { title: 'Colour ramps', intro: 'Use tonal ramps to create hierarchy while keeping the core palette recognisable.', visual: 'swatches', items: b.roles.map((r) => ({ label: r.name, value: r.hex })) }
    case 'access': return { title: 'Accessible colour', intro: 'Use tested foreground and background pairs for text and interface content.', visual: 'swatches', items: b.pairs.slice(0, 6).map((p) => ({ label: `${p.fgName} / ${p.bgName}`, value: `${p.ratio.toFixed(1)}:1`, body: p.use })) }
    case 'type': return { title: 'Typography', intro: `${b.fonts.heading.family} leads. ${b.fonts.body.family} carries reading text.`, visual: 'type', items: [{ label: 'Heading', value: b.fonts.heading.family }, { label: 'Body', value: b.fonts.body.family }, { label: 'Mono', value: b.fonts.mono.family }] }
    case 'scale': return { title: 'Type scale', intro: `The scale uses ${b.ratioLabel.toLowerCase()} with a ${b.baseSize}px base.`, visual: 'type', items: b.scale.slice(0, 7).map((s) => ({ label: s.label, value: `${s.px}px`, body: `${s.weight} / ${s.lineHeight}` })) }
    case 'mockups': return { title: 'Applications', intro: 'Apply the system consistently across real surfaces before introducing new visual rules.', visual: 'image', items: [{ label: 'Digital' }, { label: 'Social' }, { label: 'Print' }] }
    case 'voice': return { title: 'Voice', intro: b.voice.tone, visual: 'text', items: [...b.voice.dos.map((x) => ({ label: 'Do', body: x })), ...b.voice.donts.map((x) => ({ label: 'Avoid', body: x }))] }
    case 'tokens': return { title: 'Design tokens', intro: 'The system below turns the visual identity into repeatable production values.', visual: 'table', items: [{ label: 'Spacing', value: b.spacing.join(', ') }, { label: 'Radius', value: `${b.radius}px` }, { label: 'Grid', value: `${b.grid.cols} columns` }, { label: 'Gutter', value: `${b.grid.gutter}px` }] }
    case 'closing': return { title: b.name, intro: b.tagline || 'Use the system consistently, then break it deliberately when the idea earns it.', visual: 'logo', items: [{ label: 'Brand guidelines', body: 'End of document' }] }
  }
}

function visualNodes(ctx: InteriorContext, c: InteriorContent, box: Rect): Node[] {
  const b = ctx.brand
  if (c.visual === 'logo') return [{ t: 'logo', id: `${ctx.kind}-logo`, rect: box, version: 'auto', on: light, clearSpace: ctx.kind === 'clearspace', demo: ctx.kind === 'misuse' ? 'misuse' : ctx.kind === 'minsize' ? 'minsize' : ctx.kind === 'clearspace' ? 'clearspace' : undefined }]
  if (c.visual === 'image') return [{ t: 'image', id: `${ctx.kind}-image`, rect: box, src: ctx.kind === 'mockups' ? { mockup: 'brand-application' } : { photo: 0 }, crop: 'cover' }]
  if (c.visual === 'type') return [{ t: 'specimen', id: `${ctx.kind}-specimen`, rect: box, family: 'heading', mode: ctx.kind === 'scale' ? 'waterfall' : 'name' }]
  if (c.visual === 'swatches') {
    const n = Math.max(1, Math.min(4, c.items.length))
    const gap = 16, w = (box.w - gap * (n - 1)) / n
    return c.items.slice(0, n).map((it, i) => ({ t: 'swatch', id: `${ctx.kind}-swatch-${i}`, rect: rect(box.x + i * (w + gap), box.y, w, box.h), role: it.label, paint: it.value?.startsWith('#') ? { hex: it.value } : ({ role: i === 0 ? 'brand' : i === 1 ? 'secondary' : 'accent' } as Paint), radius: b.radius, specs: ['hex', 'rgb', 'oklch', 'token'] }))
  }
  if (c.visual === 'table') return [{ t: 'table', id: `${ctx.kind}-table`, rect: box, rows: c.items.map((x) => [x.label, x.value ?? '', x.body ?? '']), style: 'spec' }]
  return []
}

function itemNodes(ctx: InteriorContext, c: InteriorContent, box: Rect, columns: number): Node[] {
  const items = c.items.slice(0, 6)
  const gap = 18, rows = Math.ceil(items.length / columns), cellW = (box.w - gap * (columns - 1)) / columns, cellH = (box.h - gap * (rows - 1)) / Math.max(1, rows)
  return items.flatMap((it, i) => {
    const col = i % columns, row = Math.floor(i / columns), x = box.x + col * (cellW + gap), y = box.y + row * (cellH + gap)
    return [
      { t: 'frame', id: `item-card-${i}`, rect: rect(x, y, cellW, cellH), fill: light, radius: Math.min(18, ctx.brand.radius), children: [] } as Node,
      text(`item-label-${i}`, rect(x + 20, y + 18, cellW - 40, 30), it.label, body(18, 700), ink, 'shrink'),
      text(`item-body-${i}`, rect(x + 20, y + 58, cellW - 40, cellH - 72), it.value ? `${it.value}${it.body ? `\n${it.body}` : ''}` : (it.body ?? ''), it.value ? mono(17) : body(18), ink, 'wrap'),
    ]
  })
}

function genome(ctx: InteriorContext, id: LayoutId, density: number, axis: PageGenome['axis'], colourBlocking: string, devices: string[] = []): PageGenome {
  const family = ctx.family
  const grid = family.grids[Math.floor(seeded(ctx.seed, id.length) * family.grids.length)] ?? 'column'
  return {
    compositionId: `${ctx.kind}-${id}`,
    grid,
    axis,
    marginRatio: family.margin[0] + (family.margin[1] - family.margin[0]) * seeded(ctx.seed, id.charCodeAt(0)),
    typeTreatment: id,
    colourBlocking,
    devices,
    density,
    parameters: { family: family.id, seed: ctx.seed, pageKind: ctx.kind },
  }
}

function makePage(ctx: InteriorContext, id: LayoutId): Page {
  const c = contentFor(ctx)
  let background: Paint = paper
  let nodes: Node[] = []
  let g: PageGenome
  const eyebrow = text('section-kicker', rect(90, 60, 500, 30), `${String(ctx.pageNo ?? 2).padStart(2, '0')}  ${c.title.toUpperCase()}`, body(17, 700), ink, 'shrink')

  if (id === 'editorial-split') {
    nodes = [eyebrow, text('title', rect(90, 130, 650, 160), c.title, heading(86), ink, 'shrink'), text('intro', rect(90, 315, 560, 150), c.intro, body(25), ink), ...visualNodes(ctx, c, rect(820, 100, 690, 470)), ...itemNodes(ctx, c, rect(820, 600, 690, 210), 3)]
    g = genome(ctx, id, 0.5, 'asymmetric', 'quiet')
  } else if (id === 'modular-cards') {
    nodes = [eyebrow, text('title', rect(90, 125, 950, 110), c.title, heading(72), ink, 'shrink'), text('intro', rect(1060, 130, 440, 100), c.intro, body(20), ink), ...itemNodes(ctx, c, rect(90, 300, 1420, 500), 3)]
    g = genome(ctx, id, 0.78, 'left', 'quiet', ['cards'])
  } else if (id === 'specimen-led') {
    nodes = [eyebrow, ...visualNodes(ctx, c, rect(90, 150, 900, 620)), text('title', rect(1050, 150, 450, 130), c.title, heading(64), ink, 'shrink'), text('intro', rect(1050, 310, 420, 150), c.intro, body(22), ink), ...itemNodes(ctx, c, rect(1050, 500, 420, 270), 1)]
    g = genome(ctx, id, 0.56, 'asymmetric', 'quiet', ['specimen'])
  } else if (id === 'poster-field') {
    background = brandPaint
    nodes = [{ t: 'device', id: 'angle-field', rect: rect(0, 0, W, H), kind: 'angle-field', params: { angle: ctx.deviceAngle ?? 24, spacing: 72, opacity: 0.08 } }, text('title', rect(80, 90, 1280, 220), c.title, heading(132), light, 'shrink'), text('intro', rect(85, 340, 760, 130), c.intro, body(27), light), ...visualNodes(ctx, c, rect(930, 380, 560, 340)), ...itemNodes(ctx, c, rect(80, 610, 760, 190), 3)]
    g = genome(ctx, id, 0.7, 'diagonal', 'flood', ['angle-field'])
  } else if (id === 'quiet-stack') {
    nodes = [eyebrow, text('title', rect(260, 150, 1080, 150), c.title, heading(78), ink, 'shrink', 'center'), text('intro', rect(420, 320, 760, 100), c.intro, body(22), ink, 'wrap', 'center'), ...visualNodes(ctx, c, rect(430, 470, 740, 230)), ...itemNodes(ctx, c, rect(430, 730, 740, 90), 3)]
    g = genome(ctx, id, 0.24, 'center', 'quiet')
  } else {
    nodes = [{ t: 'frame', id: 'rail', rect: rect(0, 0, 300, H), fill: dark, children: [] }, text('rail-index', rect(50, 70, 200, 40), String(ctx.pageNo ?? 2).padStart(2, '0'), mono(24, 700), light, 'shrink'), text('title', rect(350, 90, 1120, 130), c.title, heading(76), ink, 'shrink'), text('intro', rect(350, 245, 700, 100), c.intro, body(22), ink), ...visualNodes(ctx, c, rect(350, 400, 560, 340)), ...itemNodes(ctx, c, rect(950, 400, 520, 340), 2)]
    g = genome(ctx, id, 0.62, 'left', 'split', ['index-rail'])
  }

  return { kind: ctx.kind, width: W, height: H, background, nodes, genome: g }
}

export const INTERIOR_LAYOUTS: readonly LayoutId[] = ['editorial-split', 'modular-cards', 'specimen-led', 'poster-field', 'quiet-stack', 'rail-index']
export const INTERIOR_KINDS: readonly InteriorKind[] = ['principles', 'logo', 'clearspace', 'minsize', 'misuse', 'photo', 'colour', 'ramps', 'access', 'type', 'scale', 'mockups', 'voice', 'tokens', 'closing']

export function composeInteriorCandidates(ctx: InteriorContext): Page[] {
  return INTERIOR_LAYOUTS.map((layout) => makePage(ctx, layout))
}

export function interiorCompositionCount(kind: InteriorKind) {
  return composeInteriorCandidates as unknown as { kind?: InteriorKind } ? INTERIOR_LAYOUTS.length : 0
}
