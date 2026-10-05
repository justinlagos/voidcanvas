import { placeOn } from '@/lib/intelligence/backgrounds'
import { createBrandPaintResolver, paintCanvas, type Node, type Page } from '@/brand/compose'
import type { Brand } from './tokens'
import { loadFont } from './fonts'
import {
  MODE_OF,
  NO_DECISIONS,
  grayMark,
  logoPlacements,
  logoVariants,
  monoMark,
  type LogoDecisions,
  type LogoInfo,
  type MarkMode,
} from './logo'
import { recordPage, type RecordedPage } from './record'

function modeFor(
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
  bg: string,
): MarkMode {
  if (!logo) return 'original'
  const decided = logoPlacements(brand, logo, decisions).find(
    (placement) =>
      placement.bg.toLowerCase() === bg.toLowerCase() && placement.designer,
  )
  if (decided) return decided.mode
  const variants = logoVariants(brand, logo, decisions).map((variant) => ({
    id: variant.id,
    valid: variant.valid,
    profile: variant.profile,
  }))
  return MODE_OF[
    placeOn(
      { id: 'ir', name: 'Page', hex: bg, group: 'neutral' },
      variants,
    ).use
  ]
}

function markCanvas(brand: Brand, logo: LogoInfo, mode: MarkMode) {
  if (mode === 'original') return logo.img
  if (mode === 'grayscale') return grayMark(logo)
  return monoMark(
    logo,
    mode === 'white'
      ? '#ffffff'
      : mode === 'brand'
        ? brand.roles[0].hex
        : brand.surfaces.inkOnLight,
  )
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  brand: Brand,
  node: Extract<Node, { t: 'logo' }>,
) {
  const r = Math.min(node.rect.w, node.rect.h) * 0.32
  const cx = node.rect.x + node.rect.w / 2
  const cy = node.rect.y + node.rect.h / 2
  const bg = node.on && 'hex' in node.on ? node.on.hex : brand.surfaces.light
  ctx.fillStyle = brand.roles[0].hex
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = brand.roles[0].hex.toLowerCase() === bg.toLowerCase() ? '#ffffff' : brand.surfaces.inkOnDark
  ctx.font = `700 ${r}px ${JSON.stringify(brand.fonts.heading.family)}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((brand.name[0] || 'B').toUpperCase(), cx, cy + r * 0.04)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
  node: Extract<Node, { t: 'logo' }>,
  bg: string,
) {
  if (!logo) {
    drawPlaceholder(ctx, brand, node)
    return
  }
  const mode: MarkMode =
    node.version === 'auto'
      ? modeFor(brand, logo, decisions, bg)
      : node.version === 'primary'
        ? 'original'
        : node.version === 'reversed'
          ? 'white'
          : node.version === 'mono-dark'
            ? 'dark'
            : node.version === 'mono-brand'
              ? 'brand'
              : 'grayscale'
  const source = markCanvas(brand, logo, mode)
  const scale = Math.min(node.rect.w / logo.width, node.rect.h / logo.height)
  const w = logo.width * scale
  const h = logo.height * scale
  ctx.drawImage(
    source,
    node.rect.x + (node.rect.w - w) / 2,
    node.rect.y + (node.rect.h - h) / 2,
    w,
    h,
  )
}

function drawBlueprintGrid(
  ctx: CanvasRenderingContext2D,
  node: Extract<Node, { t: 'device' }>,
) {
  const step = Number(node.params.step) || 20
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'
  ctx.lineWidth = 1
  for (let x = node.rect.x; x < node.rect.x + node.rect.w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, node.rect.y)
    ctx.lineTo(x + 0.5, node.rect.y + node.rect.h)
    ctx.stroke()
  }
  for (let y = node.rect.y; y < node.rect.y + node.rect.h; y += step) {
    ctx.beginPath()
    ctx.moveTo(node.rect.x, y + 0.5)
    ctx.lineTo(node.rect.x + node.rect.w, y + 0.5)
    ctx.stroke()
  }
}

function drawClearSpaceZone(
  ctx: CanvasRenderingContext2D,
  brand: Brand,
  node: Extract<Node, { t: 'device' }>,
) {
  const unit = Number(node.params.unit)
  const markX = Number(node.params.markX)
  const markY = Number(node.params.markY)
  const markW = Number(node.params.markW)
  const markH = Number(node.params.markH)
  const { x, y, w, h } = node.rect

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.rect(markX, markY, markW, markH)
  ctx.clip('evenodd')
  ctx.strokeStyle = brand.roles[0].ramp[300]
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 1.5
  for (let d = -h; d < w + h; d += 12) {
    ctx.beginPath()
    ctx.moveTo(x + d, y)
    ctx.lineTo(x + d - h, y + h)
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = brand.roles[0].ramp[600]
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 6])
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1
  ctx.strokeRect(markX, markY, markW, markH)

  const markUnit = (ux: number, uy: number, uw: number, uh: number) => {
    ctx.fillStyle = brand.roles[0].hex
    ctx.globalAlpha = 0.18
    ctx.fillRect(ux, uy, uw, uh)
    ctx.globalAlpha = 1
    ctx.fillStyle = brand.roles[0].ramp[800]
    ctx.font = `italic 600 ${Math.max(14, Math.min(28, unit * 0.5))}px ${JSON.stringify(brand.fonts.heading.family)}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('x', ux + uw / 2, uy + uh / 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  markUnit(markX + markW / 2 - unit / 2, y, unit, unit)
  markUnit(markX + markW / 2 - unit / 2, markY + markH, unit, unit)
  markUnit(x, markY + markH / 2 - unit / 2, unit, unit)
  markUnit(markX + markW, markY + markH / 2 - unit / 2, unit, unit)

  const dx = x + w + 22
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(dx, markY)
  ctx.lineTo(dx, markY + markH)
  ctx.moveTo(dx - 6, markY)
  ctx.lineTo(dx + 6, markY)
  ctx.moveTo(dx - 6, markY + markH)
  ctx.lineTo(dx + 6, markY + markH)
  ctx.stroke()
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.font = `500 14px ${JSON.stringify(brand.fonts.mono.family)}`
  ctx.fillText('H', dx + 10, markY + markH / 2 + 5)
}

function drawClearSpaceExamples(
  ctx: CanvasRenderingContext2D,
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
  node: Extract<Node, { t: 'device' }>,
) {
  const gap = 20
  const exW = (node.rect.w - gap) / 2
  const exH = node.rect.h
  const ar = Number(node.params.logoAspect) || 1
  const cs = Number(node.params.clearSpace) || 0.5

  const draw = (x: number, bad: boolean) => {
    const bg = bad ? brand.semantic[2].ramp[50] : brand.semantic[0].ramp[50]
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(x, node.rect.y, exW, exH, 10)
    ctx.fill()
    const markH = exH * 0.34
    const markW = markH * ar
    const markX = x + (bad ? 16 : exW * 0.5 - markW / 2)
    const markY = node.rect.y + exH * 0.5 - markH / 2
    drawLogo(
      ctx,
      brand,
      logo,
      decisions,
      {
        t: 'logo',
        id: bad ? 'crowded-example-logo' : 'correct-example-logo',
        rect: { x: markX, y: markY, w: markW, h: markH },
        version: 'auto',
        on: { hex: bg },
        clearSpace: false,
      },
      bg,
    )
    if (bad) {
      ctx.fillStyle = brand.surfaces.inkOnLight
      ctx.font = `700 ${Math.round(markH * 0.55)}px ${JSON.stringify(brand.fonts.heading.family)}`
      const available = Math.max(0, exW - markW - 24)
      let label = brand.name || 'Headline'
      while (label.length > 1 && ctx.measureText(label).width > available)
        label = label.slice(0, -1)
      ctx.fillText(label, markX + markW + 6, markY + markH * 0.72)
    } else {
      ctx.strokeStyle = brand.semantic[0].ramp[400]
      ctx.setLineDash([5, 4])
      ctx.lineWidth = 1
      ctx.strokeRect(
        markX - markH * cs,
        markY - markH * cs,
        markW + markH * cs * 2,
        markH + markH * cs * 2,
      )
      ctx.setLineDash([])
    }
    ctx.fillStyle = bad ? brand.semantic[2].ramp[700] : brand.semantic[0].ramp[700]
    ctx.font = `600 14px ${JSON.stringify(brand.fonts.body.family)}`
    ctx.fillText(bad ? 'Incorrect: crowded' : 'Correct', x + 12, node.rect.y + exH - 12)
  }

  draw(node.rect.x, false)
  draw(node.rect.x + exW + gap, true)
}

function resolverFor(
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions,
) {
  const base = createBrandPaintResolver(brand)
  return createBrandPaintResolver(brand, {
    drawLogo: (node, ctx) =>
      drawLogo(ctx, brand, logo, decisions, node, base.colour(node.on)),
    drawDevice: (node, ctx) => {
      if (node.kind === 'blueprint-grid') drawBlueprintGrid(ctx, node)
      else if (node.kind === 'clearspace-zone') drawClearSpaceZone(ctx, brand, node)
      else if (node.kind === 'clearspace-examples')
        drawClearSpaceExamples(ctx, brand, logo, decisions, node)
    },
  })
}

async function loadBrandFonts(brand: Brand) {
  await Promise.all([
    loadFont(brand.fonts.heading, [400, 600, 700]),
    loadFont(brand.fonts.body, [400, 500, 600]),
    loadFont(brand.fonts.mono, [400, 500, 600]),
  ])
}

export async function renderIrPage(
  page: Page,
  brand: Brand,
  logo: LogoInfo | null,
  scale = 1,
  decisions: LogoDecisions = NO_DECISIONS,
) {
  await loadBrandFonts(brand)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(page.width * scale)
  canvas.height = Math.round(page.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  paintCanvas(page, ctx, resolverFor(brand, logo, decisions))
  return canvas
}

export async function recordIrPage(
  page: Page,
  brand: Brand,
  logo: LogoInfo | null,
  decisions: LogoDecisions = NO_DECISIONS,
): Promise<RecordedPage> {
  await loadBrandFonts(brand)
  const resolver = resolverFor(brand, logo, decisions)
  return recordPage(page.width, page.height, (ctx) => paintCanvas(page, ctx, resolver))
}
