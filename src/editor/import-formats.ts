import { readPsd } from 'ag-psd'
import { ctx2d, makeCanvas, uid } from './engine'
import { nextRev, useEditor } from './store'
import type { AdjustmentLayer, Doc, Frame, Group, Layer, LayerStyles, RasterLayer, TextLayer } from './types'
import { ADJUSTMENT_DEFAULTS } from './engine'
import { ADJUSTMENT_LABELS } from './store'
import { STYLE_KINDS } from './styles'

const REV = () => nextRev()
const baseLayer = (name: string) => ({
  id: uid(), name, visible: true, locked: false, opacity: 1, blend: 'source-over' as const,
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, groupId: null as string | null, rev: REV(),
})

// ag-psd reports blend modes by name. Modes Voidcanvas cannot draw yet fall back to the closest one and are listed in the report.
const PSD_BLEND: Record<string, Layer['blend']> = {
  normal: 'source-over', 'pass through': 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten',
  hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity', difference: 'difference', exclusion: 'exclusion',
  'color dodge': 'color-dodge', 'color burn': 'color-burn', 'hard light': 'hard-light', 'soft light': 'soft-light',
}
const NEAR_BLEND: Record<string, Layer['blend']> = { 'linear burn': 'multiply', 'darker color': 'darken', 'linear dodge': 'screen', 'lighter color': 'lighten', 'vivid light': 'overlay', 'linear light': 'overlay', 'pin light': 'hard-light', 'hard mix': 'hard-light', subtract: 'difference', divide: 'color-dodge', dissolve: 'source-over' }

/** Photoshop artboard background: 1 white, 2 black, 3 transparent, 4 custom colour. */
function artboardBackground(ab: any): string | null {
  const t = ab?.backgroundType
  if (t === 3) return null
  if (t === 2) return '#000000'
  if (t === 4 && ab.color) return hexOf(ab.color)
  return '#ffffff'
}

export interface ImportReport { name: string; kept: string[]; changed: string[]; missing: string[] }

function hexOf(c: any): string {
  if (!c) return '#000000'
  const v = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')
  if ('fr' in c) return '#' + v(c.fr * 255) + v(c.fg * 255) + v(c.fb * 255)
  if ('r' in c) return '#' + v(c.r) + v(c.g) + v(c.b)
  return '#000000'
}
const uv = (x: any, d = 0) => (typeof x === 'number' ? x : x?.value ?? d)

/** PostScript names like "Montserrat-SemiBoldItalic" to a family, weight and italic flag. */
function parseFont(ps?: string): { family: string; weight: number; italic: boolean } {
  if (!ps) return { family: 'Inter', weight: 400, italic: false }
  const [fam, style = ''] = ps.split('-')
  const family = fam.replace(/MT$|PS$|Std$|Pro$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  const st = style.toLowerCase()
  const weight = /thin|hairline/.test(st) ? 100 : /extralight|ultralight/.test(st) ? 200 : /light/.test(st) ? 300 : /medium/.test(st) ? 500 : /semibold|demibold/.test(st) ? 600 : /extrabold|ultrabold|heavy/.test(st) ? 800 : /black/.test(st) ? 900 : /bold/.test(st) ? 700 : 400
  return { family, weight, italic: /italic|oblique/.test(st) }
}

function mapBlend(mode: string | undefined, report: ImportReport): Layer['blend'] {
  if (!mode) return 'source-over'
  if (PSD_BLEND[mode]) return PSD_BLEND[mode]
  report.changed.push(`Blend mode "${mode}" shown as the nearest match`)
  return NEAR_BLEND[mode] ?? 'source-over'
}

/** Turn a PSD mask (greyscale, own bounds) into an alpha mask sized to the layer. */
function maskFor(n: any, w: number, h: number, ox: number, oy: number): HTMLCanvasElement | null {
  const m = n.mask
  if (!m || m.disabled || (!m.canvas && m.defaultColor === undefined)) return null
  const out = makeCanvas(w, h), x = ctx2d(out, true)
  const img = x.createImageData(w, h)
  const def = m.defaultColor ?? 255
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = def
  if (m.canvas) {
    const mc = m.canvas as HTMLCanvasElement, md = ctx2d(mc, true).getImageData(0, 0, mc.width, mc.height).data
    const dx = (m.left ?? 0) - ox, dy = (m.top ?? 0) - oy
    for (let y = 0; y < mc.height; y++) {
      const ty = y + dy; if (ty < 0 || ty >= h) continue
      for (let xx = 0; xx < mc.width; xx++) { const tx = xx + dx; if (tx < 0 || tx >= w) continue; img.data[(ty * w + tx) * 4 + 3] = md[(y * mc.width + xx) * 4] }
    }
  }
  for (let i = 0; i < img.data.length; i += 4) img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
  x.putImageData(img, 0, 0)
  return out
}

function mapEffects(fx: any, report: ImportReport): LayerStyles | null {
  if (!fx || fx.disabled) return null
  const st: LayerStyles = { order: [...STYLE_KINDS] }
  let any = false
  const ds = fx.dropShadow?.[0]
  if (ds) { st.dropShadow = { on: ds.enabled !== false, opacity: ds.opacity ?? 0.75, blend: PSD_BLEND[ds.blendMode] ?? 'multiply', color: hexOf(ds.color), angle: ds.angle ?? 120, distance: uv(ds.distance, 5), size: uv(ds.size, 5), spread: uv(ds.choke, 0) }; any = true }
  const is = fx.innerShadow?.[0]
  if (is) { st.innerShadow = { on: is.enabled !== false, opacity: is.opacity ?? 0.75, blend: PSD_BLEND[is.blendMode] ?? 'multiply', color: hexOf(is.color), angle: is.angle ?? 120, distance: uv(is.distance, 5), size: uv(is.size, 5), spread: uv(is.choke, 0) }; any = true }
  if (fx.outerGlow) { const g = fx.outerGlow; st.outerGlow = { on: g.enabled !== false, opacity: g.opacity ?? 0.75, blend: PSD_BLEND[g.blendMode] ?? 'screen', color: hexOf(g.color), size: uv(g.size, 10), spread: uv(g.choke, 0) }; any = true }
  if (fx.innerGlow) { const g = fx.innerGlow; st.innerGlow = { on: g.enabled !== false, opacity: g.opacity ?? 0.75, blend: PSD_BLEND[g.blendMode] ?? 'screen', color: hexOf(g.color), size: uv(g.size, 10), spread: uv(g.choke, 0) }; any = true }
  const sk = fx.stroke?.[0]
  if (sk) {
    if (sk.fillType && sk.fillType !== 'color') report.changed.push('Gradient or pattern strokes shown as a solid colour')
    st.stroke = { on: sk.enabled !== false, opacity: sk.opacity ?? 1, blend: PSD_BLEND[sk.blendMode] ?? 'source-over', color: hexOf(sk.color ?? sk.gradient?.colorStops?.[0]?.color), size: uv(sk.size, 3), position: sk.position ?? 'outside' }; any = true
  }
  const sf = fx.solidFill?.[0]
  if (sf) { st.colorOverlay = { on: sf.enabled !== false, opacity: sf.opacity ?? 1, blend: PSD_BLEND[sf.blendMode] ?? 'source-over', color: hexOf(sf.color) }; any = true }
  const go = fx.gradientOverlay?.[0]
  if (go) {
    const stops = go.gradient?.colorStops ?? []
    st.gradientOverlay = { on: go.enabled !== false, opacity: go.opacity ?? 1, blend: PSD_BLEND[go.blendMode] ?? 'source-over', from: hexOf(stops[0]?.color), to: hexOf(stops[stops.length - 1]?.color ?? { r: 255, g: 255, b: 255 }), angle: go.angle ?? 90, scale: go.scale ?? 100 }
    if (go.reverse) [st.gradientOverlay.from, st.gradientOverlay.to] = [st.gradientOverlay.to, st.gradientOverlay.from]
    if (stops.length > 2) report.changed.push('Gradient overlays with more than two colours use their first and last colour')
    any = true
  }
  if (fx.bevel) { const b = fx.bevel; st.bevel = { on: b.enabled !== false, opacity: b.highlightOpacity ?? 0.75, blend: 'source-over', size: uv(b.size, 5), depth: b.strength ?? 100, angle: b.angle ?? 120, highlight: hexOf(b.highlightColor ?? { r: 255, g: 255, b: 255 }), shadow: hexOf(b.shadowColor), soften: uv(b.soften, 0) }; any = true }
  if (fx.satin) report.missing.push('Satin effect')
  if (fx.patternOverlay) report.missing.push('Pattern overlay effect')
  return any ? st : null
}

function mapAdjustment(a: any, report: ImportReport): Partial<AdjustmentLayer> | null {
  const lv = (c: any): [number, number, number] | undefined => c ? [c.shadowInput ?? 0, c.highlightInput ?? 255, Math.round((c.midtoneInput ?? 1) * 100)] : undefined
  const cv = (c: any): [number, number][] | undefined => c?.length ? c.map((p: any) => [p.input, p.output]) : undefined
  switch (a?.type) {
    case 'brightness/contrast': return { kind: 'brightnessContrast', values: { brightness: Math.max(-100, Math.min(100, (a.brightness ?? 0) * 0.66)), contrast: Math.max(-100, Math.min(100, a.contrast ?? 0)) } }
    case 'levels': { const m = lv(a.rgb) ?? [0, 255, 100]; return { kind: 'levels', values: { black: m[0], white: m[1], gamma: m[2] }, channelLevels: { r: lv(a.red), g: lv(a.green), b: lv(a.blue) } } }
    case 'curves': return { kind: 'curves', values: {}, points: cv(a.rgb) ?? [[0, 0], [255, 255]], channelPoints: { r: cv(a.red), g: cv(a.green), b: cv(a.blue) } }
    case 'exposure': return { kind: 'exposure', values: { exposure: Math.round((a.exposure ?? 0) * 100), offset: Math.round((a.offset ?? 0) * 100), gamma: Math.round((a.gamma ?? 1) * 100) } }
    case 'vibrance': return { kind: 'vibrance', values: { vibrance: a.vibrance ?? 0, saturation: a.saturation ?? 0 } }
    case 'hue/saturation': {
      const b: any = {}
      for (const k of ['reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas']) if (a[k] && (a[k].hue || a[k].saturation || a[k].lightness)) b[k] = { hue: a[k].hue, saturation: a[k].saturation, lightness: a[k].lightness }
      return { kind: 'hueSaturation', values: { hue: a.master?.hue ?? 0, saturation: a.master?.saturation ?? 0, lightness: a.master?.lightness ?? 0 }, bands: b }
    }
    case 'color balance': {
      const v = (x: any) => x ?? { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }
      const s0 = v(a.shadows), m0 = v(a.midtones), h0 = v(a.highlights)
      return { kind: 'colorBalance', values: { sCR: s0.cyanRed, sMG: s0.magentaGreen, sYB: s0.yellowBlue, mCR: m0.cyanRed, mMG: m0.magentaGreen, mYB: m0.yellowBlue, hCR: h0.cyanRed, hMG: h0.magentaGreen, hYB: h0.yellowBlue, preserve: a.preserveLuminosity === false ? 0 : 1 } }
    }
    case 'black & white': if (a.useTint) report.changed.push('Black and white tint left out'); return { kind: 'blackWhite', values: { amount: 100 } }
    case 'photo filter': return { kind: 'photoFilter', values: { density: a.density ?? 25, preserve: a.preserveLuminosity === false ? 0 : 1 }, colors: [hexOf(a.color)] }
    case 'channel mixer': {
      const c = (x: any, d: number[]) => x ? [x.red, x.green, x.blue] : d
      if (a.monochrome) { const g = c(a.gray, [40, 40, 20]); return { kind: 'channelMixer', values: { rr: g[0], rg: g[1], rb: g[2], gr: 0, gg: 100, gb: 0, br: 0, bg: 0, bb: 100, mono: 1 } } }
      const r = c(a.red, [100, 0, 0]), g = c(a.green, [0, 100, 0]), bb = c(a.blue, [0, 0, 100])
      return { kind: 'channelMixer', values: { rr: r[0], rg: r[1], rb: r[2], gr: g[0], gg: g[1], gb: g[2], br: bb[0], bg: bb[1], bb: bb[2], mono: 0 } }
    }
    case 'invert': return { kind: 'invert', values: {} }
    case 'posterize': return { kind: 'posterize', values: { levels: a.levels ?? 4 } }
    case 'threshold': return { kind: 'threshold', values: { level: a.level ?? 128 } }
    case 'gradient map': return { kind: 'gradientMap', values: { reverse: a.reverse ? 1 : 0 }, colors: (a.colorStops ?? []).map((s: any) => hexOf(s.color)).slice(0, 5) }
    default: report.missing.push(`Adjustment "${a?.type ?? 'unknown'}"`); return null
  }
}

/** Editable text from a PSD text layer, when it is simple enough to rebuild faithfully. */
function textFrom(n: any, report: ImportReport): Partial<TextLayer> | null {
  const t = n.text
  if (!t?.text) return null
  const runs: any[] = t.styleRuns ?? []
  const fonts = new Set(runs.map(r => r.style?.font?.name ?? t.style?.font?.name)), sizes = new Set(runs.map(r => r.style?.fontSize ?? t.style?.fontSize)), colors = new Set(runs.map(r => hexOf(r.style?.fillColor ?? t.style?.fillColor)))
  if (fonts.size > 1 || sizes.size > 1 || colors.size > 1 || t.warp?.style && t.warp.style !== 'none' || t.textPath) { report.changed.push(`Text "${String(t.text).slice(0, 24)}" has mixed styles or a warp, so it was kept as pixels`); return null }
  const tr: number[] = t.transform ?? [1, 0, 0, 1, n.left ?? 0, n.top ?? 0]
  const scale = Math.hypot(tr[0], tr[1])
  if (Math.abs(tr[0] * tr[3] - tr[1] * tr[2] - scale * scale) > 0.05 * scale * scale) return null
  const st = runs[0]?.style ?? t.style ?? {}
  const f = parseFont(st.font?.name)
  const fontSize = (st.fontSize ?? 24) * scale
  const lineHeight = st.autoLeading === false && st.leading ? st.leading / (st.fontSize ?? 24) : 1.2
  const just = t.paragraphStyle?.justification ?? 'left'
  const align = just === 'center' ? 'center' : just === 'right' ? 'right' : just?.startsWith('justify') ? 'justify' : 'left'
  const box = t.shapeType === 'box' && t.boxBounds ? (t.boxBounds[2] - t.boxBounds[0]) * scale : null
  return {
    text: String(t.text).replace(/\r/g, '\n'), fontFamily: f.family, fontWeight: st.fauxBold ? 700 : f.weight, italic: f.italic || !!st.fauxItalic,
    fontSize, color: hexOf(st.fillColor), align, lineHeight, letterSpacing: ((st.tracking ?? 0) / 1000) * fontSize, boxWidth: box,
    underline: !!st.underline, strike: !!st.strikethrough, caps: st.fontCaps === 2 ? 'all' : st.fontCaps === 1 ? 'small' : 'none',
    rotation: Math.atan2(tr[1], tr[0]),
    // Photoshop anchors point text at the first baseline; boxes at their top-left.
    x: (box ? tr[4] + t.boxBounds[0] * scale : tr[4] - (align === 'center' ? 0 : 0)) - 2,
    y: box ? tr[5] + t.boxBounds[1] * scale - 2 : tr[5] - (2 + (fontSize * lineHeight - fontSize) / 2 + fontSize * 0.82),
  }
}

/**
 * Open a .psd as a real layered document: pixels, masks, text, groups (nested), adjustment layers, layer styles,
 * clipping, locks, blend modes and artboards. Anything that cannot be rebuilt is kept as pixels and listed in a
 * report, so nothing changes silently.
 */
export async function importPsd(file: Blob, name: string) {
  const ed = useEditor.getState()
  ed.setBusy('Opening PSD')
  await new Promise(r => setTimeout(r, 20))
  let psd: any
  try { psd = readPsd(await file.arrayBuffer(), { skipThumbnail: true, useImageData: false }) }
  catch (e) { console.error(e); ed.setBusy(null); ed.notify('Could not read that PSD. It may be damaged, or use a feature we cannot read yet.'); return }
  const W = psd.width, H = psd.height
  const docName = name.replace(/\.psd$/i, '')
  const report: ImportReport = { name, kept: [], changed: [], missing: [] }
  const layers: Layer[] = []
  const groups: Group[] = []
  const counts = { pixels: 0, text: 0, adj: 0, masks: 0, styles: 0, groups: 0, smart: 0, vector: 0 }
  if (psd.bitsPerChannel && psd.bitsPerChannel > 8) report.changed.push(`${psd.bitsPerChannel}-bit colour converted to 8-bit`)
  if (psd.colorMode !== undefined && psd.colorMode !== 3) report.changed.push('Colour mode converted to RGB')

  const walk = (nodes: any[], groupId: string | null, frameId: string | null) => {
    for (const n of nodes) {
      if (n.children) {
        const g: Group = { id: uid(), name: n.name || 'Group', visible: n.hidden !== true, opacity: n.opacity ?? 1, collapsed: !n.opened, parentId: groupId, blend: n.blendMode === 'pass through' || !n.blendMode ? 'pass' : mapBlend(n.blendMode, report) }
        groups.push(g); counts.groups++
        if (n.mask) report.changed.push(`Group mask on "${g.name}" left out`)
        walk(n.children, g.id, frameId)
        continue
      }
      const common = {
        ...baseLayer(n.name || 'Layer'), opacity: n.opacity ?? 1, visible: n.hidden !== true, blend: mapBlend(n.blendMode, report), groupId, frameId,
        label: n.layerColor && n.layerColor !== 'none' ? n.layerColor : null,
        lockAlpha: !!n.protected?.transparency, lockPixels: !!n.protected?.composite, lockPosition: !!n.protected?.position,
        fillOpacity: n.fillOpacity ?? 1,
      }
      const clipTo = () => {
        // Photoshop clips to the nearest unclipped layer below in the same group.
        for (let i = layers.length - 1; i >= 0; i--) { const b = layers[i]; if ((b.groupId ?? null) !== groupId) break; if (!b.clipId) return b.type === 'adjustment' ? null : b.id }
        return null
      }
      if (n.adjustment) {
        const adj = mapAdjustment(n.adjustment, report)
        if (!adj) continue
        const l = { ...common, type: 'adjustment', kind: adj.kind!, values: { ...(ADJUSTMENT_DEFAULTS[adj.kind!] ?? {}), ...adj.values }, ...adj, mask: maskFor(n, W, H, 0, 0), name: n.name || ADJUSTMENT_LABELS[adj.kind!] } as AdjustmentLayer
        if (n.clipping) report.changed.push(`Adjustment "${l.name}" was clipped to one layer; it now affects everything below`)
        layers.push(l); counts.adj++
        continue
      }
      const c = n.canvas as HTMLCanvasElement | undefined
      if (n.text) {
        const t = textFrom(n, report)
        if (t) {
          const l = { ...common, type: 'text', text: '', fontFamily: 'Inter', fontSize: 24, fontWeight: 400, italic: false, color: '#000000', align: 'left', lineHeight: 1.2, letterSpacing: 0, ...t, styles: mapEffects(n.effects, report) } as TextLayer
          if (n.clipping) { const b = clipTo(); if (b) l.clipId = b }
          layers.push(l); counts.text++; if (l.styles) counts.styles++
          continue
        }
      }
      if (!c || !c.width || !c.height) continue
      if (n.placedLayer) counts.smart++
      if (n.vectorMask || n.vectorFill) counts.vector++
      const l = { ...common, type: 'raster', canvas: c, x: n.left ?? 0, y: n.top ?? 0, mask: maskFor(n, c.width, c.height, n.left ?? 0, n.top ?? 0), styles: mapEffects(n.effects, report) } as RasterLayer
      if (l.mask) counts.masks++
      if (l.styles) counts.styles++
      if (n.clipping) { const b = clipTo(); if (b) l.clipId = b; else report.changed.push(`"${l.name}" was clipped to an adjustment layer; the clip was removed`) }
      layers.push(l); counts.pixels++
    }
  }

  const finish = () => {
    if (counts.pixels) report.kept.push(`${counts.pixels} pixel layer${counts.pixels === 1 ? '' : 's'}`)
    if (counts.text) report.kept.push(`${counts.text} text layer${counts.text === 1 ? '' : 's'}, still editable`)
    if (counts.adj) report.kept.push(`${counts.adj} adjustment layer${counts.adj === 1 ? '' : 's'}, still editable`)
    if (counts.groups) report.kept.push(`${counts.groups} group${counts.groups === 1 ? '' : 's'}, nesting kept`)
    if (counts.masks) report.kept.push(`${counts.masks} layer mask${counts.masks === 1 ? '' : 's'}`)
    if (counts.styles) report.kept.push(`Layer styles on ${counts.styles} layer${counts.styles === 1 ? '' : 's'}, still editable`)
    if (counts.smart) report.changed.push(`${counts.smart} smart object${counts.smart === 1 ? '' : 's'} kept as pixels (editing the contents is not supported yet)`)
    if (counts.vector) report.changed.push(`${counts.vector} vector shape${counts.vector === 1 ? '' : 's'} kept as pixels`)
    report.changed = Array.from(new Set(report.changed)); report.missing = Array.from(new Set(report.missing))
    ed.setBusy(null)
    if (report.changed.length || report.missing.length) window.dispatchEvent(new CustomEvent('vc:open', { detail: { name: 'importReport', props: report } }))
  }

  const top: any[] = psd.children ?? []
  const artboards = top.filter(n => n.artboard?.rect)

  if (!artboards.length) {
    walk(top, null, null)
    if (!layers.length) { ed.setBusy(null); ed.notify('That PSD has no layers we can read. Try flattening it first.'); return }
    for (const l of layers) delete (l as any).frameId
    ed.newDoc({ name: docName, width: W, height: H, background: null })
    useEditor.setState({ layers, groups, activeId: layers[layers.length - 1].id, selectedIds: [layers[layers.length - 1].id], docRev: useEditor.getState().docRev + 1 })
    useEditor.getState().commit('Import PSD')
    useEditor.setState({ dirty: true })
    ed.notify(`Opened ${layers.length} layer${layers.length === 1 ? '' : 's'} from the PSD.`)
    finish()
    return
  }

  const frames: Frame[] = []
  for (const n of top) {
    if (n.artboard?.rect) {
      const r = n.artboard.rect
      const f: Frame = { id: uid(), name: n.name || `Board ${frames.length + 1}`, x: r.left, y: r.top, width: Math.max(1, r.right - r.left), height: Math.max(1, r.bottom - r.top), background: artboardBackground(n.artboard) }
      frames.push(f)
      walk(n.children ?? [], null, f.id)
    } else walk([n], null, null)
  }
  if (!layers.length && !frames.length) { ed.setBusy(null); ed.notify('That PSD has no layers we can read. Try flattening it first.'); return }

  const boxes = [...frames.map(f => ({ x: f.x, y: f.y, r: f.x + f.width, b: f.y + f.height })),
    ...layers.filter(l => !l.frameId && l.type === 'raster').map(l => { const c = (l as RasterLayer).canvas; return { x: l.x, y: l.y, r: l.x + c.width, b: l.y + c.height } })]
  const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y))
  const maxX = Math.max(...boxes.map(b => b.r)), maxY = Math.max(...boxes.map(b => b.b))
  for (const f of frames) { f.x -= minX; f.y -= minY }
  for (const l of layers) { if (l.type !== 'adjustment') { l.x -= minX; l.y -= minY } }
  const doc: Doc = { id: uid(), name: docName, width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY), background: null, frames }
  ed.loadFramed(doc, layers, undefined, groups)
  useEditor.setState({ dirty: true })
  const loose = layers.filter(l => !l.frameId).length
  ed.notify(`Opened ${frames.length} board${frames.length === 1 ? '' : 's'} from the PSD${loose ? `, plus ${loose} layer${loose === 1 ? '' : 's'} outside them` : ''}.`)
  finish()
}

/** Render each PDF page to its own raster layer, stacked, page 1 on top. */
export async function importPdf(file: Blob, name: string) {
  const ed = useEditor.getState()
  ed.setBusy('Opening PDF')
  try {
    const pdfjs: any = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: HTMLCanvasElement[] = []
    const scaleFor = (vw: number) => Math.min(2, Math.max(1, 1600 / vw))
    for (let i = 1; i <= doc.numPages; i++) {
      ed.setBusy(`Rendering page ${i} of ${doc.numPages}`)
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: scaleFor(base.width) })
      const c = makeCanvas(viewport.width, viewport.height)
      await page.render({ canvasContext: ctx2d(c), viewport }).promise
      pages.push(c)
    }
    if (!pages.length) { ed.notify('That PDF has no pages we can read.'); return }
    const w = pages[0].width, h = pages[0].height
    ed.newDoc({ name: name.replace(/\.pdf$/i, ''), width: w, height: h, background: '#ffffff' })
    const layers: Layer[] = pages.map((c, i) => ({ ...baseLayer(`Page ${i + 1}`), type: 'raster', canvas: c, visible: i === 0 } as RasterLayer))
    useEditor.setState({ layers, activeId: layers[0].id, selectedIds: [layers[0].id] })
    useEditor.getState().commit('Import PDF')
    useEditor.setState({ dirty: true })
    ed.notify(doc.numPages > 1 ? `Imported ${doc.numPages} pages as layers. Only page 1 is shown; turn the others on in the Layers panel.` : 'PDF imported.')
  } catch (e) {
    console.error(e); ed.notify('Could not open that PDF. It may be password protected.')
  } finally { ed.setBusy(null) }
}

export function importAny(files: File[]) {
  for (const f of files) {
    const n = f.name.toLowerCase()
    if (n.endsWith('.psd')) importPsd(f, f.name)
    else if (n.endsWith('.pdf')) importPdf(f, f.name)
    else { /* handled by the normal image importer */ }
  }
}
