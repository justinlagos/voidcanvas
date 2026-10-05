import { colorSpecLine } from '@/studio/brand/export'
import { fmtOklch, luminance } from '@/studio/brand/color'
import type { Brand } from '@/studio/brand/tokens'
import type { Orientation } from '@/studio/brand-pages'
import type { Node, Page, Paint, TextNode } from './types'

export const BRAND_PAGE_SIZES = {
  landscape: { w: 1600, h: 900 },
  portrait: { w: 1240, h: 1754 },
} as const

export interface ComposeEnv {
  brand: Brand
  orientation: Orientation
  pageNo: number
  pageCount: number
  year?: number
  logoAspect?: number
}

const inkFor = (value: string) => luminance(value) < 0.45 ? '#ffffff' : '#0e0e12'
const hex = (value: string): Paint => ({ hex: value })

const text = (
  id: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  weight: number,
  color: Paint,
  options: Partial<Pick<TextNode, 'align' | 'baseline' | 'valign' | 'fit' | 'opacity' | 'source'>> & { role?: TextNode['style']['role']; lineHeight?: number } = {},
): TextNode => ({
  t: 'text',
  id,
  rect: { x, y, w, h },
  text: value,
  style: { role: options.role ?? 'body', size, weight, lineHeight: options.lineHeight },
  align: options.align ?? 'left',
  baseline: options.baseline ?? 'alphabetic',
  valign: options.valign,
  color,
  fit: options.fit ?? 'clip',
  opacity: options.opacity,
  source: options.source ?? 'system',
})

function sectionChrome(env: ComposeEnv, label: string): Node[] {
  const { brand: b, orientation: o, pageNo, pageCount } = env
  const { w, h } = BRAND_PAGE_SIZES[o]
  const m = b.grid.margin
  const labelSize = o === 'landscape' ? 20 : 22
  const footerSize = o === 'landscape' ? 18 : 20
  return [
    text(
      `${label}-section`,
      `${String(pageNo - 1).padStart(2, '0')}  ${label.toUpperCase()}`,
      m,
      m + 24,
      w - m * 2,
      32,
      labelSize,
      600,
      hex('#000000'),
      { opacity: 0.4, role: 'label' },
    ),
    {
      t: 'frame',
      id: `${label}-rule`,
      rect: { x: m, y: m + 44, w: w - m * 2, h: 1 },
      fill: hex('#000000'),
      opacity: 0.12,
      children: [],
    },
    text(
      `${label}-footer`,
      `${b.name} · Brand guidelines`,
      m,
      h - m * 0.5,
      w * 0.65,
      28,
      footerSize,
      500,
      hex('#000000'),
      { opacity: 0.35, role: 'caption' },
    ),
    text(
      `${label}-folio`,
      `${String(pageNo).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`,
      w - m - 180,
      h - m * 0.5,
      180,
      28,
      footerSize,
      500,
      hex('#000000'),
      { opacity: 0.35, role: 'caption', align: 'right' },
    ),
  ]
}

export function composeLegacyCover(env: ComposeEnv): Page {
  const { brand: b, orientation: o } = env
  const { w, h } = BRAND_PAGE_SIZES[o]
  const p0 = b.palette[0]
  const ink = inkFor(p0.hex)
  const m = b.grid.margin
  const nodes: Node[] = []

  if (b.direction === 'graphic') {
    nodes.push(
      { t: 'frame', id: 'cover-secondary-block', rect: { x: w * 0.66, y: 0, w: w * 0.34, h }, fill: hex(b.palette[1].hex), children: [] },
      { t: 'frame', id: 'cover-accent-block', rect: { x: w * 0.66, y: h * 0.62, w: w * 0.34, h: h * 0.38 }, fill: hex(b.accent), children: [] },
    )
  } else if (b.direction === 'systematic') {
    nodes.push({
      t: 'device',
      id: 'cover-grid',
      rect: { x: 0, y: 0, w, h },
      kind: 'grid-lines',
      params: {
        cols: b.grid.cols,
        margin: m,
        color: ink === '#ffffff' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      },
    })
  }

  nodes.push({
    t: 'logo',
    id: 'cover-logo',
    rect: { x: m, y: m, w: o === 'landscape' ? 120 : 150, h: o === 'landscape' ? 120 : 150 },
    version: 'auto',
    on: hex(p0.hex),
    clearSpace: false,
  })

  const eyebrowY = h * (o === 'landscape' ? 0.52 : 0.58)
  nodes.push(text('cover-eyebrow', 'BRAND GUIDELINES', m, eyebrowY, w * 0.6, 34, o === 'landscape' ? 22 : 26, 600, hex(ink), { opacity: 0.7, role: 'label' }))

  const titleY = h * (o === 'landscape' ? 0.68 : 0.72)
  const titleMax = w * (b.direction === 'graphic' ? 0.56 : 0.86) - m * 2
  const title = text('cover-title', b.name, m, titleY, titleMax, o === 'landscape' ? 170 : 150, o === 'landscape' ? 150 : 128, 700, hex(ink), { fit: 'shrink', role: 'display', source: 'designer' })
  title.style.shrinkStep = 4
  title.style.minimumSize = 44
  nodes.push(title)

  if (b.tagline) {
    nodes.push(text('cover-tagline', b.tagline, m, titleY + 60, w * 0.5, 150, o === 'landscape' ? 30 : 34, 400, hex(ink), { opacity: 0.85, role: 'body', fit: 'wrap', lineHeight: 1.5, source: 'designer', baseline: 'top' }))
  }

  nodes.push(text('cover-meta', `${b.personality} · ${env.year ?? new Date().getFullYear()}`, m, h - m * 0.7, w * 0.5, 30, o === 'landscape' ? 20 : 22, 500, hex(ink), { opacity: 0.6, role: 'caption' }))

  return {
    kind: 'cover',
    size: { w, h },
    background: hex(p0.hex),
    nodes,
    genome: {
      compositionId: 'legacy/cover/art-direction',
      grid: `${b.grid.cols}-column`,
      axis: 'left',
      margin: m,
      typeTreatment: 'legacy-cover',
      colourBlocking: b.direction,
      devices: b.direction === 'systematic' ? ['grid-lines'] : b.direction === 'graphic' ? ['colour-blocks'] : [],
      density: 0.35,
      parameters: { direction: b.direction },
    },
  }
}

export function composeLegacyColour(env: ComposeEnv): Page {
  const { brand: b, orientation: o } = env
  const { w, h } = BRAND_PAGE_SIZES[o]
  const m = b.grid.margin
  const top = m + 96
  const gap = b.grid.gutter
  const nodes = sectionChrome(env, 'Colour')

  const roleSpecs = (role: typeof b.roles[number], x: number, y: number, width: number, prefix: string) => {
    nodes.push(text(`${prefix}-name`, role.name, x, y, width, 34, o === 'landscape' ? 26 : 30, 700, { role: 'ink' }, { role: 'heading' }))
    nodes.push(text(`${prefix}-usage`, role.usage, x, y + 32, width, 72, o === 'landscape' ? 17 : 20, 400, hex('#000000'), { opacity: 0.55, role: 'body', fit: 'wrap', lineHeight: 1.4, baseline: 'top' }))
    const specLines = [`HEX ${role.hex.toUpperCase()}`, fmtOklch(role.hex), ...colorSpecLine(role.hex).split('   ')]
    specLines.forEach((line, index) => nodes.push(text(`${prefix}-spec-${index}`, line, x, y + 105 + index * (o === 'landscape' ? 26 : 30), width, 24, o === 'landscape' ? 16 : 19, 500, { role: 'ink' }, { role: 'mono' })))
  }

  if (o === 'landscape') {
    const cw = (w - m * 2 - gap * 2) / 3
    const sh = 300
    b.roles.forEach((role, index) => {
      const x = m + index * (cw + gap)
      nodes.push({ t: 'frame', id: `colour-${role.id}-swatch`, rect: { x, y: top, w: cw, h: sh }, fill: hex(role.hex), radius: Math.min(b.radius, 24), children: [] })
      nodes.push(text(`colour-${role.id}-sample`, `Aa ${role.name}`, x + 24, top + sh - 26, cw - 48, 24, 20, 600, hex(role.ink), { role: 'label' }))
      roleSpecs(role, x, top + sh + 48, cw, `colour-${role.id}`)
    })
  } else {
    const sw = (w - m * 2) * 0.42
    const sh = 300
    b.roles.forEach((role, index) => {
      const y = top + index * (sh + 56)
      nodes.push({ t: 'frame', id: `colour-${role.id}-swatch`, rect: { x: m, y, w: sw, h: sh }, fill: hex(role.hex), radius: Math.min(b.radius, 24), children: [] })
      nodes.push(text(`colour-${role.id}-sample`, `Aa ${role.name}`, m + 24, y + sh - 26, sw - 48, 26, 22, 600, hex(role.ink), { role: 'label' }))
      roleSpecs(role, m + sw + gap * 1.5, y + 34, w - m * 2 - sw - gap * 1.5, `colour-${role.id}`)
    })
  }

  const barH = o === 'landscape' ? 34 : 44
  const barY = h - m * 1.25 - barH
  nodes.push({
    t: 'device',
    id: 'colour-usage-ratio',
    rect: { x: m, y: barY, w: w - m * 2, h: barH },
    kind: 'usage-ratio',
    params: {
      label: 'Usage ratio',
      note: 'CMYK values are approximate. Confirm against a printed proof.',
      headingSize: o === 'landscape' ? 20 : 24,
      fontSize: 15,
      labelY: barY - 16,
    },
  })

  return {
    kind: 'colour',
    size: { w, h },
    background: { role: 'paper' },
    nodes,
    genome: {
      compositionId: 'legacy/colour/specs',
      grid: `${b.grid.cols}-column`,
      axis: 'left',
      margin: m,
      typeTreatment: 'specs',
      colourBlocking: 'role-swatches',
      devices: ['usage-ratio'],
      density: 0.65,
    },
  }
}

export function composeLegacyClearSpace(env: ComposeEnv): Page {
  const { brand: b, orientation: o } = env
  const { w, h } = BRAND_PAGE_SIZES[o]
  const m = b.grid.margin
  const top = m + 90
  const panelW = o === 'landscape' ? w * 0.58 - m : w - m * 2
  const panelH = o === 'landscape' ? h - top - m * 1.3 : h * 0.44
  const px = m
  const py = top
  const cs = b.logo.clearSpace
  const ar = env.logoAspect ?? 1
  const maxH = Math.min(panelH * 0.7 / (1 + 2 * cs), (panelW * 0.8) / (ar + 2 * cs))
  const mh = maxH
  const mw = mh * ar
  const u = mh * cs
  const mx = px + (panelW - mw) / 2
  const my = py + (panelH - mh) / 2
  const zx = mx - u
  const zy = my - u
  const zw = mw + u * 2
  const zh = mh + u * 2
  const nodes = sectionChrome(env, 'Clear space')

  nodes.push({
    t: 'frame',
    id: 'clearspace-blueprint-panel',
    rect: { x: px, y: py, w: panelW, h: panelH },
    fill: { role: 'neutral', step: 50 },
    radius: 12,
    clip: true,
    children: [
      { t: 'device', id: 'clearspace-grid', rect: { x: px, y: py, w: panelW, h: panelH }, kind: 'fine-grid', params: { spacing: 20, color: 'rgba(0,0,0,0.05)' } },
      { t: 'device', id: 'clearspace-hatch', rect: { x: zx, y: zy, w: zw, h: zh }, kind: 'hatch-zone', params: { innerX: mx, innerY: my, innerW: mw, innerH: mh, step: 12, opacity: 0.55 } },
      { t: 'logo', id: 'clearspace-logo', rect: { x: mx, y: my, w: mw, h: mh }, version: 'auto', on: { role: 'neutral', step: 50 }, clearSpace: true, demo: 'clearspace' },
      { t: 'device', id: 'clearspace-zone-boundary', rect: { x: zx, y: zy, w: zw, h: zh }, kind: 'dashed-box', params: { color: b.roles[0].ramp[600], lineWidth: 1.5, dash: '8,6' } },
      { t: 'device', id: 'clearspace-mark-boundary', rect: { x: mx, y: my, w: mw, h: mh }, kind: 'dashed-box', params: { color: 'rgba(0,0,0,0.35)', lineWidth: 1, dash: '' } },
    ],
  })

  const unitSize = Math.max(14, Math.min(28, u * 0.5))
  const units = [
    { id: 'top', x: mx + mw / 2 - u / 2, y: zy },
    { id: 'bottom', x: mx + mw / 2 - u / 2, y: my + mh },
    { id: 'left', x: zx, y: my + mh / 2 - u / 2 },
    { id: 'right', x: mx + mw, y: my + mh / 2 - u / 2 },
  ]
  for (const unit of units) {
    nodes.push({ t: 'frame', id: `clearspace-unit-${unit.id}`, rect: { x: unit.x, y: unit.y, w: u, h: u }, fill: hex(b.roles[0].hex), opacity: 0.18, children: [] })
    nodes.push(text(`clearspace-unit-${unit.id}-label`, 'x', unit.x, unit.y + u / 2, u, u, unitSize, 600, hex(b.roles[0].ramp[800]), { role: 'heading', align: 'center', baseline: 'middle' }))
  }
  nodes.push({ t: 'device', id: 'clearspace-height-dimension', rect: { x: zx + zw + 22, y: my, w: 1, h: mh }, kind: 'dimension-h', params: { label: 'H' } })

  const rx = o === 'landscape' ? px + panelW + b.grid.gutter * 2 : m
  const rw = o === 'landscape' ? w - m - rx : w - m * 2
  let ry = o === 'landscape' ? top + 24 : py + panelH + 70
  const titleSize = o === 'landscape' ? 26 : 30
  const bodySize = o === 'landscape' ? 18 : 21
  const frac = cs === 0.25 ? 'a quarter of' : cs === 0.5 ? 'half' : cs === 1 ? 'the full' : `${cs} ×`
  const source = b.logo.sources.clearSpace === 'designer' ? 'Set by the brand.' : 'Suggested from the shape of the mark; confirm it with the client.'
  nodes.push(text('clearspace-rule-title', 'Clear space', rx, ry, rw, 34, titleSize, 700, { role: 'ink' }, { role: 'heading' }))
  ry += 36
  const ruleBody = `x equals ${frac} the height of the mark (H). Keep at least x clear on every side. Nothing enters the hatched zone: text, images, other logos or the edge of the page. ${source}`
  const ruleLines = Math.max(3, Math.ceil(ruleBody.length / Math.max(25, Math.floor(rw / (bodySize * 0.55)))))
  nodes.push(text('clearspace-rule-body', ruleBody, rx, ry, rw, ruleLines * bodySize * 1.5, bodySize, 400, hex('#000000'), { opacity: 0.6, fit: 'wrap', baseline: 'top', lineHeight: 1.5, source: b.logo.sources.clearSpace === 'designer' ? 'designer' : 'suggested' }))
  ry += ruleLines * bodySize * 1.5 + 30

  const exW = (rw - 20) / 2
  const exH = Math.min(o === 'landscape' ? 150 : 200, h - ry - m * 1.6)
  if (exH > 80) {
    const lh = exH * 0.34
    const lw = lh * ar
    const correctX = rx
    const badX = rx + exW + 20
    const example = (id: string, x: number, bad: boolean) => {
      nodes.push({ t: 'frame', id: `${id}-panel`, rect: { x, y: ry, w: exW, h: exH }, fill: bad ? { hex: b.semantic[2].ramp[50] } : { hex: b.semantic[0].ramp[50] }, radius: 10, children: [] })
      const lx = bad ? x + 16 : x + exW * 0.5 - lw / 2
      const ly = ry + exH * 0.5 - lh / 2
      nodes.push({ t: 'logo', id: `${id}-logo`, rect: { x: lx, y: ly, w: lw, h: lh }, version: 'auto', on: bad ? { hex: b.semantic[2].ramp[50] } : { hex: b.semantic[0].ramp[50] }, clearSpace: !bad, demo: 'clearspace' })
      if (bad) {
        nodes.push(text(`${id}-crowding`, b.name || 'Headline', lx + lw + 6, ly + lh * 0.72, Math.max(10, exW - lw - 24), lh, Math.round(lh * 0.55), 700, { role: 'ink' }, { role: 'heading', fit: 'shrink' }))
      } else {
        nodes.push({ t: 'device', id: `${id}-boundary`, rect: { x: lx - lh * cs, y: ly - lh * cs, w: lw + lh * cs * 2, h: lh + lh * cs * 2 }, kind: 'dashed-box', params: { color: b.semantic[0].ramp[400], lineWidth: 1, dash: '5,4' } })
      }
      nodes.push(text(`${id}-label`, bad ? 'Incorrect: crowded' : 'Correct', x + 12, ry + exH - 12, exW - 24, 22, 14, 600, bad ? { hex: b.semantic[2].ramp[700] } : { hex: b.semantic[0].ramp[700] }, { role: 'label' }))
    }
    example('clearspace-correct', correctX, false)
    example('clearspace-incorrect', badX, true)
  }

  return {
    kind: 'clearspace',
    size: { w, h },
    background: { role: 'paper' },
    nodes,
    genome: {
      compositionId: 'legacy/clearspace/blueprint',
      grid: `${b.grid.cols}-column`,
      axis: o === 'landscape' ? 'asymmetric' : 'left',
      margin: m,
      typeTreatment: 'blueprint-and-rule',
      colourBlocking: 'neutral-panel',
      devices: ['fine-grid', 'hatch-zone', 'dimension-h'],
      density: 0.55,
      parameters: { clearSpace: cs, logoAspect: ar },
    },
  }
}

export function composePhase1Page(kind: 'cover' | 'colour' | 'clearspace', env: ComposeEnv) {
  if (kind === 'cover') return composeLegacyCover(env)
  if (kind === 'colour') return composeLegacyColour(env)
  return composeLegacyClearSpace(env)
}
