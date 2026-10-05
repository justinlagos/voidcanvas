import { colorSpecLine } from '@/studio/brand/export'
import { fmtOklch, luminance } from '@/studio/brand/color'
import type { Brand } from '@/studio/brand/tokens'
import type { Node, Page, PageGenome, Paint } from './types'

export type GuideOrientation = 'landscape' | 'portrait'

const SIZE = {
  landscape: { w: 1600, h: 900 },
  portrait: { w: 1240, h: 1754 },
} as const

export interface CompatibilityPageContext {
  brand: Brand
  orientation: GuideOrientation
  pageNo: number
  pageCount: number
  logoAspect?: number
  year?: number
}

const direct = (hex: string, alpha?: number): Paint => ({ hex, alpha })
const inkFor = (hex: string) => (luminance(hex) < 0.45 ? '#ffffff' : '#0e0e12')

function genome(compositionId: string, b: Brand, extra: Partial<PageGenome> = {}): PageGenome {
  return {
    compositionId,
    grid: `${b.grid.cols}-column`,
    axis: 'left',
    marginRatio: 0,
    typeTreatment: 'compatibility',
    colourBlocking: 'legacy-parity',
    devices: [],
    density: 0.5,
    parameters: {},
    ...extra,
  }
}

function sectionHeader(
  c: CompatibilityPageContext,
  label: string,
  color = 'rgba(0,0,0,0.4)',
): Node[] {
  const { brand: b, orientation: o, pageNo } = c
  const { w } = SIZE[o]
  const m = b.grid.margin
  return [
    {
      t: 'text',
      id: 'section-label',
      rect: { x: m, y: m, w: w - m * 2, h: 32 },
      style: { family: 'body', size: o === 'landscape' ? 20 : 22, weight: 600, lineHeight: 1.2 },
      text: `${String(pageNo - 1).padStart(2, '0')}  ${label.toUpperCase()}`,
      align: 'left',
      color: direct(color),
      fit: 'shrink',
      source: 'suggested',
    },
    {
      t: 'frame',
      id: 'section-rule',
      rect: { x: m, y: m + 44, w: w - m * 2, h: 1 },
      fill: direct('rgba(0,0,0,0.12)'),
      children: [],
    },
  ]
}

function footer(c: CompatibilityPageContext, dark = false): Node[] {
  const { brand: b, orientation: o, pageNo, pageCount } = c
  const { w, h } = SIZE[o]
  const m = b.grid.margin
  const color = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'
  const size = o === 'landscape' ? 18 : 20
  return [
    {
      t: 'text',
      id: 'footer-name',
      rect: { x: m, y: h - m * 0.72, w: w * 0.6, h: 30 },
      style: { family: 'body', size, weight: 500, lineHeight: 1.2 },
      text: `${b.name} · Brand guidelines`,
      align: 'left',
      color: direct(color),
      fit: 'shrink',
      source: 'suggested',
    },
    {
      t: 'text',
      id: 'footer-page',
      rect: { x: w * 0.62, y: h - m * 0.72, w: w - m - w * 0.62, h: 30 },
      style: { family: 'body', size, weight: 500, lineHeight: 1.2 },
      text: `${String(pageNo).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`,
      align: 'right',
      color: direct(color),
      fit: 'shrink',
      source: 'suggested',
    },
  ]
}

export function composeCover(c: CompatibilityPageContext): Page {
  const { brand: b, orientation: o } = c
  const { w, h } = SIZE[o]
  const p0 = b.palette[0]
  const coverInk = inkFor(p0.hex)
  const m = b.grid.margin
  const nodes: Node[] = []

  if (b.direction === 'graphic') {
    nodes.push(
      {
        t: 'frame',
        id: 'graphic-secondary',
        rect: { x: w * 0.66, y: 0, w: w * 0.34, h },
        fill: direct(b.palette[1].hex),
        children: [],
      },
      {
        t: 'frame',
        id: 'graphic-accent',
        rect: { x: w * 0.66, y: h * 0.62, w: w * 0.34, h: h * 0.38 },
        fill: direct(b.accent),
        children: [],
      },
    )
  } else if (b.direction === 'systematic') {
    for (let i = 1; i < b.grid.cols; i++) {
      const gx = m + ((w - m * 2) / b.grid.cols) * i
      nodes.push({
        t: 'frame',
        id: `grid-${i}`,
        rect: { x: gx, y: 0, w: 1, h },
        fill: direct(coverInk, 0.12),
        children: [],
      })
    }
  }

  nodes.push(
    {
      t: 'logo',
      id: 'primary-logo',
      rect: {
        x: m,
        y: m,
        w: o === 'landscape' ? 120 : 150,
        h: o === 'landscape' ? 120 : 150,
      },
      version: 'auto',
      on: direct(p0.hex),
      clearSpace: false,
    },
    {
      t: 'text',
      id: 'cover-eyebrow',
      rect: {
        x: m,
        y: h * (o === 'landscape' ? 0.52 : 0.58) - (o === 'landscape' ? 26 : 31),
        w: w * 0.5,
        h: 40,
      },
      style: { family: 'body', size: o === 'landscape' ? 22 : 26, weight: 600, lineHeight: 1.2 },
      text: 'BRAND GUIDELINES',
      align: 'left',
      color: direct(coverInk, 0.7),
      fit: 'shrink',
      source: 'suggested',
    },
    {
      t: 'text',
      id: 'brand-name',
      rect: {
        x: m,
        y: h * (o === 'landscape' ? 0.68 : 0.72) - (o === 'landscape' ? 160 : 138),
        w: w * (b.direction === 'graphic' ? 0.56 : 0.86) - m * 2,
        h: o === 'landscape' ? 180 : 160,
      },
      style: { family: 'heading', size: o === 'landscape' ? 150 : 128, weight: 700, lineHeight: 1.02 },
      text: b.name,
      align: 'left',
      color: direct(coverInk),
      fit: 'shrink',
      maxLines: 1,
      source: 'designer',
    },
  )

  if (b.tagline) {
    nodes.push({
      t: 'text',
      id: 'tagline',
      rect: {
        x: m,
        y: h * (o === 'landscape' ? 0.68 : 0.72) + 28,
        w: w * 0.5,
        h: o === 'landscape' ? 100 : 130,
      },
      style: { family: 'body', size: o === 'landscape' ? 30 : 34, weight: 400, lineHeight: 1.5 },
      text: b.tagline,
      align: 'left',
      color: direct(coverInk, 0.85),
      fit: 'wrap',
      source: 'designer',
    })
  }

  nodes.push({
    t: 'text',
    id: 'cover-meta',
    rect: { x: m, y: h - m * 0.92, w: w * 0.6, h: 32 },
    style: { family: 'body', size: o === 'landscape' ? 20 : 22, weight: 500, lineHeight: 1.2 },
    text: `${b.personality} · ${c.year ?? new Date().getFullYear()}`,
    align: 'left',
    color: direct(coverInk, 0.6),
    fit: 'shrink',
    source: 'suggested',
  })

  return {
    kind: 'cover',
    width: w,
    height: h,
    background: direct(p0.hex),
    nodes,
    genome: genome(`compat-cover-${b.direction}`, b, {
      colourBlocking: b.direction,
      devices: b.direction === 'systematic' ? ['grid'] : b.direction === 'graphic' ? ['colour-block'] : [],
      density: 0.32,
    }),
  }
}

export function composeColour(c: CompatibilityPageContext): Page {
  const { brand: b, orientation: o } = c
  const { w, h } = SIZE[o]
  const m = b.grid.margin
  const gap = b.grid.gutter
  const top = m + 96
  const nodes: Node[] = [...sectionHeader(c, 'Colour')]

  const addSpecs = (role: Brand['roles'][number], x: number, y: number, width: number) => {
    nodes.push(
      {
        t: 'text',
        id: `colour-${role.id}-name`,
        rect: { x, y: y - 28, w: width, h: 38 },
        style: { family: 'heading', size: o === 'landscape' ? 26 : 30, weight: 700, lineHeight: 1.2 },
        text: role.name,
        align: 'left',
        color: { role: 'ink' },
        fit: 'shrink',
        source: 'suggested',
      },
      {
        t: 'text',
        id: `colour-${role.id}-usage`,
        rect: { x, y: y + 12, w: width, h: o === 'landscape' ? 74 : 92 },
        style: { family: 'body', size: o === 'landscape' ? 17 : 20, weight: 400, lineHeight: 1.4 },
        text: role.usage,
        align: 'left',
        color: direct('#000000', 0.55),
        fit: 'wrap',
        source: 'suggested',
      },
      {
        t: 'text',
        id: `colour-${role.id}-specs`,
        rect: { x, y: y + (o === 'landscape' ? 94 : 116), w: width, h: o === 'landscape' ? 110 : 130 },
        style: { family: 'mono', size: o === 'landscape' ? 16 : 19, weight: 500, lineHeight: 1.55 },
        text: [`HEX ${role.hex.toUpperCase()}`, fmtOklch(role.hex), ...colorSpecLine(role.hex).split('   ')].join('\n'),
        align: 'left',
        color: { role: 'ink' },
        fit: 'shrink',
        source: 'detected',
      },
    )
  }

  if (o === 'landscape') {
    const cw = (w - m * 2 - gap * 2) / 3
    const sh = 300
    b.roles.forEach((role, i) => {
      const x = m + i * (cw + gap)
      nodes.push(
        {
          t: 'swatch',
          id: `colour-${role.id}-swatch`,
          rect: { x, y: top, w: cw, h: sh },
          role: role.id,
          paint: direct(role.hex),
          specs: ['hex', 'rgb', 'cmyk', 'oklch', 'token'],
        },
        {
          t: 'text',
          id: `colour-${role.id}-sample`,
          rect: { x: x + 24, y: top + sh - 52, w: cw - 48, h: 32 },
          style: { family: 'body', size: 20, weight: 600, lineHeight: 1.2 },
          text: `Aa ${role.name}`,
          align: 'left',
          color: direct(role.ink),
          fit: 'shrink',
          source: 'suggested',
        },
      )
      addSpecs(role, x, top + sh + 48, cw)
    })
  } else {
    const sw = (w - m * 2) * 0.42
    const sh = 300
    b.roles.forEach((role, i) => {
      const y = top + i * (sh + 56)
      nodes.push(
        {
          t: 'swatch',
          id: `colour-${role.id}-swatch`,
          rect: { x: m, y, w: sw, h: sh },
          role: role.id,
          paint: direct(role.hex),
          specs: ['hex', 'rgb', 'cmyk', 'oklch', 'token'],
        },
        {
          t: 'text',
          id: `colour-${role.id}-sample`,
          rect: { x: m + 24, y: y + sh - 52, w: sw - 48, h: 32 },
          style: { family: 'body', size: 22, weight: 600, lineHeight: 1.2 },
          text: `Aa ${role.name}`,
          align: 'left',
          color: direct(role.ink),
          fit: 'shrink',
          source: 'suggested',
        },
      )
      addSpecs(role, m + sw + gap * 1.5, y + 34, w - m * 2 - sw - gap * 1.5)
    })
  }

  const barH = o === 'landscape' ? 34 : 44
  const barY = h - m * 1.25 - barH
  nodes.push(
    {
      t: 'text',
      id: 'usage-label',
      rect: { x: m, y: barY - 42, w: w * 0.35, h: 30 },
      style: { family: 'heading', size: o === 'landscape' ? 20 : 24, weight: 700, lineHeight: 1.2 },
      text: 'Usage ratio',
      align: 'left',
      color: { role: 'ink' },
      fit: 'shrink',
      source: 'suggested',
    },
    {
      t: 'text',
      id: 'print-note',
      rect: { x: w * 0.5, y: barY - 40, w: w - m - w * 0.5, h: 28 },
      style: { family: 'body', size: 14, weight: 400, lineHeight: 1.2 },
      text: 'CMYK values are approximate. Confirm against a printed proof.',
      align: 'right',
      color: direct('#000000', 0.4),
      fit: 'shrink',
      source: 'suggested',
    },
  )

  let x = m
  const barW = w - m * 2
  b.ratios.forEach((ratio, index) => {
    const width = (ratio.pct / 100) * barW
    nodes.push(
      {
        t: 'frame',
        id: `usage-${index}`,
        rect: { x, y: barY, w: width, h: barH },
        fill: direct(ratio.hex),
        children: [],
      },
      ...(width > 34
        ? ([{
            t: 'text' as const,
            id: `usage-${index}-text`,
            rect: { x: x + 6, y: barY + 5, w: Math.max(0, width - 12), h: barH - 8 },
            style: { family: 'body' as const, size: 15, weight: 600, lineHeight: 1.2 },
            text: width > 70 ? `${ratio.name} ${ratio.pct}%` : `${ratio.pct}%`,
            align: 'left' as const,
            color: direct(inkFor(ratio.hex)),
            fit: 'shrink' as const,
            source: 'suggested' as const,
          }] satisfies Node[])
        : []),
    )
    x += width
  })

  nodes.push(...footer(c))
  return {
    kind: 'colour',
    width: w,
    height: h,
    background: direct('#ffffff'),
    nodes,
    genome: genome('compat-colour-specs', b, { density: 0.72 }),
  }
}

export function composeClearSpace(c: CompatibilityPageContext): Page {
  const { brand: b, orientation: o } = c
  const { w, h } = SIZE[o]
  const m = b.grid.margin
  const top = m + 90
  const panelW = o === 'landscape' ? w * 0.58 - m : w - m * 2
  const panelH = o === 'landscape' ? h - top - m * 1.3 : h * 0.44
  const aspect = Math.max(0.1, c.logoAspect ?? 1)
  const cs = b.logo.clearSpace
  const markH = Math.min(panelH * 0.7 / (1 + 2 * cs), (panelW * 0.8) / (aspect + 2 * cs))
  const markW = markH * aspect
  const unit = markH * cs
  const markX = m + (panelW - markW) / 2
  const markY = top + (panelH - markH) / 2
  const zone = { x: markX - unit, y: markY - unit, w: markW + unit * 2, h: markH + unit * 2 }
  const nodes: Node[] = [
    ...sectionHeader(c, 'Clear space'),
    {
      t: 'frame',
      id: 'blueprint-panel',
      rect: { x: m, y: top, w: panelW, h: panelH },
      fill: { role: 'neutral', step: 50 },
      radius: 12,
      clip: true,
      children: [
        {
          t: 'device',
          id: 'blueprint-grid',
          rect: { x: m, y: top, w: panelW, h: panelH },
          kind: 'blueprint-grid',
          params: { step: 20 },
        },
        {
          t: 'device',
          id: 'clearspace-zone',
          rect: zone,
          kind: 'clearspace-zone',
          params: { unit, markX, markY, markW, markH },
        },
        {
          t: 'logo',
          id: 'clearspace-logo',
          rect: { x: markX, y: markY, w: markW, h: markH },
          version: 'auto',
          on: { role: 'neutral', step: 50 },
          clearSpace: false,
          demo: 'clearspace',
        },
      ],
    },
  ]

  const rx = o === 'landscape' ? m + panelW + b.grid.gutter * 2 : m
  const rw = o === 'landscape' ? w - m - rx : w - m * 2
  const ry = o === 'landscape' ? top + 24 : top + panelH + 70
  const fraction = cs === 0.25 ? 'a quarter of' : cs === 0.5 ? 'half' : cs === 1 ? 'the full' : `${cs} ×`
  const source = b.logo.sources.clearSpace === 'designer' ? 'Set by the brand.' : 'Suggested from the shape of the mark; confirm it with the client.'

  nodes.push(
    {
      t: 'text',
      id: 'clearspace-title',
      rect: { x: rx, y: ry - 28, w: rw, h: 38 },
      style: { family: 'heading', size: o === 'landscape' ? 26 : 30, weight: 700, lineHeight: 1.2 },
      text: 'Clear space',
      align: 'left',
      color: { role: 'ink' },
      fit: 'shrink',
      source: 'suggested',
    },
    {
      t: 'text',
      id: 'clearspace-rule-copy',
      rect: { x: rx, y: ry + 8, w: rw, h: o === 'landscape' ? 170 : 210 },
      style: { family: 'body', size: o === 'landscape' ? 18 : 21, weight: 400, lineHeight: 1.5 },
      text: `x equals ${fraction} the height of the mark (H). Keep at least x clear on every side. Nothing enters the hatched zone: text, images, other logos or the edge of the page. ${source}`,
      align: 'left',
      color: direct('#000000', 0.6),
      fit: 'shrink',
      source: b.logo.sources.clearSpace === 'designer' ? 'designer' : 'recommended',
    },
    {
      t: 'device',
      id: 'clearspace-examples',
      rect: {
        x: rx,
        y: ry + (o === 'landscape' ? 210 : 250),
        w: rw,
        h: o === 'landscape' ? 150 : 200,
      },
      kind: 'clearspace-examples',
      params: { logoAspect: aspect, clearSpace: cs, name: b.name },
    },
    ...footer(c),
  )

  return {
    kind: 'clearspace',
    width: w,
    height: h,
    background: direct('#ffffff'),
    nodes,
    genome: genome('compat-clearspace-blueprint', b, {
      devices: ['blueprint-grid', 'clearspace-zone', 'clearspace-examples'],
      density: 0.58,
    }),
  }
}

export function composeCompatibilityPage(
  kind: 'cover' | 'colour' | 'clearspace',
  context: CompatibilityPageContext,
) {
  if (kind === 'cover') return composeCover(context)
  if (kind === 'colour') return composeColour(context)
  return composeClearSpace(context)
}
