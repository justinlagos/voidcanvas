import { ctx2d, drawLayerContent, hasVectorMask, insideHiddenGroup, layerMatrix, layerSize, makeCanvas, maskBounds, measureTextIn, polygonPoints, renderDoc, textLayout, vectorMaskCanvas } from './engine'
import { hasFx } from './effects'
import { hasActiveStyles } from './styles'
import { toSvgD } from './pen'
import type { Doc, Frame, Group, Layer, RasterLayer, ShapeLayer, TextLayer } from './types'

// SVG export. Text and shapes stay vectors and photos are embedded. Anything SVG cannot draw the same way
// (effects, layer styles, masks on type and shapes, clipping, text on a path, text shadows and outlines,
// path operations, inside and outside strokes) is drawn by the engine and embedded as a trimmed image in
// its place, so the file looks like the canvas. Everything under the topmost adjustment layer becomes one
// image, because an adjustment changes the pixels below it. Board and design effects make the whole board
// one image.

export interface SvgInput { doc: Doc; layers: Layer[]; groups: Group[] }
export interface SvgOptions {
  /** The part of the document to write, in document pixels. */
  region: { x: number; y: number; w: number; h: number }
  /** The board being written: its layers are clipped to it and its effects apply. Null for a selection or a design without boards. */
  board: Frame | null
  /** Output pixels per document pixel. The file keeps document units in its viewBox and says this size. */
  scale: number
  transparent: boolean
  background: string | null
  /** Board and design effects. Off when exporting a selection. */
  pageFx?: boolean
  title?: string
  /** Fonts added from files on this device, embedded so the file shows them anywhere. */
  localFonts?: Map<string, Blob>
  /** How each built-in Google font is asked for (family to axis spec). */
  googleFonts?: Record<string, string>
}

const n = (v: number) => String(+(+v).toFixed(3))
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const mat = (m: DOMMatrix) => `matrix(${n(m.a)} ${n(m.b)} ${n(m.c)} ${n(m.d)} ${n(m.e)} ${n(m.f)})`

/** True when every pixel is solid, checked on a small copy (so a photo can go in as JPEG). */
function isOpaque(c: HTMLCanvasElement): boolean {
  const k = Math.min(1, 160 / Math.max(c.width, c.height))
  const t = makeCanvas(Math.max(1, Math.round(c.width * k)), Math.max(1, Math.round(c.height * k)))
  const x = ctx2d(t, true); x.drawImage(c, 0, 0, t.width, t.height)
  const d = x.getImageData(0, 0, t.width, t.height).data
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return false
  return true
}
/** Solid images go in as high-quality JPEG (a photo as PNG can be ten times the size); anything see-through as PNG. */
const imageHref = (c: HTMLCanvasElement) => (isOpaque(c) ? c.toDataURL('image/jpeg', 0.95) : c.toDataURL('image/png'))

/** A layer SVG can draw itself, exactly enough: plain type and shapes. */
function plainVector(l: Layer): boolean {
  if (l.type !== 'text' && l.type !== 'shape') return false
  if (hasFx(l.effects) || hasActiveStyles(l) || (l.mask && l.maskEnabled) || hasVectorMask(l) || l.clipId) return false
  if (l.type === 'text') return !l.onPath && !l.shadow && !(l.outline && l.outline.width > 0)
  if (l.shape === 'path' && (l.subpaths ?? []).some(sp => sp.op)) return false
  if (l.shape !== 'line' && l.stroke && l.strokeWidth > 0 && (l.strokeAlign ?? 'center') !== 'center') return false
  return true
}
/** A raster layer that goes in as one image with its masks baked in. */
const plainImage = (l: Layer): boolean => l.type === 'raster' && !hasFx(l.effects) && !hasActiveStyles(l) && !l.clipId

export async function svgFor(src: SvgInput, o: SvgOptions): Promise<string> {
  const { doc, groups } = src
  const r = o.region, k = Math.max(0.05, o.scale)
  const gmap = new Map(groups.map(g => [g.id, g]))
  const used = new Map<string, number>()
  const idFor = (name: string) => {
    const base = (name || 'layer').trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').replace(/^(\d)/, '_$1') || 'layer'
    const c = (used.get(base) ?? 0) + 1; used.set(base, c)
    return c === 1 ? base : `${base}-${c}`
  }
  const families = new Map<string, Set<string>>()

  /** Draw some layers with the engine, trim to what they cover, and place the image where it was. */
  const raster = (list: Layer[], root: string | null, withBackground = false, name = 'image'): string => {
    const c = makeCanvas(Math.max(1, Math.round(r.w * k)), Math.max(1, Math.round(r.h * k)))
    renderDoc(c, doc, list, { groups, scale: k, region: r, frameRects: o.board ? [o.board] : [], transparent: !withBackground, noShadow: true, noCache: true, fullRes: true, root, inner: true })
    const b = withBackground ? { x: 0, y: 0, w: c.width, h: c.height } : maskBounds(c)
    if (!b) return ''
    let img = c
    if (b.w !== c.width || b.h !== c.height) { img = makeCanvas(b.w, b.h); ctx2d(img).drawImage(c, -b.x, -b.y); c.width = 0; c.height = 0 }
    const out = `<image id="${idFor(name)}" x="${n(r.x + b.x / k)}" y="${n(r.y + b.y / k)}" width="${n(b.w / k)}" height="${n(b.h / k)}" preserveAspectRatio="none" xlink:href="${imageHref(img)}"/>`
    img.width = 0; img.height = 0
    return out
  }

  const look = (l: Layer, fill = 1) => {
    const op = l.opacity * fill
    return (op < 1 ? ` opacity="${n(op)}"` : '') + (l.blend && l.blend !== 'source-over' ? ` style="mix-blend-mode:${l.blend}"` : '')
  }

  const textSvg = (l: TextLayer): string => {
    const lay = textLayout(l), w = lay.w, lh = l.fontSize * l.lineHeight, indent = l.indent ?? 0
    const yAt = (y: number) => 2 + y + (lh - l.fontSize) / 2 + l.fontSize * 0.82 - (l.baselineShift ?? 0)
    const fam = families.get(l.fontFamily) ?? new Set<string>(); fam.add(`${l.italic ? 1 : 0},${l.fontWeight}`); families.set(l.fontFamily, fam)
    const style: string[] = []
    if (l.kerning === false) style.push('font-kerning:none')
    const attrs = [
      `font-family="'${esc(l.fontFamily.replace(/'/g, ''))}', Inter, system-ui, sans-serif"`, `font-size="${n(l.fontSize)}"`, `font-weight="${l.fontWeight}"`,
      l.italic ? 'font-style="italic"' : '', l.letterSpacing ? `letter-spacing="${n(l.letterSpacing)}"` : '', l.wordSpacing ? `word-spacing="${n(l.wordSpacing)}"` : '',
      l.caps === 'small' ? 'font-variant="small-caps"' : '', l.stretch && l.stretch !== 100 ? `font-stretch="${n(l.stretch)}%"` : '',
      `fill="${esc(l.color)}"`, style.length ? `style="${style.join(';')}"` : '',
    ].filter(Boolean).join(' ')
    const spans: string[] = []
    for (const line of lay.lines) {
      if (!line.text.trim()) continue
      const y = yAt(line.y), ind = line.first ? indent : 0
      if (l.align === 'justify' && line.justify && l.boxWidth) {
        const words = line.text.split(/\s+/).filter(Boolean)
        const widths = words.map(t => measureTextIn(l, t))
        const gap = words.length > 1 ? (w - 4 - ind - widths.reduce((a, b) => a + b, 0)) / (words.length - 1) : 0
        let x = 2 + ind
        words.forEach((t, i) => { spans.push(`<tspan x="${n(x)}" y="${n(y)}">${esc(t)}</tspan>`); x += widths[i] + gap })
      } else {
        const al = l.align === 'justify' ? 'left' : l.align
        const x = al === 'left' ? 2 + ind : al === 'center' ? w / 2 : w - 2
        spans.push(`<tspan x="${n(x)}" y="${n(y)}"${al === 'left' ? '' : ` text-anchor="${al === 'center' ? 'middle' : 'end'}"`}>${esc(line.text)}</tspan>`)
      }
    }
    const lines: string[] = []
    if (l.underline || l.strike) {
      const th = Math.max(1, l.fontSize / 16)
      for (const line of lay.lines) {
        if (!line.text.trim()) continue
        const ind = line.first ? indent : 0
        const lw = l.align === 'justify' && line.justify && l.boxWidth ? w - 4 - ind : line.width
        const x0 = l.align === 'center' ? w / 2 - lw / 2 : l.align === 'right' ? w - 2 - lw : 2 + ind
        const base = yAt(line.y)
        if (l.underline) lines.push(`<rect x="${n(x0)}" y="${n(base + l.fontSize * 0.1)}" width="${n(lw)}" height="${n(th)}" fill="${esc(l.color)}"/>`)
        if (l.strike) lines.push(`<rect x="${n(x0)}" y="${n(base - l.fontSize * 0.3)}" width="${n(lw)}" height="${n(th)}" fill="${esc(l.color)}"/>`)
      }
    }
    return `<g id="${idFor(l.name)}" transform="${mat(layerMatrix(l, doc))}"${look(l, l.fillOpacity ?? 1)}><text xml:space="preserve" ${attrs}>${spans.join('')}</text>${lines.join('')}</g>`
  }

  const shapeSvg = (l: ShapeLayer): string => {
    const sw = l.stroke ? l.strokeWidth : 0
    let el: string
    if (l.shape === 'ellipse') el = `<ellipse cx="${n(l.w / 2)}" cy="${n(l.h / 2)}" rx="${n(Math.max(0.5, l.w / 2 - sw / 2))}" ry="${n(Math.max(0.5, l.h / 2 - sw / 2))}"`
    else if (l.shape === 'line') el = `<line x1="0" y1="${n(l.h / 2)}" x2="${n(l.w)}" y2="${n(l.h / 2)}"`
    else if (l.shape === 'polygon') el = `<polygon points="${polygonPoints(l, sw / 2).map(p => `${n(p.x)},${n(p.y)}`).join(' ')}"`
    else if (l.shape === 'path') el = `<path d="${toSvgD(l.subpaths ?? [], 3)}"`
    else { const rr = Math.min(l.radius, l.w / 2, l.h / 2); el = `<rect x="${n(sw / 2)}" y="${n(sw / 2)}" width="${n(Math.max(1, l.w - sw))}" height="${n(Math.max(1, l.h - sw))}"${rr > 0 ? ` rx="${n(rr)}"` : ''}` }
    const paint = [`fill="${l.fill && l.shape !== 'line' ? esc(l.fill) : 'none'}"`, 'fill-rule="evenodd"']
    if (l.stroke && sw > 0) {
      paint.push(`stroke="${esc(l.stroke)}"`, `stroke-width="${n(sw)}"`, `stroke-linecap="${l.strokeCap ?? 'round'}"`, `stroke-linejoin="${l.strokeJoin ?? 'round'}"`, 'stroke-miterlimit="10"')
      if (l.strokeDash?.length) paint.push(`stroke-dasharray="${l.strokeDash.map(v => n(v * sw)).join(' ')}"`)
    }
    return `<g id="${idFor(l.name)}" transform="${mat(layerMatrix(l, doc))}"${look(l, l.fillOpacity ?? 1)}>${el} ${paint.join(' ')}/></g>`
  }

  const imageSvg = (l: RasterLayer): string => {
    const { w, h } = layerSize(l, doc)
    const t = makeCanvas(w, h), x = ctx2d(t)
    drawLayerContent(x, l)
    if (l.mask && l.maskEnabled) { x.globalCompositeOperation = 'destination-in'; x.drawImage(l.mask, 0, 0) }
    if (hasVectorMask(l)) { x.globalCompositeOperation = 'destination-in'; x.drawImage(vectorMaskCanvas(l, w, h), 0, 0) }
    const out = `<image id="${idFor(l.name)}" width="${w}" height="${h}" preserveAspectRatio="none" transform="${mat(layerMatrix(l, doc))}"${look(l, l.fillOpacity ?? 1)} xlink:href="${imageHref(t)}"/>`
    t.width = 0; t.height = 0
    return out
  }

  /** The group directly inside `container` that holds this layer (as the engine works it out). */
  const childGroup = (l: Layer, container: string | null): Group | undefined => {
    let gid = l.groupId ?? null, prev: Group | undefined, guard = 0
    while (gid && gid !== container && guard++ < 64) { const g = gmap.get(gid); if (!g) return prev; prev = g; gid = g.parentId ?? null }
    return gid === container ? prev : undefined
  }
  const outermost = (l: Layer): string | null => {
    let gid = l.groupId ?? null, top: string | null = null, guard = 0
    while (gid && guard++ < 64) { const g = gmap.get(gid); if (!g) break; top = g.id; gid = g.parentId ?? null }
    return top
  }

  const walk = (list: Layer[], container: string | null): string[] => {
    const out: string[] = []
    for (let i = 0; i < list.length; i++) {
      const l = list[i]
      const grp = childGroup(l, container)
      if (grp) {
        let end = i
        while (end + 1 < list.length && childGroup(list[end + 1], container)?.id === grp.id) end++
        const run = list.slice(i, end + 1); i = end
        if (!grp.visible) continue
        const asImage = hasFx(grp.effects) || (!!grp.styles && hasActiveStyles({ styles: grp.styles } as Layer)) || (!!grp.mask && grp.maskEnabled !== false) || run.some(x => x.type === 'adjustment' && x.visible)
        if (asImage) { out.push(raster(run, container, false, grp.name)); continue }
        const blend = grp.blend && grp.blend !== 'pass' && grp.blend !== 'source-over' ? grp.blend : ''
        out.push(`<g id="${idFor(grp.name)}"${grp.opacity < 1 ? ` opacity="${n(grp.opacity)}"` : ''}${blend ? ` style="mix-blend-mode:${blend};isolation:isolate"` : ''}>`, ...walk(run, grp.id), '</g>')
        continue
      }
      if (!l.visible || l.type === 'adjustment') continue
      if (l.type === 'text' && plainVector(l)) out.push(textSvg(l))
      else if (l.type === 'shape' && plainVector(l)) out.push(shapeSvg(l))
      else if (l.type === 'raster' && plainImage(l)) out.push(imageSvg(l))
      else out.push(raster([l], container, false, l.name))
    }
    return out
  }

  const body: string[] = []
  const pageFx = o.pageFx !== false && ((!!o.board && hasFx(o.board.effects)) || hasFx(doc.effects))
  let list = src.layers
  if (pageFx) {
    // Board or design effects run over everything on the board: the board is one image.
    const c = makeCanvas(Math.max(1, Math.round(r.w * k)), Math.max(1, Math.round(r.h * k)))
    renderDoc(c, doc, list, { groups, scale: k, region: r, frameRects: o.board ? [o.board] : [], transparent: o.transparent, noShadow: true, noCache: true, fullRes: true })
    body.push(`<image id="${idFor(o.board?.name ?? 'design')}" x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}" preserveAspectRatio="none" xlink:href="${imageHref(c)}"/>`)
    c.width = 0; c.height = 0
    list = []
  } else {
    // Everything an adjustment layer reaches becomes one image, with the background, so the result matches.
    let cut = -1
    list.forEach((l, i) => { if (l.type === 'adjustment' && l.visible && !insideHiddenGroup(l, groups)) cut = i })
    if (cut >= 0) {
      const top = outermost(list[cut])
      while (top && cut + 1 < list.length && outermost(list[cut + 1]) === top) cut++
      body.push(raster(list.slice(0, cut + 1), null, !o.transparent && !!o.background, 'Below adjustments'))
      list = list.slice(cut + 1)
    } else if (!o.transparent && o.background) body.push(`<rect id="background" x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}" fill="${esc(o.background)}"/>`)
  }
  body.push(...walk(list, null))

  // Fonts: built-in ones from Google Fonts, fonts added from files embedded whole.
  const css: string[] = []
  for (const [family, styles] of Array.from(families)) {
    const local = o.localFonts?.get(family)
    if (local) {
      const b64 = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] ?? ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(local) })
      css.push(`@font-face{font-family:'${family.replace(/'/g, '')}';src:url(data:${local.type || 'font/ttf'};base64,${b64})}`)
    } else {
      const fam = encodeURIComponent(family).replace(/%20/g, '+')
      const spec = o.googleFonts?.[family]
      // A built-in family is asked for as the Editor asks for it. Any other family is asked for one style at a
      // time, so a weight it does not have cannot stop the others loading.
      if (spec !== undefined) css.unshift(`@import url('https://fonts.googleapis.com/css2?family=${fam}${spec}&display=swap');`)
      else for (const s of Array.from(styles)) { const [it, w] = s.split(','); css.unshift(`@import url('https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${it},${w}&display=swap');`) }
    }
  }

  const W = Math.max(1, Math.round(r.w * k)), H = Math.max(1, Math.round(r.h * k))
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${n(r.w)} ${n(r.h)}">`,
    o.title ? `<title>${esc(o.title)}</title>` : '',
    '<!-- Made with Voidcanvas. Text and shapes are vectors; effects and masked layers are images. -->',
    css.length ? `<style><![CDATA[\n${css.join('\n')}\n]]></style>` : '',
    `<defs><clipPath id="vc-edge"><rect width="${n(r.w)}" height="${n(r.h)}"/></clipPath></defs>`,
    `<g clip-path="url(#vc-edge)"><g transform="translate(${n(-r.x)} ${n(-r.y)})">`,
    ...body,
    '</g></g>',
    '</svg>',
  ].filter(Boolean).join('\n')
}
