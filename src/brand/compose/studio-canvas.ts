import { placeOn } from '@/lib/intelligence/backgrounds'
import {
  MODE_OF,
  NO_DECISIONS,
  grayMark,
  logoPlacements,
  logoVariants,
  markContrast,
  monoMark,
  type LogoDecisions,
  type LogoInfo,
  type MarkMode,
} from '@/studio/brand/logo'
import { contrast, luminance } from '@/studio/brand/color'
import type { Brand } from '@/studio/brand/tokens'
import { resolvePaint } from './paint'
import type { CanvasPaintHooks } from './paint-canvas'
import type { DeviceNode, LogoNode } from './types'

const monoCache = new WeakMap<LogoInfo, Map<string, HTMLCanvasElement>>()

function monoOf(info: LogoInfo, hex: string) {
  let variants = monoCache.get(info)
  if (!variants) {
    variants = new Map()
    monoCache.set(info, variants)
  }
  if (!variants.has(hex)) variants.set(hex, monoMark(info, hex))
  return variants.get(hex)!
}

function markCanvas(info: LogoInfo, brand: Brand, mode: MarkMode) {
  if (mode === 'original') return info.img
  if (mode === 'grayscale') return grayMark(info)
  return monoOf(
    info,
    mode === 'white'
      ? '#ffffff'
      : mode === 'brand'
        ? brand.roles[0].hex
        : brand.surfaces.inkOnLight,
  )
}

function autoMode(
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
  background: string,
): MarkMode {
  if (!logo) {
    if (markContrast(null, brand.roles[0].hex, background) >= 3) return 'original'
    return contrast('#ffffff', background) >= contrast(brand.surfaces.inkOnLight, background)
      ? 'white'
      : 'dark'
  }
  const decided = logoPlacements(brand, logo, decisions).find(
    (placement) =>
      placement.bg.toLowerCase() === background.toLowerCase() && placement.designer,
  )
  if (decided) return decided.mode
  const variants = logoVariants(brand, logo, decisions).map((variant) => ({
    id: variant.id,
    valid: variant.valid,
    profile: variant.profile,
  }))
  return MODE_OF[
    placeOn(
      { id: 'surface', name: '', hex: background, group: 'neutral' },
      variants,
    ).use
  ]
}

function logoMode(
  node: LogoNode,
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
) {
  if (node.version === 'auto')
    return autoMode(brand, logo, decisions, resolvePaint(node.on, brand))
  return MODE_OF[node.version as keyof typeof MODE_OF] ?? 'original'
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  node: LogoNode,
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
) {
  const mode = logoMode(node, brand, logo, decisions)
  if (logo) {
    const scale = node.contain === false
      ? Math.max(node.rect.w / logo.width, node.rect.h / logo.height)
      : Math.min(node.rect.w / logo.width, node.rect.h / logo.height)
    const w = logo.width * scale
    const h = logo.height * scale
    const x = node.rect.x + (node.rect.w - w) / 2
    const y = node.rect.y + (node.rect.h - h) / 2
    ctx.drawImage(markCanvas(logo, brand, mode), x, y, w, h)
    return
  }
  const r = Math.min(node.rect.w, node.rect.h) * 0.32
  const fill = mode === 'white'
    ? '#ffffff'
    : mode === 'dark'
      ? brand.surfaces.inkOnLight
      : resolvePaint(node.on, brand)
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(node.rect.x + node.rect.w / 2, node.rect.y + node.rect.h / 2, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = mode === 'original'
    ? fill === brand.roles[0].hex
      ? '#ffffff'
      : brand.roles[0].hex
    : mode === 'white'
      ? brand.roles[0].hex
      : '#ffffff'
  ctx.font = `700 ${r}px "${brand.fonts.heading.family}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    (brand.name[0] || 'B').toUpperCase(),
    node.rect.x + node.rect.w / 2,
    node.rect.y + node.rect.h / 2 + r * 0.04,
  )
}

function gridLines(ctx: CanvasRenderingContext2D, node: DeviceNode) {
  const cols = Number(node.params.cols ?? 12)
  const margin = Number(node.params.margin ?? 0)
  const color = String(node.params.color ?? 'rgba(0,0,0,0.12)')
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  for (let i = 1; i < cols; i++) {
    const x = node.rect.x + margin + ((node.rect.w - margin * 2) / cols) * i
    ctx.beginPath()
    ctx.moveTo(x, node.rect.y)
    ctx.lineTo(x, node.rect.y + node.rect.h)
    ctx.stroke()
  }
}

function fineGrid(ctx: CanvasRenderingContext2D, node: DeviceNode) {
  const spacing = Number(node.params.spacing ?? 20)
  ctx.strokeStyle = String(node.params.color ?? 'rgba(0,0,0,0.05)')
  ctx.lineWidth = Number(node.params.lineWidth ?? 1)
  for (let x = node.rect.x; x < node.rect.x + node.rect.w; x += spacing) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, node.rect.y)
    ctx.lineTo(x + 0.5, node.rect.y + node.rect.h)
    ctx.stroke()
  }
  for (let y = node.rect.y; y < node.rect.y + node.rect.h; y += spacing) {
    ctx.beginPath()
    ctx.moveTo(node.rect.x, y + 0.5)
    ctx.lineTo(node.rect.x + node.rect.w, y + 0.5)
    ctx.stroke()
  }
}

function hatchZone(ctx: CanvasRenderingContext2D, node: DeviceNode, brand: Brand) {
  const innerX = Number(node.params.innerX)
  const innerY = Number(node.params.innerY)
  const innerW = Number(node.params.innerW)
  const innerH = Number(node.params.innerH)
  const step = Number(node.params.step ?? 12)
  ctx.save()
  ctx.beginPath()
  ctx.rect(node.rect.x, node.rect.y, node.rect.w, node.rect.h)
  ctx.rect(innerX, innerY, innerW, innerH)
  ctx.clip('evenodd')
  ctx.strokeStyle = String(node.params.color ?? brand.roles[0].ramp[300])
  ctx.globalAlpha *= Number(node.params.opacity ?? 0.55)
  ctx.lineWidth = Number(node.params.lineWidth ?? 1.5)
  for (let d = -node.rect.h; d < node.rect.w + node.rect.h; d += step) {
    ctx.beginPath()
    ctx.moveTo(node.rect.x + d, node.rect.y)
    ctx.lineTo(node.rect.x + d - node.rect.h, node.rect.y + node.rect.h)
    ctx.stroke()
  }
  ctx.restore()
}

function dashedBox(ctx: CanvasRenderingContext2D, node: DeviceNode) {
  ctx.strokeStyle = String(node.params.color ?? 'rgba(0,0,0,0.35)')
  ctx.lineWidth = Number(node.params.lineWidth ?? 1)
  const dash = String(node.params.dash ?? '')
    .split(',')
    .map(Number)
    .filter(Number.isFinite)
  ctx.setLineDash(dash)
  ctx.strokeRect(node.rect.x, node.rect.y, node.rect.w, node.rect.h)
  ctx.setLineDash([])
}

function dimensionH(ctx: CanvasRenderingContext2D, node: DeviceNode, brand: Brand) {
  const x = node.rect.x
  const y = node.rect.y
  const h = node.rect.h
  ctx.strokeStyle = String(node.params.color ?? 'rgba(0,0,0,0.45)')
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + h)
  ctx.moveTo(x - 6, y)
  ctx.lineTo(x + 6, y)
  ctx.moveTo(x - 6, y + h)
  ctx.lineTo(x + 6, y + h)
  ctx.stroke()
  ctx.fillStyle = String(node.params.textColor ?? 'rgba(0,0,0,0.6)')
  ctx.font = `500 14px "${brand.fonts.mono.family}"`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(String(node.params.label ?? 'H'), x + 10, y + h / 2 + 5)
}

function ratioBar(ctx: CanvasRenderingContext2D, node: DeviceNode, brand: Brand) {
  const bar = node.rect
  const label = String(node.params.label ?? 'Usage ratio')
  const note = String(node.params.note ?? '')
  const fontSize = Number(node.params.fontSize ?? 15)
  const headingSize = Number(node.params.headingSize ?? 20)
  const labelY = Number(node.params.labelY ?? bar.y - 16)
  ctx.fillStyle = brand.surfaces.inkOnLight
  ctx.font = `700 ${headingSize}px "${brand.fonts.heading.family}"`
  ctx.textAlign = 'left'
  ctx.fillText(label, bar.x, labelY)
  let x = bar.x
  for (const ratio of brand.ratios) {
    const width = (ratio.pct / 100) * bar.w
    ctx.fillStyle = ratio.hex
    ctx.fillRect(x, bar.y, width, bar.h)
    if (ratio.hex === brand.surfaces.light) {
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.strokeRect(x + 0.5, bar.y + 0.5, width - 1, bar.h - 1)
    }
    ctx.fillStyle = luminance(ratio.hex) < 0.45 ? '#fff' : '#111'
    ctx.font = `600 ${fontSize}px "${brand.fonts.body.family}"`
    if (width > 70) ctx.fillText(`${ratio.name} ${ratio.pct}%`, x + 10, bar.y + bar.h / 2 + 5)
    else if (width > 34) ctx.fillText(`${ratio.pct}%`, x + 6, bar.y + bar.h / 2 + 5)
    x += width
  }
  if (note) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.font = `400 14px "${brand.fonts.body.family}"`
    ctx.textAlign = 'right'
    ctx.fillText(note, bar.x + bar.w, labelY)
    ctx.textAlign = 'left'
  }
}

export interface StudioCanvasContext {
  brand: Brand
  logo: LogoInfo | null
  decisions?: LogoDecisions
}

export function studioCanvasHooks(context: StudioCanvasContext): CanvasPaintHooks {
  const decisions = context.decisions ?? NO_DECISIONS
  return {
    logo: (ctx, node) => drawLogo(ctx, node, context.brand, context.logo, decisions),
    device: (ctx, node) => {
      if (node.kind === 'grid-lines') gridLines(ctx, node)
      else if (node.kind === 'fine-grid') fineGrid(ctx, node)
      else if (node.kind === 'hatch-zone') hatchZone(ctx, node, context.brand)
      else if (node.kind === 'dashed-box') dashedBox(ctx, node)
      else if (node.kind === 'dimension-h') dimensionH(ctx, node, context.brand)
      else if (node.kind === 'usage-ratio') ratioBar(ctx, node, context.brand)
    },
  }
}

export const markAspect = (logo: LogoInfo | null) =>
  logo ? logo.width / logo.height : 1
