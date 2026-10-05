import { colorSpecLine } from '@/studio/brand/export'
import { fmtOklch, luminance } from '@/studio/brand/color'
import type { Brand } from '@/studio/brand/tokens'
import type { Orientation } from '@/studio/brand-pages'
import type { Node, Page, Paint, TextNode } from './types'

export const BRAND_PAGE_SIZES = {
  landscape: { w: 1600, h: 900 },
  portrait: { w: 1240, h: 1754 },
} as const

interface ComposeEnv {
  brand: Brand
  orientation: Orientation
  pageNo: number
  pageCount: number
  year?: number
}

const inkFor = (hex: string) => luminance(hex) < 0.45 ? '#ffffff' : '#0e0e12'
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

export function composePhase1Page(kind: 'cover' | 'colour', env: ComposeEnv) {
  return kind === 'cover' ? composeLegacyCover(env) : composeLegacyColour(env)
}
