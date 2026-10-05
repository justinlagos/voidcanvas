import type { Brand } from '@/studio/brand/tokens'
import type { DirectionFamily } from './families'
import type { Node, Page, PageGenome, Paint, Rect, TextRole } from './types'

export type InteriorKind =
  | 'principles' | 'logo' | 'clearspace' | 'minsize' | 'misuse' | 'photo'
  | 'colour' | 'ramps' | 'access' | 'type' | 'scale' | 'mockups' | 'voice'
  | 'tokens' | 'closing'

export type InteriorLayoutId =
  | 'editorial-split'
  | 'modular-cards'
  | 'specimen-led'
  | 'poster-field'
  | 'quiet-stack'
  | 'rail-index'

export interface InteriorContext {
  kind: InteriorKind
  brand: Brand
  family: DirectionFamily
  seed: number
  pageNo?: number
  pageCount?: number
  deviceAngle?: number
}

type Item = { label: string; body?: string; value?: string }
type Visual = 'logo' | 'swatches' | 'type' | 'image' | 'table' | 'none'
type Content = { title: string; intro: string; items: Item[]; visual: Visual }

const W = 1600, H = 900
const paper: Paint = { role: 'paper' }
const ink: Paint = { role: 'ink' }
const light: Paint = { role: 'surface-light' }
const dark: Paint = { role: 'surface-dark' }
const brandPaint: Paint = { role: 'brand' }
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const heading = (size: number, weight = 700): TextRole => ({ family: 'heading', size, weight, lineHeight: 1.04, tracking: -0.02 })
const body = (size: number, weight = 400): TextRole => ({ family: 'body', size, weight, lineHeight: 1.35 })
const mono = (size: number, weight = 500): TextRole => ({ family: 'mono', size, weight, lineHeight: 1.25 })

function seeded(seed: number, salt: number) {
  let x = Math.imul(seed + 17, 0x9e3779b1) ^ Math.imul(salt + 31, 0x85ebca6b)
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  return (x >>> 0) / 4294967295
}

function textNode(id: string, box: Rect, value: string, style: TextRole, color: Paint = ink, fit: 'wrap' | 'shrink' = 'wrap', align: 'left' | 'center' | 'right' = 'left'): Node {
  return { t: 'text', id, rect: box, style, text: value, align, color, fit, source: 'suggested' }
}

function contentFor(ctx: InteriorContext): Content {
  const b = ctx.brand
  switch (ctx.kind) {
    case 'principles': return { title: 'Principles', intro: 'The few rules that keep the system recognisable across different work.', visual: 'none', items: b.principles.map((p) => ({ label: p.title, body: p.body })) }
    case 'logo': return { title: 'Logo system', intro: 'Use the primary mark consistently and switch version only when the surface requires it.', visual: 'logo', items: [{ label: 'Primary', body: 'Default brand mark' }, { label: 'Reversed', body: 'For dark or brand-colour surfaces' }, { label: 'Mono', body: 'For constrained reproduction' }] }
    case 'clearspace': return { title: 'Clear space', intro: `Keep at least ${Math.round(b.logo.clearSpace * 100)}% of the mark height clear around the logo.`, visual: 'logo', items: [{ label: 'Minimum clear space', value: `${Math.round(b.logo.clearSpace * 100)}%` }, { label: 'Source', value: b.logo.sources.clearSpace }] }
    case 'minsize': return { title: 'Minimum size', intro: 'Protect recognition by respecting minimum sizes.', visual: 'logo', items: [{ label: 'Screen', value: `${b.logo.minWidth}px` }, { label: 'Print', value: `${b.logo.minPrint}mm` }] }
    case 'misuse': return { title: 'Logo misuse', intro: 'Keep the logo intact. Avoid changes that make it look like a different identity.', visual: 'logo', items: [{ label: 'Do not stretch' }, { label: 'Do not rotate' }, { label: 'Do not recolour arbitrarily' }, { label: 'Do not crowd the mark' }] }
    case 'photo': return { title: 'Imagery direction', intro: 'Choose images that support the identity rather than compete with it.', visual: 'image', items: [{ label: 'Subject', body: 'Clear focal point' }, { label: 'Crop', body: 'Leave room for communication' }, { label: 'Tone', body: b.personality }] }
    case 'colour': return { title: 'Colour system', intro: 'Primary, supporting and accent colours work as a hierarchy.', visual: 'swatches', items: b.roles.map((r) => ({ label: r.name, body: r.usage, value: r.hex })) }
    case 'ramps': return { title: 'Colour ramps', intro: 'Use tonal ramps to create hierarchy while keeping the core palette recognisable.', visual: 'swatches', items: b.roles.map((r) => ({ label: r.name, value: r.hex })) }
    case 'access': return { title: 'Accessible colour', intro: 'Use tested foreground and background pairs for text and interface content.', visual: 'swatches', items: b.pairs.slice(0, 6).map((p) => ({ label: `${p.fgName} / ${p.bgName}`, value: `${p.ratio.toFixed(1)}:1`, body: p.use })) }
    case 'type': return { title: 'Typography', intro: `${b.fonts.heading.family} leads. ${b.fonts.body.family} carries reading text.`, visual: 'type', items: [{ label: 'Heading', value: b.fonts.heading.family }, { label: 'Body', value: b.fonts.body.family }, { label: 'Mono', value: b.fonts.mono.family }] }
    case 'scale': return { title: 'Type scale', intro: `The scale uses ${b.ratioLabel.toLowerCase()} with a ${b.baseSize}px base.`, visual: 'type', items: b.scale.slice(0, 6).map((s) => ({ label: s.label, value: `${s.px}px`, body: `${s.weight} / ${s.lineHeight}` })) }
    case 'mockups': return { title: 'Applications', intro: 'Apply the system consistently across real surfaces before introducing new rules.', visual: 'image', items: [{ label: 'Digital' }, { label: 'Social' }, { label: 'Print' }] }
    case 'voice': return { title: 'Voice', intro: b.voice.tone, visual: 'none', items: [...b.voice.dos.map((x) => ({ label: 'Do', body: x })), ...b.voice.donts.map((x) => ({ label: 'Avoid', body: x }))] }
    case 'tokens': return { title: 'Design tokens', intro: 'Production values that turn the identity into a repeatable system.', visual: 'table', items: [{ label: 'Spacing', value: b.spacing.join(', ') }, { label: 'Radius', value: `${b.radius}px` }, { label: 'Grid', value: `${b.grid.cols} columns` }, { label: 'Gutter', value: `${b.grid.gutter}px` }] }
    case 'closing': return { title: b.name, intro: b.tagline || 'Use the system consistently, then break it deliberately when the idea earns it.', visual: 'logo', items: [{ label: 'Brand guidelines', body: 'End of document' }] }
  }
}

function visualNodes(ctx: InteriorContext, content: Content, box: Rect): Node[] {
  if (content.visual === 'logo') return [{
    t: 'logo', id: `${ctx.kind}-logo`, rect: box, version: 'auto', on: light,
    clearSpace: ctx.kind === 'clearspace',
    demo: ctx.kind === 'misuse' ? 'misuse' : ctx.kind === 'minsize' ? 'minsize' : ctx.kind === 'clearspace' ? 'clearspace' : undefined,
  }]
  if (content.visual === 'image') return [{ t: 'image', id: `${ctx.kind}-image`, rect: box, src: ctx.kind === 'mockups' ? { mockup: 'brand-application' } : { photo: 0 }, crop: 'cover' }]
  if (content.visual === 'type') return [{ t: 'specimen', id: `${ctx.kind}-specimen`, rect: box, family: 'heading', mode: ctx.kind === 'scale' ? 'waterfall' : 'name' }]
  if (content.visual === 'table') return [{ t: 'table', id: `${ctx.kind}-table`, rect: box, rows: content.items.map((x) => [x.label, x.value ?? '', x.body ?? '']), style: 'spec' }]
  if (content.visual === 'swatches') {
    const items = content.items.slice(0, 4)
    const gap = 16
    const sw = (box.w - gap * Math.max(0, items.length - 1)) / Math.max(1, items.length)
    return items.map((item, i) => ({
      t: 'swatch', id: `${ctx.kind}-swatch-${i}`, rect: rect(box.x + i * (sw + gap), box.y, sw, box.h),
      role: item.label,
      paint: item.value?.startsWith('#') ? { hex: item.value } : ({ role: i === 0 ? 'brand' : i === 1 ? 'secondary' : 'accent' } as Paint),
      radius: ctx.brand.radius,
      specs: ['hex', 'rgb', 'oklch', 'token'],
    }))
  }
  return []
}

function itemNodes(ctx: InteriorContext, content: Content, box: Rect, columns: number): Node[] {
  const items = content.items.slice(0, 6)
  if (!items.length) return []
  const gap = 18
  const rows = Math.max(1, Math.ceil(items.length / columns))
  const cellW = (box.w - gap * (columns - 1)) / columns
  const cellH = (box.h - gap * (rows - 1)) / rows
  return items.flatMap((item, i) => {
    const col = i % columns, row = Math.floor(i / columns)
    const x = box.x + col * (cellW + gap), y = box.y + row * (cellH + gap)
    return [
      { t: 'frame', id: `item-card-${i}`, rect: rect(x, y, cellW, cellH), fill: light, radius: Math.min(18, ctx.brand.radius), children: [] } as Node,
      textNode(`item-label-${i}`, rect(x + 20, y + 18, cellW - 40, 28), item.label, body(17, 700), ink, 'shrink'),
      textNode(`item-body-${i}`, rect(x + 20, y + 54, cellW - 40, Math.max(20, cellH - 68)), item.value ? `${item.value}${item.body ? `\n${item.body}` : ''}` : (item.body ?? ''), item.value ? mono(16) : body(17), ink, 'wrap'),
    ]
  })
}

function genome(ctx: InteriorContext, id: InteriorLayoutId, density: number, axis: PageGenome['axis'], colourBlocking: string, devices: string[] = []): PageGenome {
  const grid = ctx.family.grids[Math.floor(seeded(ctx.seed, id.length) * ctx.family.grids.length)] ?? 'column'
  return {
    compositionId: `${ctx.kind}-${id}`,
    grid,
    axis,
    marginRatio: ctx.family.margin[0] + (ctx.family.margin[1] - ctx.family.margin[0]) * seeded(ctx.seed, id.charCodeAt(0)),
    typeTreatment: id,
    colourBlocking,
    devices,
    density,
    parameters: { family: ctx.family.id, seed: ctx.seed, pageKind: ctx.kind },
  }
}

function composeLayout(ctx: InteriorContext, id: InteriorLayoutId): Page {
  const content = contentFor(ctx)
  let background: Paint = paper
  let nodes: Node[]
  let pageGenome: PageGenome
  const kicker = textNode('section-kicker', rect(90, 58, 560, 30), `${String(ctx.pageNo ?? 2).padStart(2, '0')}  ${content.title.toUpperCase()}`, body(17, 700), ink, 'shrink')

  switch (id) {
    case 'editorial-split':
      nodes = [kicker, textNode('title', rect(90, 125, 650, 160), content.title, heading(86), ink, 'shrink'), textNode('intro', rect(90, 315, 560, 150), content.intro, body(24)), ...visualNodes(ctx, content, rect(820, 100, 690, 460)), ...itemNodes(ctx, content, rect(820, 590, 690, 220), 3)]
      pageGenome = genome(ctx, id, 0.5, 'asymmetric', 'quiet')
      break
    case 'modular-cards':
      nodes = [kicker, textNode('title', rect(90, 125, 930, 110), content.title, heading(72), ink, 'shrink'), textNode('intro', rect(1050, 130, 450, 100), content.intro, body(20)), ...itemNodes(ctx, content, rect(90, 300, 1420, 500), 3)]
      pageGenome = genome(ctx, id, 0.78, 'left', 'quiet', ['cards'])
      break
    case 'specimen-led':
      nodes = [kicker, ...visualNodes(ctx, content, rect(90, 150, 900, 620)), textNode('title', rect(1050, 150, 450, 130), content.title, heading(64), ink, 'shrink'), textNode('intro', rect(1050, 310, 420, 150), content.intro, body(22)), ...itemNodes(ctx, content, rect(1050, 500, 420, 270), 1)]
      pageGenome = genome(ctx, id, 0.56, 'asymmetric', 'quiet', ['specimen'])
      break
    case 'poster-field':
      background = brandPaint
      nodes = [{ t: 'device', id: 'angle-field', rect: rect(0, 0, W, H), kind: 'angle-field', params: { angle: ctx.deviceAngle ?? 24, spacing: 72, opacity: 0.08 } }, textNode('title', rect(80, 90, 1280, 220), content.title, heading(132), light, 'shrink'), textNode('intro', rect(85, 340, 760, 130), content.intro, body(27), light), ...visualNodes(ctx, content, rect(930, 380, 560, 340)), ...itemNodes(ctx, content, rect(80, 610, 760, 190), 3)]
      pageGenome = genome(ctx, id, 0.7, 'diagonal', 'flood', ['angle-field'])
      break
    case 'quiet-stack':
      nodes = [kicker, textNode('title', rect(260, 150, 1080, 150), content.title, heading(78), ink, 'shrink', 'center'), textNode('intro', rect(420, 320, 760, 100), content.intro, body(22), ink, 'wrap', 'center'), ...visualNodes(ctx, content, rect(430, 470, 740, 230)), ...itemNodes(ctx, content, rect(430, 730, 740, 90), 3)]
      pageGenome = genome(ctx, id, 0.24, 'center', 'quiet')
      break
    case 'rail-index':
      nodes = [{ t: 'frame', id: 'rail', rect: rect(0, 0, 300, H), fill: dark, children: [] }, textNode('rail-index', rect(50, 70, 200, 40), String(ctx.pageNo ?? 2).padStart(2, '0'), mono(24, 700), light, 'shrink'), textNode('title', rect(350, 90, 1120, 130), content.title, heading(76), ink, 'shrink'), textNode('intro', rect(350, 245, 700, 100), content.intro, body(22)), ...visualNodes(ctx, content, rect(350, 400, 560, 340)), ...itemNodes(ctx, content, rect(950, 400, 520, 340), 2)]
      pageGenome = genome(ctx, id, 0.62, 'left', 'split', ['index-rail'])
      break
  }

  return { kind: ctx.kind, width: W, height: H, background, nodes, genome: pageGenome }
}

export const INTERIOR_LAYOUTS: readonly InteriorLayoutId[] = ['editorial-split', 'modular-cards', 'specimen-led', 'poster-field', 'quiet-stack', 'rail-index']
export const INTERIOR_KINDS: readonly InteriorKind[] = ['principles', 'logo', 'clearspace', 'minsize', 'misuse', 'photo', 'colour', 'ramps', 'access', 'type', 'scale', 'mockups', 'voice', 'tokens', 'closing']

export function composeInteriorCandidates(ctx: InteriorContext): Page[] {
  return INTERIOR_LAYOUTS.map((layout) => composeLayout(ctx, layout))
}

export function interiorCompositionCount(_kind: InteriorKind) {
  return INTERIOR_LAYOUTS.length
}
