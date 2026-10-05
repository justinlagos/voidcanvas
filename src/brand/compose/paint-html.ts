import type { Brand } from '@/studio/brand/tokens'
import { cssFontFamily, resolvePaint } from './paint'
import type { Node, Page, Rect, TextNode } from './types'

export interface HtmlPaintOptions {
  brand: Brand
  className?: string
}

const esc = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(4)}%`

const rectStyle = (rect: Rect, page: Page) =>
  `left:${pct(rect.x, page.size.w)};top:${pct(rect.y, page.size.h)};width:${pct(rect.w, page.size.w)};height:${pct(rect.h, page.size.h)}`

const textValue = (node: TextNode) => {
  if (node.case === 'upper') return node.text.toUpperCase()
  if (node.case === 'sentence') {
    const value = node.text.toLocaleLowerCase()
    return value.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase())
  }
  return node.text
}

function nodeHtml(node: Node, page: Page, brand: Brand): string {
  const base = `position:absolute;${rectStyle(node.rect, page)};opacity:${node.opacity ?? 1}`
  switch (node.t) {
    case 'frame': {
      const fill = node.fill ? `background:${resolvePaint(node.fill, brand)};` : ''
      const stroke = node.stroke && (node.strokeWidth ?? 0) > 0
        ? `border:${node.strokeWidth}px solid ${resolvePaint(node.stroke, brand)};box-sizing:border-box;`
        : ''
      const radius = node.radius ? `border-radius:${node.radius}px;` : ''
      const clip = node.clip ? 'overflow:hidden;' : ''
      return `<div data-vc-node="frame" data-vc-id="${esc(node.id)}" style="${base};${fill}${stroke}${radius}${clip}">${node.children.map((child) => nodeHtml(child, page, brand)).join('')}</div>`
    }
    case 'text': {
      const style = node.style
      const color = resolvePaint(node.color, brand)
      const family = cssFontFamily(style, brand)
      const transform = node.valign === 'middle' ? 'display:flex;align-items:center;' : node.valign === 'bottom' ? 'display:flex;align-items:flex-end;' : ''
      const overflow = node.fit === 'clip' ? 'overflow:hidden;' : ''
      return `<div data-vc-node="text" data-vc-id="${esc(node.id)}" data-vc-source="${node.source}"${node.bind ? ` data-vc-bind="${esc(node.bind)}"` : ''} style="${base};${transform}${overflow}color:${color};font-family:${family};font-size:${style.size}px;font-weight:${style.weight ?? 400};font-style:${style.italic ? 'italic' : 'normal'};line-height:${style.lineHeight ?? 1.2};letter-spacing:${style.tracking ?? 0}em;text-align:${node.align};white-space:${node.fit === 'wrap' ? 'normal' : 'pre-wrap'};overflow-wrap:anywhere">${esc(textValue(node))}</div>`
    }
    case 'logo':
      return `<figure data-vc-node="logo" data-vc-id="${esc(node.id)}" data-vc-version="${esc(node.version)}" data-vc-clear-space="${node.clearSpace ? 'true' : 'false'}" style="${base};margin:0" aria-label="Logo"></figure>`
    case 'swatch': {
      const hex = resolvePaint(node.color, brand)
      return `<figure data-vc-node="swatch" data-vc-id="${esc(node.id)}" data-vc-role="${esc(node.role)}" data-vc-value="${esc(hex)}" data-vc-specs="${esc(node.specs.join(','))}" style="${base};margin:0;background:${hex}">${node.label ? `<figcaption>${esc(node.label)}</figcaption>` : ''}</figure>`
    }
    case 'image':
      return `<figure data-vc-node="image" data-vc-id="${esc(node.id)}" data-vc-crop="${node.crop}" style="${base};margin:0${node.radius ? `;border-radius:${node.radius}px;overflow:hidden` : ''}"></figure>`
    case 'device':
      return `<div data-vc-node="device" data-vc-id="${esc(node.id)}" data-vc-kind="${esc(node.kind)}" style="${base}"></div>`
    case 'specimen':
      return `<figure data-vc-node="specimen" data-vc-id="${esc(node.id)}" data-vc-family="${node.family}" data-vc-mode="${node.mode}" style="${base};margin:0">${node.text ? esc(node.text) : ''}</figure>`
    case 'table':
      return `<table data-vc-node="table" data-vc-id="${esc(node.id)}" style="${base};border-collapse:collapse"><tbody>${node.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  }
}

export function paintHtml(page: Page, options: HtmlPaintOptions): string {
  const background = resolvePaint(page.background, options.brand)
  const className = options.className ? ` ${esc(options.className)}` : ''
  return `<article class="vc-brand-page${className}" data-vc-page-kind="${esc(page.kind)}" data-vc-composition="${esc(page.genome.compositionId)}" style="position:relative;aspect-ratio:${page.size.w}/${page.size.h};width:100%;overflow:hidden;background:${background}">${page.nodes.map((node) => nodeHtml(node, page, options.brand)).join('')}</article>`
}
