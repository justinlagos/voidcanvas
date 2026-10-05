import { paintCanvas, createBrandPaintResolver, brandPaint, type Node, type Page } from '@/brand/compose'
import { renderPage as renderLegacyPage, type GuidePhoto, type Orientation, type PageSpec } from './brand-pages'
import { grayMark, logoPlacements, monoMark, type LogoDecisions, type LogoInfo, type MarkMode } from './brand/logo'
import { loadFont } from './brand/fonts'
import type { Brand } from './brand/tokens'

export interface RuntimeRenderInput {
  spec: PageSpec
  irPage?: Page
  pageNo: number
  pageCount: number
  brand: Brand
  logo: LogoInfo | null
  orientation: Orientation
  scale?: number
  decisions?: LogoDecisions
  photos?: GuidePhoto[]
}

function logoCanvas(logo: LogoInfo, mode: MarkMode, brand: Brand) {
  if (mode === 'original') return logo.img
  if (mode === 'grayscale') return grayMark(logo)
  return monoMark(logo, mode === 'white' ? '#ffffff' : mode === 'brand' ? brand.roles[0].hex : brand.surfaces.inkOnLight)
}

function autoLogoMode(brand: Brand, logo: LogoInfo, decisions: LogoDecisions, background: string): MarkMode {
  const placement = logoPlacements(brand, logo, decisions).find((p) => p.bg.toLowerCase() === background.toLowerCase())
  if (placement) return placement.mode
  const light = brand.surfaces.light.toLowerCase() === background.toLowerCase()
  const dark = brand.surfaces.dark.toLowerCase() === background.toLowerCase()
  if (dark) return 'white'
  if (light) return 'original'
  return 'original'
}

function fitImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource, srcW: number, srcH: number, r: { x: number; y: number; w: number; h: number }, contain = true) {
  const k = contain ? Math.min(r.w / srcW, r.h / srcH) : Math.max(r.w / srcW, r.h / srcH)
  const w = srcW * k, h = srcH * k
  ctx.drawImage(image, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h)
}

function runtimeHooks(brand: Brand, logo: LogoInfo | null, decisions: LogoDecisions, photos: GuidePhoto[]) {
  return {
    drawLogo(node: Extract<Node, { t: 'logo' }>, ctx: CanvasRenderingContext2D) {
      const bg = brandPaint(brand, node.on)
      if (!logo) {
        const r = node.rect
        const radius = Math.min(r.w, r.h) * 0.25
        ctx.fillStyle = brand.roles[0].hex
        ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + r.h / 2, radius, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `700 ${Math.max(18, radius)}px ${JSON.stringify(brand.fonts.heading.family)}`
        ctx.fillText((brand.name[0] || 'B').toUpperCase(), r.x + r.w / 2, r.y + r.h / 2)
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
        return
      }
      const requested: MarkMode = node.version === 'primary' ? 'original'
        : node.version === 'reversed' ? 'white'
          : node.version === 'mono-dark' ? 'dark'
            : node.version === 'mono-brand' ? 'brand'
              : node.version === 'grayscale' ? 'grayscale'
                : autoLogoMode(brand, logo, decisions, bg)
      fitImage(ctx, logoCanvas(logo, requested, brand), logo.width, logo.height, node.rect, true)
    },
    drawImage(node: Extract<Node, { t: 'image' }>, ctx: CanvasRenderingContext2D) {
      const r = node.rect
      if (typeof node.src === 'object' && 'photo' in node.src && photos[node.src.photo]) {
        const image = photos[node.src.photo].img
        fitImage(ctx, image, image.width, image.height, r, node.crop === 'contain')
        return
      }
      ctx.fillStyle = brandPaint(brand, { role: 'neutral', step: 200 })
      ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.fillStyle = brandPaint(brand, { role: 'brand', alpha: 0.12 })
      ctx.beginPath(); ctx.arc(r.x + r.w * 0.68, r.y + r.h * 0.42, Math.min(r.w, r.h) * 0.28, 0, Math.PI * 2); ctx.fill()
    },
    drawDevice(node: Extract<Node, { t: 'device' }>, ctx: CanvasRenderingContext2D) {
      const r = node.rect
      ctx.save()
      if (node.kind === 'angle-field') {
        const spacing = Number(node.params.spacing ?? 64)
        const angle = Number(node.params.angle ?? 24) * Math.PI / 180
        ctx.strokeStyle = brandPaint(brand, { role: 'ink', alpha: Number(node.params.opacity ?? 0.08) })
        ctx.lineWidth = 3
        ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(angle)
        for (let x = -r.w; x <= r.w; x += spacing) { ctx.beginPath(); ctx.moveTo(x, -r.h); ctx.lineTo(x, r.h); ctx.stroke() }
      } else {
        ctx.fillStyle = brandPaint(brand, { role: 'brand', alpha: Number(node.params.opacity ?? 0.12) })
        ctx.beginPath(); ctx.arc(r.x + r.w * 0.68, r.y + r.h * 0.38, Math.min(r.w, r.h) * 0.52, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    },
    drawSpecimen(node: Extract<Node, { t: 'specimen' }>, ctx: CanvasRenderingContext2D) {
      const r = node.rect
      ctx.fillStyle = brand.surfaces.inkOnLight
      ctx.font = `700 ${Math.min(190, r.h * 0.42)}px ${JSON.stringify(brand.fonts[node.family].family)}`
      ctx.textBaseline = 'top'
      ctx.fillText(node.mode === 'waterfall' ? 'Aa 72' : brand.name, r.x, r.y, r.w)
      ctx.font = `500 ${Math.min(42, r.h * 0.11)}px ${JSON.stringify(brand.fonts.body.family)}`
      ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ', r.x, r.y + r.h * 0.55, r.w)
      ctx.textBaseline = 'alphabetic'
    },
  }
}

/**
 * Single production rendering boundary for Brand Guidelines V2.
 * Landscape default layouts use the V2 IR. Portrait and explicit legacy variants remain on
 * the existing renderer until equivalent V2 controls exist, so saved designer choices survive.
 */
export async function renderRuntimePage(input: RuntimeRenderInput): Promise<HTMLCanvasElement> {
  const scale = input.scale ?? 1
  const decisions = input.decisions ?? { off: [], backgrounds: {} }
  const photos = input.photos ?? []
  if (!input.irPage || input.orientation !== 'landscape' || input.spec.variant > 0) {
    return renderLegacyPage(input.spec, input.pageNo, input.pageCount, input.brand, input.logo, input.orientation, scale, decisions, photos)
  }

  await Promise.all([
    loadFont(input.brand.fonts.heading, [400, 600, 700]),
    loadFont(input.brand.fonts.body, [400, 500, 600, 700]),
    loadFont(input.brand.fonts.mono, [400, 500, 600, 700]),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(input.irPage.width * scale))
  canvas.height = Math.max(1, Math.round(input.irPage.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(scale, scale)
  paintCanvas(input.irPage, ctx, createBrandPaintResolver(input.brand, runtimeHooks(input.brand, input.logo, decisions, photos)))
  return canvas
}

export async function eachRuntimePage(input: {
  pages: readonly PageSpec[]
  irByIndex: Map<number, Page>
  brand: Brand
  logo: LogoInfo | null
  orientation: Orientation
  scale: number
  decisions?: LogoDecisions
  photos?: GuidePhoto[]
  fn: (canvas: HTMLCanvasElement, title: string, index: number, count: number) => Promise<void>
  titleFor: (spec: PageSpec) => string
}) {
  const visible = input.pages.map((spec, sourceIndex) => ({ spec, sourceIndex })).filter(({ spec }) => spec.on)
  for (let i = 0; i < visible.length; i++) {
    const { spec, sourceIndex } = visible[i]
    const canvas = await renderRuntimePage({
      spec,
      irPage: input.irByIndex.get(sourceIndex),
      pageNo: i + 1,
      pageCount: visible.length,
      brand: input.brand,
      logo: input.logo,
      orientation: input.orientation,
      scale: input.scale,
      decisions: input.decisions,
      photos: input.photos,
    })
    try { await input.fn(canvas, input.titleFor(spec), i, visible.length) } finally { canvas.width = 0; canvas.height = 0 }
  }
}
