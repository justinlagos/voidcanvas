import type { Node, Page, PaintResolver, Rect, TextRole } from './types'

function roundedPath(ctx: CanvasRenderingContext2D, r: Rect, radius = 0) {
  ctx.beginPath()
  if (radius > 0) ctx.roundRect(r.x, r.y, r.w, r.h, radius)
  else ctx.rect(r.x, r.y, r.w, r.h)
}

function applyCase(text: string, mode: Extract<Node, { t: 'text' }>['case']) {
  if (mode === 'upper') return text.toUpperCase()
  if (mode === 'sentence')
    return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : text
  return text
}

function setFont(ctx: CanvasRenderingContext2D, style: TextRole, resolver: PaintResolver) {
  const italic = style.italic ? 'italic ' : ''
  ctx.font = `${italic}${style.weight} ${style.size}px ${JSON.stringify(resolver.font(style.family))}`
}

function wrappedParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (!text) return ['']
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

function linesFor(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Infinity,
) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    for (const line of wrappedParagraph(ctx, paragraph, maxWidth)) {
      if (lines.length >= maxLines) return lines
      lines.push(line)
    }
  }
  return lines
}

function textFits(ctx: CanvasRenderingContext2D, lines: string[], rect: Rect, lineHeight: number) {
  return (
    lines.length * lineHeight <= rect.h + 0.01 &&
    lines.every((line) => ctx.measureText(line).width <= rect.w + 0.01)
  )
}

function paintText(
  ctx: CanvasRenderingContext2D,
  node: Extract<Node, { t: 'text' }>,
  resolver: PaintResolver,
) {
  const text = applyCase(node.text, node.case)
  let style = { ...node.style }
  let lines: string[] = []
  const minSize = Math.min(7, style.size)

  do {
    setFont(ctx, style, resolver)
    const lineHeight = style.size * style.lineHeight
    lines = linesFor(ctx, text, node.rect.w, node.maxLines)
    if (node.fit !== 'shrink' || textFits(ctx, lines, node.rect, lineHeight) || style.size <= minSize)
      break
    style = { ...style, size: Math.max(minSize, style.size - 1) }
  } while (true)

  setFont(ctx, style, resolver)
  ctx.fillStyle = resolver.colour(node.color)
  ctx.textAlign = node.align
  ctx.textBaseline = 'alphabetic'
  const lineHeight = style.size * style.lineHeight
  const totalHeight = lines.length * lineHeight
  const top =
    node.valign === 'middle'
      ? node.rect.y + (node.rect.h - totalHeight) / 2
      : node.valign === 'bottom'
        ? node.rect.y + node.rect.h - totalHeight
        : node.rect.y
  const firstBaseline = node.baseline ?? top + style.size
  const x =
    node.align === 'center'
      ? node.rect.x + node.rect.w / 2
      : node.align === 'right'
        ? node.rect.x + node.rect.w
        : node.rect.x

  lines.forEach((line, i) => {
    ctx.fillText(line, x, firstBaseline + i * lineHeight)
  })
  ctx.textAlign = 'left'
}

function paintNode(ctx: CanvasRenderingContext2D, node: Node, resolver: PaintResolver) {
  switch (node.t) {
    case 'frame': {
      ctx.save()
      roundedPath(ctx, node.rect, node.radius)
      if (node.fill) {
        ctx.fillStyle = resolver.colour(node.fill)
        ctx.fill()
      }
      if (node.stroke) {
        ctx.strokeStyle = resolver.colour(node.stroke)
        ctx.lineWidth = node.strokeWidth ?? 1
        ctx.stroke()
      }
      if (node.clip) {
        roundedPath(ctx, node.rect, node.radius)
        ctx.clip()
      }
      node.children.forEach((child) => paintNode(ctx, child, resolver))
      ctx.restore()
      break
    }
    case 'text':
      paintText(ctx, node, resolver)
      break
    case 'logo':
      resolver.drawLogo?.(node, ctx)
      break
    case 'swatch':
      ctx.fillStyle = resolver.colour(node.paint)
      roundedPath(ctx, node.rect, node.radius)
      ctx.fill()
      break
    case 'image':
      resolver.drawImage?.(node, ctx)
      break
    case 'device':
      resolver.drawDevice?.(node, ctx)
      break
    case 'specimen':
      resolver.drawSpecimen?.(node, ctx)
      break
    case 'table': {
      const rowH = node.rows.length ? node.rect.h / node.rows.length : node.rect.h
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      node.rows.forEach((row, rowIndex) => {
        const colW = row.length ? node.rect.w / row.length : node.rect.w
        row.forEach((cell, colIndex) => {
          const x = node.rect.x + colIndex * colW
          const y = node.rect.y + rowIndex * rowH
          ctx.strokeRect(x, y, colW, rowH)
          ctx.fillStyle = '#111111'
          ctx.font = '400 12px sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText(cell, x + 8, y + rowH / 2)
        })
      })
      break
    }
  }
}

export function paintCanvas(
  page: Page,
  ctx: CanvasRenderingContext2D,
  resolver: PaintResolver,
) {
  ctx.save()
  ctx.fillStyle = resolver.colour(page.background)
  ctx.fillRect(0, 0, page.width, page.height)
  page.nodes.forEach((node) => paintNode(ctx, node, resolver))
  ctx.restore()
}