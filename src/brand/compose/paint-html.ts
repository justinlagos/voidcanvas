import type { Node, Page, Paint, TextRole } from './types'

export interface HtmlResolver {
  colour(paint: Paint): string
  font(role: TextRole['family']): string
  logo?: (node: Extract<Node, { t: 'logo' }>) => string
  image?: (node: Extract<Node, { t: 'image' }>) => string
  device?: (node: Extract<Node, { t: 'device' }>) => string
  specimen?: (node: Extract<Node, { t: 'specimen' }>) => string
}

const esc = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const css = (value: string) => value.replaceAll(';', '')

function rectStyle(node: { rect: { x: number; y: number; w: number; h: number } }) {
  const { x, y, w, h } = node.rect
  return `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;`
}

function textCase(mode: Extract<Node, { t: 'text' }>['case']) {
  if (mode === 'upper') return 'uppercase'
  if (mode === 'sentence') return 'none'
  return 'none'
}

function paintNode(node: Node, resolver: HtmlResolver): string {
  switch (node.t) {
    case 'frame': {
      const fill = node.fill ? `background:${css(resolver.colour(node.fill))};` : ''
      const stroke = node.stroke
        ? `border:${node.strokeWidth ?? 1}px solid ${css(resolver.colour(node.stroke))};`
        : ''
      const radius = node.radius ? `border-radius:${node.radius}px;` : ''
      const clip = node.clip ? 'overflow:hidden;' : ''
      return `<div data-node="${esc(node.id)}" style="${rectStyle(node)}${fill}${stroke}${radius}${clip}">${node.children.map((child) => paintNode(child, resolver)).join('')}</div>`
    }
    case 'text': {
      const family = esc(resolver.font(node.style.family))
      const align = node.align
      const transform = textCase(node.case)
      const weight = node.style.weight
      const italic = node.style.italic ? 'font-style:italic;' : ''
      const tracking = node.style.tracking ? `letter-spacing:${node.style.tracking}em;` : ''
      const overflow = node.fit === 'shrink' ? 'overflow:hidden;' : ''
      const content = node.case === 'sentence'
        ? node.text
          ? node.text.charAt(0).toUpperCase() + node.text.slice(1).toLowerCase()
          : node.text
        : node.text
      return `<div data-node="${esc(node.id)}" data-source="${node.source}" style="${rectStyle(node)}color:${css(resolver.colour(node.color))};font-family:${family};font-size:${node.style.size}px;font-weight:${weight};line-height:${node.style.lineHeight};text-align:${align};text-transform:${transform};${italic}${tracking}${overflow}">${esc(content)}</div>`
    }
    case 'logo':
      return resolver.logo?.(node) ?? `<div data-node="${esc(node.id)}" data-kind="logo" style="${rectStyle(node)}"></div>`
    case 'swatch':
      return `<div data-node="${esc(node.id)}" data-role="${esc(node.role)}" data-specs="${node.specs.join(',')}" style="${rectStyle(node)}background:${css(resolver.colour(node.paint))};"></div>`
    case 'image':
      return resolver.image?.(node) ?? `<div data-node="${esc(node.id)}" data-kind="image" style="${rectStyle(node)}"></div>`
    case 'device':
      return resolver.device?.(node) ?? `<div data-node="${esc(node.id)}" data-kind="device" data-device="${esc(node.kind)}" style="${rectStyle(node)}"></div>`
    case 'specimen':
      return resolver.specimen?.(node) ?? `<div data-node="${esc(node.id)}" data-kind="specimen" style="${rectStyle(node)}"></div>`
    case 'table':
      return `<table data-node="${esc(node.id)}" data-style="${node.style}" style="${rectStyle(node)}border-collapse:collapse;">${node.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</table>`
  }
}

export function paintHtml(page: Page, resolver: HtmlResolver) {
  const body = page.nodes.map((node) => paintNode(node, resolver)).join('')
  return `<section data-brand-page="${esc(page.kind)}" data-composition="${esc(page.genome.compositionId)}" style="position:relative;width:${page.width}px;height:${page.height}px;overflow:hidden;background:${css(resolver.colour(page.background))};">${body}</section>`
}
