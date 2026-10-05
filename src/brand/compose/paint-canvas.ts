import type { Brand } from '@/studio/brand/tokens'
import { canvasFont, fontFor, resolvePaint } from './paint'
import type {
  DeviceNode,
  ImageNode,
  LogoNode,
  Node,
  Page,
  Rect,
  SpecimenNode,
  SwatchNode,
  TableNode,
  TextNode,
} from './types'

export interface CanvasPaintHooks {
  logo?: (ctx: CanvasRenderingContext2D, node: LogoNode, page: Page) => void
  image?: (ctx: CanvasRenderingContext2D, node: ImageNode, page: Page) => void
  device?: (ctx: CanvasRenderingContext2D, node: DeviceNode, page: Page) => void
  swatch?: (ctx: CanvasRenderingContext2D, node: SwatchNode, page: Page) => void
  specimen?: (ctx: CanvasRenderingContext2D, node: SpecimenNode, page: Page) => void
  table?: (ctx: CanvasRenderingContext2D, node: TableNode, page: Page) => void
}

export interface CanvasPaintOptions {
  brand: Brand
  hooks?: CanvasPaintHooks
  clear?: boolean
}

const roundPath = (ctx: CanvasRenderingContext2D, rect: Rect, radius = 0) => {
  ctx.beginPath()
  if (radius > 0) ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius)
  else ctx.rect(rect.x, rect.y, rect.w, rect.h)
}

const caseText = (node: TextNode) => {
  if (node.case === 'upper') return node.text.toUpperCase()
  if (node.case === 'sentence') {
    const value = node.text.toLocaleLowerCase()
    return value.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase())
  }
  return node.text
}

const wordsToLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines = Number.POSITIVE_INFINITY,
) => {
  const paragraphs = text.split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let line = words[0]
    for (let i = 1; i < words.length; i++) {
      const next = `${line} ${words[i]}`
      if (ctx.measureText(next).width > width && line) {
        lines.push(line)
        line = words[i]
        if (lines.length >= maxLines) return lines
      } else line = next
    }
    lines.push(line)
    if (lines.length >= maxLines) return lines
  }
  return lines
}

function paintText(
  ctx: CanvasRenderingContext2D,
  node: TextNode,
  brand: Brand,
) {
  const text = caseText(node)
  const originalSize = node.style.size
  let size = originalSize
  ctx.font = canvasFont(node.style, brand)
  ctx.textAlign = node.align
  ctx.textBaseline = node.baseline ?? (node.valign === 'middle' ? 'middle' : 'top')
  ctx.fillStyle = resolvePaint(node.color, brand)
  ctx.globalAlpha *= node.opacity ?? 1
  ;(ctx as unknown as { letterSpacing?: string }).letterSpacing = `${(node.style.tracking ?? 0) * size}px`

  if (node.fit === 'shrink') {
    while (size > 7 && ctx.measureText(text).width > node.rect.w) {
      size -= 1
      ctx.font = canvasFont({ ...node.style, size }, brand)
      ;(ctx as unknown as { letterSpacing?: string }).letterSpacing = `${(node.style.tracking ?? 0) * size}px`
    }
  }

  const anchorX =
    node.align === 'center'
      ? node.rect.x + node.rect.w / 2
      : node.align === 'right'
        ? node.rect.x + node.rect.w
        : node.rect.x
  const lineHeight = size * (node.style.lineHeight ?? 1.2)
  const lines =
    node.fit === 'wrap'
      ? wordsToLines(ctx, text, node.rect.w, node.maxLines)
      : text.split('\n').slice(0, node.maxLines ?? Number.POSITIVE_INFINITY)
  const blockHeight = Math.max(size, lines.length * lineHeight)
  let y = node.rect.y
  if (node.valign === 'middle') y += (node.rect.h - blockHeight) / 2
  else if (node.valign === 'bottom') y += node.rect.h - blockHeight
  if ((node.baseline ?? 'top') === 'alphabetic') y = node.rect.y

  ctx.save()
  if (node.fit === 'clip') {
    ctx.beginPath()
    ctx.rect(node.rect.x, node.rect.y, node.rect.w, node.rect.h)
    ctx.clip()
  }
  lines.forEach((line, index) => ctx.fillText(line, anchorX, y + index * lineHeight))
  ctx.restore()
  ;(ctx as unknown as { letterSpacing?: string }).letterSpacing = '0px'
  node.style.size = originalSize
}

function fallbackLogo(ctx: CanvasRenderingContext2D, node: LogoNode, brand: Brand) {
  const color = resolvePaint(node.on, brand)
  const r = Math.min(node.rect.w, node.rect.h) * 0.32
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(node.rect.x + node.rect.w / 2, node.rect.y + node.rect.h / 2, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color === '#ffffff' ? brand.roles[0].hex : '#ffffff'
  ctx.font = `700 ${r}px "${brand.fonts.heading.family}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((brand.name[0] || 'B').toUpperCase(), node.rect.x + node.rect.w / 2, node.rect.y + node.rect.h / 2)
}

function fallbackSwatch(ctx: CanvasRenderingContext2D, node: SwatchNode, brand: Brand) {
  ctx.fillStyle = resolvePaint(node.color, brand)
  ctx.fillRect(node.rect.x, node.rect.y, node.rect.w, node.rect.h)
}

function fallbackSpecimen(ctx: CanvasRenderingContext2D, node: SpecimenNode, brand: Brand) {
  const family = node.family === 'heading' ? brand.fonts.heading.family : node.family === 'mono' ? brand.fonts.mono.family : brand.fonts.body.family
  const size = Math.min(node.rect.h * 0.55, 72)
  ctx.fillStyle = resolvePaint(node.color ?? { role: 'ink' }, brand)
  ctx.font = `500 ${size}px "${family}"`
  ctx.textBaseline = 'middle'
  ctx.fillText(node.text ?? (node.mode === 'glyphs' ? 'Aa' : brand.name), node.rect.x, node.rect.y + node.rect.h / 2)
}

function fallbackTable(ctx: CanvasRenderingContext2D, node: TableNode, brand: Brand) {
  if (!node.rows.length) return
  const rowH = node.rect.h / node.rows.length
  const cols = Math.max(1, ...node.rows.map((row) => row.length))
  const colW = node.rect.w / cols
  ctx.font = `400 14px "${brand.fonts.body.family}"`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = resolvePaint(node.color ?? { role: 'ink' }, brand)
  node.rows.forEach((row, ri) => row.forEach((cell, ci) => ctx.fillText(cell, node.rect.x + ci * colW + 8, node.rect.y + ri * rowH + rowH / 2)))
}

function paintNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  page: Page,
  options: CanvasPaintOptions,
) {
  const { brand, hooks } = options
  ctx.save()
  ctx.globalAlpha *= node.opacity ?? 1
  switch (node.t) {
    case 'frame': {
      if (node.fill) {
        roundPath(ctx, node.rect, node.radius)
        ctx.fillStyle = resolvePaint(node.fill, brand)
        ctx.fill()
      }
      if (node.stroke && (node.strokeWidth ?? 0) > 0) {
        roundPath(ctx, node.rect, node.radius)
        ctx.strokeStyle = resolvePaint(node.stroke, brand)
        ctx.lineWidth = node.strokeWidth ?? 1
        ctx.stroke()
      }
      if (node.clip) {
        roundPath(ctx, node.rect, node.radius)
        ctx.clip()
      }
      node.children.forEach((child) => paintNode(ctx, child, page, options))
      break
    }
    case 'text':
      paintText(ctx, node, brand)
      break
    case 'logo':
      hooks?.logo ? hooks.logo(ctx, node, page) : fallbackLogo(ctx, node, brand)
      break
    case 'swatch':
      hooks?.swatch ? hooks.swatch(ctx, node, page) : fallbackSwatch(ctx, node, brand)
      break
    case 'image':
      hooks?.image?.(ctx, node, page)
      break
    case 'device':
      hooks?.device?.(ctx, node, page)
      break
    case 'specimen':
      hooks?.specimen ? hooks.specimen(ctx, node, page) : fallbackSpecimen(ctx, node, brand)
      break
    case 'table':
      hooks?.table ? hooks.table(ctx, node, page) : fallbackTable(ctx, node, brand)
      break
  }
  ctx.restore()
}

export function paintCanvas(
  page: Page,
  ctx: CanvasRenderingContext2D,
  options: CanvasPaintOptions,
) {
  if (options.clear !== false) ctx.clearRect(0, 0, page.size.w, page.size.h)
  ctx.save()
  ctx.fillStyle = resolvePaint(page.background, options.brand)
  ctx.fillRect(0, 0, page.size.w, page.size.h)
  page.nodes.forEach((node) => paintNode(ctx, node, page, options))
  ctx.restore()
}

export const canvasTextFamily = fontFor
