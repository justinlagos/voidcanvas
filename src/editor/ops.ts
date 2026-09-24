import { cloneCanvas, ctx2d, drawLayerContent, fullMaskSized, layerMatrix, layerSize, makeCanvas, maskBounds, paintPathOps, pathPolyline, renderDoc, tracePath, uid, vectorMaskCanvas } from './engine'
import { base, nextRev, useEditor } from './store'
import { morph } from './styles'
import type { Doc, Layer, LayerStyles, PathNode, PathOp, RasterLayer, ShapeLayer, SubPath, TextLayer, VectorPath } from './types'
import { docSubsToLayerPatch, docSubsToTextPathPatch, docToVmask, layerSubsToDoc, reverseSub, samplePath, simplifySub, toSvgD } from './pen'

// Document-wide operations used by the menus: image and canvas size, rotation, selection modifiers,
// channels, paths and fills. Each one is a single undo step.

const st = () => useEditor.getState()

export function composite(opts: { transparent?: boolean } = {}): HTMLCanvasElement | null {
  const s = st(); if (!s.doc) return null
  const c = makeCanvas(s.doc.width, s.doc.height)
  renderDoc(c, s.doc, s.layers, { groups: s.groups, noCache: true, transparent: opts.transparent, frameRects: s.doc.frames?.length ? s.doc.frames : undefined, noShadow: true })
  return c
}

// ─── Image and canvas ──────────────────────────────────────────────

export function imageSize(w: number, h: number) {
  const s = st(); const doc = s.doc; if (!doc) return
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const kx = w / doc.width, ky = h / doc.height
  const scaleCanvas = (c: HTMLCanvasElement) => { const o = makeCanvas(c.width * kx, c.height * ky), x = ctx2d(o); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, o.width, o.height); return o }
  const layers = s.layers.map(l => {
    if (l.type === 'adjustment') return { ...l, mask: l.mask ? scaleCanvas(l.mask) : null } as Layer
    const patch: any = { x: l.x * kx, y: l.y * ky }
    if (l.type === 'text') { patch.fontSize = l.fontSize * Math.min(kx, ky); if (l.boxWidth) patch.boxWidth = l.boxWidth * kx }
    else if (l.type === 'shape') { patch.w = l.w * kx; patch.h = l.h * ky; patch.strokeWidth = l.strokeWidth * Math.min(kx, ky); patch.radius = l.radius * Math.min(kx, ky); if (l.subpaths) patch.subpaths = scalePaths(l.subpaths, kx, ky) }
    else { patch.scaleX = l.scaleX * kx; patch.scaleY = l.scaleY * ky }
    return { ...l, ...patch } as Layer
  })
  const nd: Doc = { ...doc, width: w, height: h, frames: doc.frames?.map(f => ({ ...f, x: f.x * kx, y: f.y * ky, width: Math.round(f.width * kx), height: Math.round(f.height * ky) })), guides: doc.guides ? { v: doc.guides.v.map(g => g * kx), h: doc.guides.h.map(g => g * ky) } : undefined, paths: doc.paths?.map(p => ({ ...p, subpaths: scalePaths(p.subpaths, kx, ky) })), channels: doc.channels?.map(c => ({ ...c, mask: scaleCanvas(c.mask) })) }
  s.replaceAll({ doc: nd, layers, selection: s.selection ? scaleCanvas(s.selection) : null }, 'Image size')
}

function scalePaths(sp: SubPath[], kx: number, ky: number, dx = 0, dy = 0): SubPath[] {
  return sp.map(p => ({ ...p, nodes: p.nodes.map(n => ({ ...n, x: n.x * kx + dx, y: n.y * ky + dy, inX: n.inX * kx + dx, inY: n.inY * ky + dy, outX: n.outX * kx + dx, outY: n.outY * ky + dy })) }))
}

/** anchor: 0..8, left-to-right, top-to-bottom. */
export function canvasSize(w: number, h: number, anchor = 4, fill: string | null = null) {
  const s = st(); const doc = s.doc; if (!doc) return
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const ax = anchor % 3, ay = Math.floor(anchor / 3)
  const dx = Math.round(((w - doc.width) * ax) / 2), dy = Math.round(((h - doc.height) * ay) / 2)
  const shiftCanvas = (c: HTMLCanvasElement, bgFill = false) => { const o = makeCanvas(w, h), x = ctx2d(o); if (bgFill) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h) } x.drawImage(c, dx, dy); return o }
  const layers = s.layers.map(l => {
    if (l.type === 'adjustment') return { ...l, mask: l.mask ? shiftCanvas(l.mask, true) : null } as Layer
    return { ...l, x: l.x + dx, y: l.y + dy } as Layer
  })
  const nd: Doc = { ...doc, width: w, height: h, background: fill === null ? doc.background : fill, guides: doc.guides ? { v: doc.guides.v.map(g => g + dx), h: doc.guides.h.map(g => g + dy) } : undefined, paths: doc.paths?.map(p => ({ ...p, subpaths: scalePaths(p.subpaths, 1, 1, dx, dy) })), channels: doc.channels?.map(c => ({ ...c, mask: shiftCanvas(c.mask) })) }
  s.replaceAll({ doc: nd, layers, selection: s.selection ? shiftCanvas(s.selection) : null }, 'Canvas size')
}

/** Rotate or flip the whole image. Every layer turns around the document centre. */
export function rotateCanvas(deg: 90 | -90 | 180) {
  const s = st(); const doc = s.doc; if (!doc) return
  const W = doc.width, H = doc.height
  const nw = deg === 180 ? W : H, nh = deg === 180 ? H : W
  const rad = (deg * Math.PI) / 180
  const turnPoint = (x: number, y: number) => {
    const cx = x - W / 2, cy = y - H / 2
    const rx = cx * Math.cos(rad) - cy * Math.sin(rad), ry = cx * Math.sin(rad) + cy * Math.cos(rad)
    return { x: rx + nw / 2, y: ry + nh / 2 }
  }
  const turnCanvas = (c: HTMLCanvasElement) => { const o = makeCanvas(nw, nh), x = ctx2d(o); x.translate(nw / 2, nh / 2); x.rotate(rad); x.drawImage(c, -W / 2, -H / 2); return o }
  const layers = s.layers.map(l => {
    if (l.type === 'adjustment') return { ...l, mask: l.mask ? turnCanvas(l.mask) : null } as Layer
    const { w, h } = layerSize(l, doc)
    const c = turnPoint(l.x + (w * l.scaleX) / 2, l.y + (h * l.scaleY) / 2)
    return { ...l, rotation: l.rotation + rad, x: c.x - (w * l.scaleX) / 2, y: c.y - (h * l.scaleY) / 2 } as Layer
  })
  const nd: Doc = { ...doc, width: nw, height: nh, guides: undefined, frames: doc.frames?.map(f => { const c = turnPoint(f.x + f.width / 2, f.y + f.height / 2); const fw = deg === 180 ? f.width : f.height, fh = deg === 180 ? f.height : f.width; return { ...f, x: c.x - fw / 2, y: c.y - fh / 2, width: fw, height: fh } }), channels: doc.channels?.map(ch => ({ ...ch, mask: turnCanvas(ch.mask) })) }
  s.replaceAll({ doc: nd, layers, selection: s.selection ? turnCanvas(s.selection) : null }, deg === 180 ? 'Rotate 180°' : 'Rotate 90°')
}

export function flipCanvas(axis: 'h' | 'v') {
  const s = st(); const doc = s.doc; if (!doc) return
  const flipC = (c: HTMLCanvasElement) => { const o = makeCanvas(c.width, c.height), x = ctx2d(o); if (axis === 'h') { x.translate(c.width, 0); x.scale(-1, 1) } else { x.translate(0, c.height); x.scale(1, -1) } x.drawImage(c, 0, 0); return o }
  const layers = s.layers.map(l => {
    if (l.type === 'adjustment') return { ...l, mask: l.mask ? flipC(l.mask) : null } as Layer
    const { w, h } = layerSize(l, doc)
    const bw = w * l.scaleX, bh = h * l.scaleY
    // Mirror the layer's content, then its position.
    if (l.type === 'raster') return { ...l, canvas: flipC(l.canvas), mask: l.mask ? flipC(l.mask) : null, rotation: -l.rotation, x: axis === 'h' ? doc.width - l.x - bw : l.x, y: axis === 'v' ? doc.height - l.y - bh : l.y } as Layer
    return { ...l, rotation: -l.rotation, x: axis === 'h' ? doc.width - l.x - bw : l.x, y: axis === 'v' ? doc.height - l.y - bh : l.y } as Layer
  })
  s.replaceAll({ doc: { ...doc, channels: doc.channels?.map(c => ({ ...c, mask: flipC(c.mask) })) }, layers, selection: s.selection ? flipC(s.selection) : null }, axis === 'h' ? 'Flip canvas horizontal' : 'Flip canvas vertical')
}

/** Crop the canvas to the visible pixels. */
export function trimTransparent() {
  const c = composite({ transparent: true }); if (!c) return
  const b = maskBounds(c)
  if (!b) { st().notify('Nothing to trim: the design is empty.'); return }
  st().cropTo(b.x, b.y, b.w, b.h)
}

export function cropToSelection() {
  const s = st(); if (!s.selection) { s.notify('Make a selection first.'); return }
  const b = maskBounds(s.selection); if (!b) return
  s.cropTo(b.x, b.y, b.w, b.h)
}

export function flatten() {
  const s = st(); const doc = s.doc; if (!doc) return
  const c = composite(); if (!c) return
  const l: RasterLayer = { ...base('Background'), type: 'raster', canvas: c }
  s.replaceAll({ layers: [l], groups: [] }, 'Flatten image')
  useEditor.setState({ activeId: l.id, selectedIds: [l.id] })
}

export function mergeVisible() {
  const s = st(); const doc = s.doc; if (!doc) return
  const vis = s.layers.filter(l => l.visible)
  if (vis.length < 2) return
  const c = makeCanvas(doc.width, doc.height)
  renderDoc(c, doc, vis, { groups: s.groups, noCache: true, transparent: true })
  const l: RasterLayer = { ...base('Merged'), type: 'raster', canvas: c }
  s.replaceAll({ layers: [...s.layers.filter(x => !x.visible), l], groups: s.groups }, 'Merge visible')
  useEditor.setState({ activeId: l.id, selectedIds: [l.id] })
}

/** Ctrl+Alt+Shift+E: a new layer holding everything visible, layers kept. */
export function stampVisible() {
  const s = st(); const doc = s.doc; if (!doc) return
  const c = composite({ transparent: true }); if (!c) return
  s.addLayer({ ...base('Stamped'), type: 'raster', canvas: c }, 'Stamp visible')
}

// ─── Selection ─────────────────────────────────────────────────────

export function selectLayerPixels(id: string, mode: 'new' | 'add' | 'sub' = 'new') {
  const s = st(); const doc = s.doc; const l = s.layers.find(x => x.id === id); if (!doc || !l || l.type === 'adjustment') return
  const m = makeCanvas(doc.width, doc.height), x = ctx2d(m)
  renderDoc(m, doc, [{ ...l, visible: true, opacity: 1, blend: 'source-over', styles: null } as Layer], { transparent: true, noCache: true, frameRects: [] })
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, m.width, m.height)
  combineSelection(m, mode, 'Select layer pixels')
}

export function combineSelection(shape: HTMLCanvasElement, mode: 'new' | 'add' | 'sub' | 'intersect', label: string) {
  const s = st()
  if (mode === 'new' || !s.selection) { s.setSelection(shape, label); return }
  const c = cloneCanvas(s.selection), x = ctx2d(c)
  x.globalCompositeOperation = mode === 'add' ? 'source-over' : mode === 'sub' ? 'destination-out' : 'destination-in'
  x.drawImage(shape, 0, 0)
  s.setSelection(c, label)
}

export function modifySelection(kind: 'expand' | 'contract' | 'feather' | 'smooth' | 'border', px: number) {
  const s = st(); if (!s.selection) { s.notify('Make a selection first.'); return }
  const sel = s.selection
  let out: HTMLCanvasElement
  if (kind === 'expand') out = morph(sel, px)
  else if (kind === 'contract') out = morph(sel, -px)
  else if (kind === 'border') { out = morph(sel, px / 2); const x = ctx2d(out); x.globalCompositeOperation = 'destination-out'; x.drawImage(morph(sel, -px / 2), 0, 0) }
  else {
    // Feather blurs the edge; smooth blurs, then snaps back to a hard edge.
    out = makeCanvas(sel.width, sel.height)
    const x = ctx2d(out, true)
    const off = sel.width + px * 4 + 10
    x.shadowColor = '#fff'; x.shadowBlur = px * 2; x.shadowOffsetX = off
    x.drawImage(sel, -off, 0)
    if (kind === 'smooth') {
      const img = x.getImageData(0, 0, out.width, out.height), d = img.data
      for (let i = 3; i < d.length; i += 4) { const a = d[i]; d[i] = a < 110 ? 0 : a > 146 ? 255 : ((a - 110) / 36) * 255; d[i - 3] = d[i - 2] = d[i - 1] = 255 }
      x.putImageData(img, 0, 0)
    }
  }
  s.setSelection(out, { expand: 'Expand selection', contract: 'Contract selection', feather: 'Feather selection', smooth: 'Smooth selection', border: 'Border selection' }[kind])
}

/** Colour range: every pixel of the composite close to a colour. */
export function selectColorRange(hex: string, fuzz: number) {
  const s = st(); const c = composite(); if (!c || !s.doc) return
  const d = ctx2d(c, true).getImageData(0, 0, c.width, c.height).data
  const n = parseInt(hex.slice(1), 16), r0 = (n >> 16) & 255, g0 = (n >> 8) & 255, b0 = n & 255
  const m = makeCanvas(c.width, c.height), mx = ctx2d(m), img = mx.createImageData(c.width, c.height)
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.max(Math.abs(d[i] - r0), Math.abs(d[i + 1] - g0), Math.abs(d[i + 2] - b0))
    const a = dist <= fuzz ? 255 : dist <= fuzz * 1.5 ? (1 - (dist - fuzz) / (fuzz * 0.5)) * 255 : 0
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a
  }
  mx.putImageData(img, 0, 0)
  s.setSelection(m, 'Colour range')
}

// ─── Channels ──────────────────────────────────────────────────────

export function saveSelectionAsChannel(name?: string) {
  const s = st(); if (!s.doc || !s.selection) { s.notify('Make a selection first, then save it.'); return }
  const channels = [...(s.doc.channels ?? []), { id: uid(), name: name || `Alpha ${(s.doc.channels?.length ?? 0) + 1}`, mask: cloneCanvas(s.selection) }]
  s.setDoc({ channels }, true)
  s.notify('Selection saved as a channel. Find it in the Channels panel.')
}
export function loadChannel(id: string, mode: 'new' | 'add' | 'sub' | 'intersect' = 'new') {
  const s = st(); const ch = s.doc?.channels?.find(c => c.id === id); if (!ch) return
  combineSelection(cloneCanvas(ch.mask), mode, 'Load selection')
}
/** Load the brightness of R, G or B (or the composite) as a selection. Handy for masking hair and sky. */
export function channelAsSelection(which: 'rgb' | 'r' | 'g' | 'b') {
  const s = st(); const c = composite(); if (!c) return
  const x = ctx2d(c, true), img = x.getImageData(0, 0, c.width, c.height), d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = which === 'r' ? d[i] : which === 'g' ? d[i + 1] : which === 'b' ? d[i + 2] : d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = v
  }
  x.putImageData(img, 0, 0)
  s.setSelection(c, 'Load channel as selection')
}
export function deleteChannel(id: string) { const s = st(); if (!s.doc) return; s.setDoc({ channels: (s.doc.channels ?? []).filter(c => c.id !== id) }, true); if (s.viewChannel === id) useEditor.setState({ viewChannel: 'rgb' }) }
export function renameChannel(id: string, name: string) { const s = st(); if (!s.doc) return; s.setDoc({ channels: (s.doc.channels ?? []).map(c => c.id === id ? { ...c, name } : c) }, true) }

// ─── Fill and stroke ───────────────────────────────────────────────

export function fillSelectionOrLayer(color: string, opacity = 1) {
  const s = st(); if (!s.doc) return
  const l = s.ensurePaintable(); if (!l || l.type !== 'raster') return
  const f = makeCanvas(s.doc.width, s.doc.height), x = ctx2d(f)
  x.fillStyle = color; x.globalAlpha = opacity; x.fillRect(0, 0, f.width, f.height)
  if (s.selection) { x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(s.selection, 0, 0) }
  const c = cloneCanvas(l.canvas), cx = ctx2d(c)
  if (l.lockAlpha) cx.globalCompositeOperation = 'source-atop'
  cx.drawImage(f, 0, 0)
  s.updateLayer(l.id, { canvas: c }, 'Fill')
}

export function strokeSelection(color: string, width: number, position: 'inside' | 'center' | 'outside' = 'center') {
  const s = st(); if (!s.doc || !s.selection) { s.notify('Make a selection first.'); return }
  const l = s.ensurePaintable(); if (!l || l.type !== 'raster') return
  const sel = s.selection
  const ring = position === 'outside' ? morph(sel, width) : position === 'inside' ? cloneCanvas(sel) : morph(sel, width / 2)
  const cut = position === 'outside' ? sel : morph(sel, position === 'inside' ? -width : -width / 2)
  const r = ctx2d(ring); r.globalCompositeOperation = 'destination-out'; r.drawImage(cut, 0, 0)
  r.globalCompositeOperation = 'source-in'; r.fillStyle = color; r.fillRect(0, 0, ring.width, ring.height)
  const c = cloneCanvas(l.canvas); ctx2d(c).drawImage(ring, 0, 0)
  s.updateLayer(l.id, { canvas: c }, 'Stroke')
}

// ─── Paths ─────────────────────────────────────────────────────────

export function pathMask(subpaths: SubPath[], w: number, h: number, feather = 0) {
  const m = makeCanvas(w, h), x = ctx2d(m)
  paintPathOps(x, subpaths)
  if (!feather) return m
  const out = makeCanvas(w, h), o = ctx2d(out); const off = w + feather * 4 + 10
  o.shadowColor = '#fff'; o.shadowBlur = feather * 2; o.shadowOffsetX = off; o.drawImage(m, -off, 0)
  return out
}

export function activePath(): VectorPath | null {
  const s = st(); return s.doc?.paths?.find(p => p.id === s.activePathId) ?? null
}

/** The path the path commands act on: the selected saved path, or else the selected shape layer's outline. */
export function currentPath(): { name: string; subpaths: SubPath[]; layerId?: string } | null {
  const p = activePath(); if (p) return p
  const l = st().active()
  if (l?.type === 'shape') return { name: l.name, subpaths: layerSubsToDoc(l), layerId: l.id }
  return null
}
const needPath = () => { const p = currentPath(); if (!p) st().notify('Draw a path with the Pen tool, or select a shape layer, first.'); return p }

export function setPaths(paths: VectorPath[], label?: string) {
  const s = st(); s.setDoc({ paths }, !!label)
  if (label) useEditor.setState({ history: useEditor.getState().history.map((h, i, a) => i === a.length - 1 ? { ...h, label } : h) })
}

export function pathToSelection(id?: string, mode: 'new' | 'add' | 'sub' | 'intersect' = 'new') {
  const s = st(); const p = id ? s.doc?.paths?.find(x => x.id === id) : needPath(); if (!p || !s.doc) return
  combineSelection(pathMask(p.subpaths, s.doc.width, s.doc.height), mode, 'Path to selection')
}

export function fillPath(color: string) {
  const s = st(); const p = needPath(); if (!p || !s.doc) return
  const l = s.ensurePaintable(); if (!l || l.type !== 'raster') return
  const m = pathMask(p.subpaths, s.doc.width, s.doc.height), x = ctx2d(m)
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, m.width, m.height)
  const c = cloneCanvas(l.canvas); ctx2d(c).drawImage(m, 0, 0)
  s.updateLayer(l.id, { canvas: c }, 'Fill path')
}

/**
 * Stroke the path onto pixels. With taper on, the line starts and ends thin, like Photoshop's
 * "Simulate pressure" when stroking a path with the brush.
 */
export function strokePath(color: string, width: number, taper = false) {
  const s = st(); const p = needPath(); if (!p || !s.doc) return
  const l = s.ensurePaintable(); if (!l || l.type !== 'raster') return
  const c = cloneCanvas(l.canvas), x = ctx2d(c)
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = width; x.lineCap = 'round'; x.lineJoin = 'round'
  if (!taper) { x.beginPath(); tracePath(x, p.subpaths); x.stroke() }
  else {
    for (const run of samplePath(p.subpaths, Math.max(0.5, width / 6))) {
      for (const q of run) {
        const r = (width / 2) * Math.max(0.04, Math.sin(Math.PI * q.t))
        x.beginPath(); x.arc(q.x, q.y, r, 0, Math.PI * 2); x.fill()
      }
    }
  }
  s.updateLayer(l.id, { canvas: c }, taper ? 'Stroke path (tapered)' : 'Stroke path')
}

/** Turn the active path into a vector shape layer filled with the main colour. */
export function shapeFromPath() {
  const s = st(); const p = activePath(); if (!p || !s.doc) { s.notify('Select a saved path in the Paths panel first.'); return }
  if (!p.subpaths.some(sp => sp.nodes.length)) return
  const open = p.subpaths.every(sp => !sp.closed)
  s.addShape('path', 0, 0, 1, 1, { fill: open ? null : s.fg, stroke: open ? s.fg : null, strokeWidth: open ? 4 : 0, name: p.name })
  const l = s.active(); if (!l || l.type !== 'shape') return
  s.updateLayer(l.id, docSubsToLayerPatch(l, p.subpaths))
  useEditor.setState({ activePathId: null })
}

/** Copy a shape layer's outline into the Paths panel as a saved path. */
export function pathFromLayer() {
  const s = st(); const l = s.active(); if (!s.doc || l?.type !== 'shape') { s.notify('Select a shape layer first.'); return }
  const path: VectorPath = { id: uid(), name: `${l.name} path`, subpaths: layerSubsToDoc(l) }
  setPaths([...(s.doc.paths ?? []), path], 'Path from shape')
  useEditor.setState({ activePathId: path.id })
}

/** Replace the subpaths of the current path (saved path or shape layer) in one undo step. */
export function editCurrentPath(fn: (subs: SubPath[]) => SubPath[], label: string) {
  const s = st(); const p = needPath(); if (!p || !s.doc) return
  const next = fn(p.subpaths)
  if (p.layerId) {
    const l = s.layers.find(x => x.id === p.layerId); if (l?.type !== 'shape') return
    s.updateLayer(l.id, docSubsToLayerPatch(l, next), label)
  } else setPaths((s.doc.paths ?? []).map(x => (x.id === (p as VectorPath).id ? { ...x, subpaths: next } : x)), label)
}
export const reversePath = () => editCurrentPath(subs => subs.map(reverseSub), 'Reverse path direction')
export const simplifyPath = () => editCurrentPath(subs => subs.map(sp => simplifySub(sp, 1.5)), 'Simplify path')
export const closeOpenPaths = () => editCurrentPath(subs => subs.map(sp => (sp.nodes.length > 2 ? { ...sp, closed: true } : sp)), 'Close path')
export function setPathOps(op: PathOp, which: 'last' | 'all' = 'last') {
  editCurrentPath(subs => subs.map((sp, i) => (which === 'all' ? (i ? { ...sp, op } : { ...sp, op: 'add' as PathOp }) : i === subs.length - 1 && i > 0 ? { ...sp, op } : sp)), 'Path operation')
}

export function duplicatePath() {
  const s = st(); const p = activePath(); if (!p || !s.doc) return
  const copy: VectorPath = { ...p, id: uid(), name: `${p.name} copy`, subpaths: p.subpaths.map(sp => ({ ...sp, nodes: sp.nodes.map(n => ({ ...n })) })) }
  setPaths([...(s.doc.paths ?? []), copy], 'Duplicate path'); useEditor.setState({ activePathId: copy.id })
}

function pathSvg(p: { name: string; subpaths: SubPath[]; layerId?: string }) {
  const s = st(); const doc = s.doc!
  const l = p.layerId ? s.layers.find(x => x.id === p.layerId) : null
  const fill = l?.type === 'shape' ? (l.fill ?? 'none') : 'none'
  const stroke = l?.type === 'shape' ? (l.stroke ?? 'none') : '#000'
  const sw = l?.type === 'shape' ? l.strokeWidth : 1
  const rule = p.subpaths.some(sp => sp.op) ? 'nonzero' : 'evenodd'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}"><path d="${toSvgD(p.subpaths)}" fill="${fill}" fill-rule="${rule}" stroke="${stroke}" stroke-width="${sw}"/></svg>`
}
export async function copyPathSvg() {
  const s = st(); const p = needPath(); if (!p) return
  try { await navigator.clipboard.writeText(pathSvg(p)); s.notify('Copied as SVG. Paste it into Figma, Illustrator or code.') }
  catch { s.notify('Could not reach the clipboard. Use Export path as SVG instead.') }
}
export function exportPathSvg() {
  const p = needPath(); if (!p) return
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([pathSvg(p)], { type: 'image/svg+xml' }))
  a.download = `${(p.name || 'path').replace(/[^\w\- ]+/g, '') || 'path'}.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export function maskFromPath() {
  const s = st(); const p = activePath(); const l = s.active()
  if (!p || !s.doc || !l) { s.notify('Pick a saved path in the Paths panel and select the layer to mask.'); return }
  useEditor.setState({ selection: pathMask(p.subpaths, s.doc.width, s.doc.height) })
  s.addMask(l.id, true)
}

/** Trace the selection edge into a path (contour tracing plus simplification). */
export function selectionToPath(tolerance = 2) {
  const s = st(); if (!s.doc || !s.selection) { s.notify('Make a selection first.'); return }
  const sel = s.selection
  const k = Math.min(1, 1500 / Math.max(sel.width, sel.height))
  const w = Math.round(sel.width * k), h = Math.round(sel.height * k)
  const t = makeCanvas(w, h), tx = ctx2d(t, true); tx.drawImage(sel, 0, 0, w, h)
  const d = tx.getImageData(0, 0, w, h).data
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127
  const visited = new Uint8Array(w * h)
  const subpaths: SubPath[] = []
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
  for (let y = 0; y < h && subpaths.length < 60; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y) || on(x - 1, y) || visited[y * w + x]) continue
    // Moore-neighbour trace of this outer edge.
    const pts: [number, number][] = []
    let cx = x, cy = y, dir = 6, guard = 0
    do {
      pts.push([cx, cy]); visited[cy * w + cx] = 1
      let found = false
      for (let i = 0; i < 8; i++) {
        const nd = (dir + 6 + i) % 8, nx = cx + DIRS[nd][0], ny = cy + DIRS[nd][1]
        if (on(nx, ny)) { cx = nx; cy = ny; dir = nd; found = true; break }
      }
      if (!found) break
    } while ((cx !== x || cy !== y) && guard++ < 200000)
    if (pts.length < 8) continue
    const simple = rdp(pts, tolerance)
    subpaths.push({ closed: true, nodes: simple.map(([px, py]) => { const X = px / k, Y = py / k; return { x: X, y: Y, inX: X, inY: Y, outX: X, outY: Y } }) })
  }
  if (!subpaths.length) { s.notify('Could not trace that selection.'); return }
  const path: VectorPath = { id: uid(), name: 'Path from selection', subpaths }
  setPaths([...(s.doc.paths ?? []), path], 'Make work path')
  useEditor.setState({ activePathId: path.id })
}

function rdp(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 3) return pts
  let dmax = 0, idx = 0
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const len = Math.hypot(bx - ax, by - ay) || 1
  for (let i = 1; i < pts.length - 1; i++) {
    const dd = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len
    if (dd > dmax) { dmax = dd; idx = i }
  }
  if (dmax <= eps) return [pts[0], pts[pts.length - 1]]
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
}

// ─── Layer style clipboard ─────────────────────────────────────────

let styleClipboard: LayerStyles | null = null
export function copyStyle() { const l = st().active(); if (l?.styles) { styleClipboard = JSON.parse(JSON.stringify(l.styles)); st().notify('Layer style copied.') } else st().notify('This layer has no style to copy.') }
export function pasteStyle() {
  const s = st(); if (!styleClipboard) { s.notify('Copy a layer style first.'); return }
  for (const id of s.selectedIds) s.updateLayer(id, { styles: JSON.parse(JSON.stringify(styleClipboard)) })
  s.commit('Paste layer style')
}
export function clearStyle() { const s = st(); for (const id of s.selectedIds) s.updateLayer(id, { styles: null }); s.commit('Clear layer style') }

// ─── Link layers ───────────────────────────────────────────────────

export function linkSelected() {
  const s = st()
  if (s.selectedIds.length < 2) {
    const l = s.active(); if (l?.linkId) { s.updateLayer(l.id, { linkId: null }, 'Unlink layer') } else s.notify('Select two or more layers to link them.')
    return
  }
  const sel = s.layers.filter(l => s.selectedIds.includes(l.id))
  const allLinked = sel.every(l => l.linkId && l.linkId === sel[0].linkId)
  const id = allLinked ? null : uid()
  s.updateLayers(sel.map(l => ({ id: l.id, patch: { linkId: id } })))
  s.commit(allLinked ? 'Unlink layers' : 'Link layers')
}

// ─── Transform session (skew, distort, perspective, warp) ──────────

export function beginTransform(mode: 'free' | 'skew' | 'distort' | 'perspective' | 'warp') {
  const s = st(); const l = s.active(); if (!s.doc || !l || l.type === 'adjustment') { s.notify('Select a layer to transform.'); return }
  if (l.locked || l.lockPosition) { s.notify('This layer is locked.'); return }
  const { w, h } = layerSize(l, s.doc)
  const m = layerMatrix(l, s.doc)
  const quad = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => { const p = m.transformPoint({ x, y }); return { x: p.x, y: p.y } })
  let grid: { x: number; y: number }[] | null = null
  if (mode === 'warp') {
    grid = []
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const p = m.transformPoint({ x: (w * i) / 3, y: (h * j) / 3 }); grid.push({ x: p.x, y: p.y }) }
  }
  useEditor.setState({ transform: { layerId: l.id, mode, quad, grid, origin: quad.map(p => ({ ...p })) }, tool: 'move' })
  if (l.type !== 'raster') s.notify('Applying this transform turns the layer into pixels.')
}

export function cancelTransform() { useEditor.setState({ transform: null }) }

/** Map the layer's pixels through the transform quad (or warp grid) with a fine triangle mesh. */
export function applyTransform() {
  const s = st(); const t = s.transform; const doc = s.doc; if (!t || !doc) return
  const l0 = s.layers.find(x => x.id === t.layerId); if (!l0 || l0.type === 'adjustment') { cancelTransform(); return }
  const src = layerSource(l0, doc)
  const out = makeCanvas(doc.width, doc.height), ox = ctx2d(out)
  ox.imageSmoothingQuality = 'high'
  warpInto(ox, src, t, t.mode === 'warp' ? 24 : 16, p => p)
  const r: RasterLayer = { ...(l0 as any), type: 'raster', canvas: out, mask: null, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, rev: nextRev() }
  delete (r as any).text; delete (r as any).shape
  useEditor.setState({ transform: null, layers: s.layers.map(x => x.id === l0.id ? r : x), docRev: s.docRev + 1 })
  s.commit({ free: 'Free transform', skew: 'Skew', distort: 'Distort', perspective: 'Perspective', warp: 'Warp' }[t.mode])
}

type P = { x: number; y: number }

/** Draw `src` mapped through a transform session onto ctx. `to` converts document points (e.g. to screen). */
export function warpInto(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, t: { mode: string; quad: P[]; grid: P[] | null }, N: number, to: (p: P) => P) {
  const w = src.width, h = src.height
  const map = (u: number, v: number) => to(t.grid ? bezierPatch(t.grid, u, v) : bilinearOrPerspective(t.quad, u, v, t.mode === 'perspective'))
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u0 = i / N, v0 = j / N, u1 = (i + 1) / N, v1 = (j + 1) / N
    const s00 = { x: u0 * w, y: v0 * h }, s10 = { x: u1 * w, y: v0 * h }, s01 = { x: u0 * w, y: v1 * h }, s11 = { x: u1 * w, y: v1 * h }
    const d00 = map(u0, v0), d10 = map(u1, v0), d01 = map(u0, v1), d11 = map(u1, v1)
    drawTriangle(ctx, src, s00, s10, s01, d00, d10, d01)
    drawTriangle(ctx, src, s10, s11, s01, d10, d11, d01)
  }
}
export function warpPoint(t: { mode: string; quad: P[]; grid: P[] | null }, u: number, v: number) { return t.grid ? bezierPatch(t.grid, u, v) : bilinearOrPerspective(t.quad, u, v, t.mode === 'perspective') }

/** The layer's pixels in its own space, mask applied: what a transform session moves. */
export function layerSource(l: Layer, doc: Doc) {
  const { w, h } = layerSize(l, doc)
  const src = makeCanvas(w, h), sx = ctx2d(src)
  drawLayerContent(sx, l)
  if (l.mask && l.maskEnabled) { sx.globalCompositeOperation = 'destination-in'; sx.drawImage(l.mask, 0, 0) }
  return src
}

function bilinearOrPerspective(q: P[], u: number, v: number, perspective: boolean): P {
  if (!perspective) {
    const top = { x: q[0].x + (q[1].x - q[0].x) * u, y: q[0].y + (q[1].y - q[0].y) * u }
    const bot = { x: q[3].x + (q[2].x - q[3].x) * u, y: q[3].y + (q[2].y - q[3].y) * u }
    return { x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v }
  }
  // Projective map from the unit square to the quad.
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + hh * p3.x, c = p0.x
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + hh * p3.y, f = p0.y
  const z = g * u + hh * v + 1
  return { x: (a * u + b * v + c) / z, y: (d * u + e * v + f) / z }
}

function bezierPatch(g: P[], u: number, v: number): P {
  const bern = (t: number) => [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3]
  const bu = bern(u), bv = bern(v)
  let x = 0, y = 0
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const k = bu[i] * bv[j]; x += g[j * 4 + i].x * k; y += g[j * 4 + i].y * k }
  return { x, y }
}

/** Draw one source triangle onto its destination with an affine transform, slightly expanded to hide seams. */
function drawTriangle(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, s0: P, s1: P, s2: P, d0: P, d1: P, d2: P) {
  const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3
  const grow = (p: P) => { const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1; return { x: p.x + (dx / L) * 0.6, y: p.y + (dy / L) * 0.6 } }
  const e0 = grow(d0), e1 = grow(d1), e2 = grow(d2)
  ctx.save()
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.closePath(); ctx.clip()
  const den = s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y
  if (Math.abs(den) < 1e-9) { ctx.restore(); return }
  const a = -(s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / den
  const b = (s1.y * d2.y + s0.y * (d1.y - d2.y) - s2.y * d1.y + (s2.y - s1.y) * d0.y) / den
  const c = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / den
  const d = -(s1.x * d2.y + s0.x * (d1.y - d2.y) - s2.x * d1.y + (s2.x - s1.x) * d0.y) / den
  const e = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s2.x * s1.y - s1.x * s2.y) * d0.x) / den
  const f = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s2.x * s1.y - s1.x * s2.y) * d0.y) / den
  ctx.setTransform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

// ─── Misc ──────────────────────────────────────────────────────────

export function newGuide(axis: 'v' | 'h', pos: number) {
  const s = st(); if (!s.doc) return
  const g = s.doc.guides ?? { v: [], h: [] }
  s.setDoc({ guides: { ...g, [axis]: [...g[axis], Math.round(pos)] } }, true)
}
export function clearGuides() { const s = st(); if (s.doc) s.setDoc({ guides: { v: [], h: [] } }, true) }
export function guideLayout(cols: number, rows: number, margin: number, gutter: number) {
  const s = st(); const doc = s.doc; if (!doc) return
  const v: number[] = [], h: number[] = []
  if (margin > 0) { v.push(margin, doc.width - margin); h.push(margin, doc.height - margin) }
  const iw = doc.width - margin * 2, ih = doc.height - margin * 2
  if (cols > 1) { const cw = (iw - gutter * (cols - 1)) / cols; for (let i = 1; i < cols; i++) { const x = margin + i * cw + (i - 1) * gutter; v.push(x); if (gutter) v.push(x + gutter) } }
  if (rows > 1) { const rh = (ih - gutter * (rows - 1)) / rows; for (let i = 1; i < rows; i++) { const y = margin + i * rh + (i - 1) * gutter; h.push(y); if (gutter) h.push(y + gutter) } }
  s.setDoc({ guides: { v: Array.from(new Set(v.map(Math.round))), h: Array.from(new Set(h.map(Math.round))) } }, true)
}

export function newPathId() { return uid() }
export const emptyNode = (x: number, y: number): PathNode => ({ x, y, inX: x, inY: y, outX: x, outY: y })
export function rasterizeLayer(id: string) { const s = st(); const r = s.rasterize(id); if (r) s.commit('Rasterize layer') }
export function fullSelection() { const s = st(); if (s.doc) return fullMaskSized(s.doc.width, s.doc.height); return null }
export type { ShapeLayer }

// ─── Pathfinder, Outline Stroke, Expand ────────────────────────────

const PF_LABEL: Record<string, string> = { unite: 'Unite', minusFront: 'Minus front', minusBack: 'Minus back', intersect: 'Intersect', exclude: 'Exclude', divide: 'Divide' }

/**
 * Illustrator's Pathfinder on the selected shape layers (or on the parts of one shape, or of the
 * selected saved path). The result is new, real geometry: every point can be edited.
 */
export async function pathfinderSelected(op: import('./vector').PathfinderOp) {
  const s = st(); if (!s.doc) return
  const v = await import('./vector')
  const shapes = s.layers.filter(l => s.selectedIds.includes(l.id) && l.type === 'shape') as ShapeLayer[]
  try {
    if (shapes.length >= 2) {
      const docShapes = shapes.map(l => layerSubsToDoc(l))
      const div = op === 'divide' ? v.divide(docShapes) : null
      const res = div ? div.map(d => d.subs) : v.pathfinder(op, docShapes)
      const top = shapes[shapes.length - 1], bottom = shapes[0]
      const style = op === 'minusFront' ? bottom : top
      s.setActive(top.id)
      const made: string[] = []
      for (let i = 0; i < res.length; i++) {
        const subs = res[i]; if (!subs.length) continue
        const src = div ? shapes[div[i].owner] : style
        const id = s.addShape('path', 0, 0, 1, 1, { name: op === 'divide' ? `Piece ${i + 1}` : PF_LABEL[op], fill: src.fill ?? s.fg, stroke: src.stroke, strokeWidth: src.stroke ? src.strokeWidth : 0, strokeAlign: src.strokeAlign, strokeCap: src.strokeCap, strokeJoin: src.strokeJoin, strokeDash: src.strokeDash, opacity: style.opacity, blend: style.blend, frameId: style.frameId, groupId: style.groupId } as any)
        const l = st().layers.find(x => x.id === id) as ShapeLayer
        st().updateLayer(id, docSubsToLayerPatch(l, subs)); made.push(id)
      }
      const keep = new Set(made)
      useEditor.setState({ layers: st().layers.filter(l => keep.has(l.id) || !shapes.some(x => x.id === l.id)), selectedIds: made, activeId: made[made.length - 1] ?? null, docRev: st().docRev + 1 })
      st().commit(`Pathfinder: ${PF_LABEL[op]}`)
      if (!made.length) s.notify('Nothing is left after that operation.')
      return
    }
    // One shape, or a saved path: work on its parts.
    const p = currentPath(); if (!p) { s.notify('Select two or more shape layers (Shift-click in Layers), or one shape with several parts.'); return }
    if (p.subpaths.length < 2) { s.notify('Pathfinder needs two or more shapes, or one shape made of several parts.'); return }
    const res = v.pathfinder(op, p.subpaths.map(sp => [{ ...sp, op: undefined }]))
    editCurrentPath(() => res.flat(), `Pathfinder: ${PF_LABEL[op]}`)
  } catch (e) { console.error(e); s.notify('That shape could not be merged. Try Simplify on it first.') }
}

/** Turn render-time path operations into real geometry, so the outline is one clean path. */
export async function expandPathOps() {
  const s = st(); const p = currentPath(); if (!p) { s.notify('Select a shape layer or a saved path first.'); return }
  if (!p.subpaths.some(sp => sp.op)) { s.notify('This path has no combine, subtract, intersect or exclude parts to expand.'); return }
  const v = await import('./vector')
  editCurrentPath(subs => v.expandOps(subs), 'Expand path operations')
}

/** Illustrator's Outline Stroke. On a shape layer the stroke becomes its own filled shape. */
export async function outlineStroke() {
  const s = st(); if (!s.doc) return
  const v = await import('./vector')
  const l = s.active()
  try {
    if (l?.type === 'shape' && !s.activePathId) {
      if (!l.stroke || !l.strokeWidth) { s.notify('This shape has no stroke to outline. Give it an outline in Properties first.'); return }
      const subs = v.outlineStroke(layerSubsToDoc(l), l.strokeWidth, l.strokeCap ?? 'round', l.strokeJoin ?? 'round', l.shape === 'line' ? 'center' : l.strokeAlign ?? 'center')
      const id = s.addShape('path', 0, 0, 1, 1, { name: `${l.name} stroke`, fill: l.stroke, stroke: null, strokeWidth: 0, opacity: l.opacity, blend: l.blend, frameId: l.frameId, groupId: l.groupId } as any)
      const nl = st().layers.find(x => x.id === id) as ShapeLayer
      st().updateLayer(id, docSubsToLayerPatch(nl, subs))
      if (l.fill && l.shape !== 'line') st().updateLayer(l.id, { stroke: null, strokeWidth: 0 })
      else useEditor.setState({ layers: st().layers.filter(x => x.id !== l.id), docRev: st().docRev + 1 })
      st().setActive(id); st().commit('Outline stroke')
      return
    }
    const p = activePath(); if (!p) { s.notify('Select a shape layer with a stroke, or a saved path.'); return }
    const w = Math.max(1, Math.round(s.options.size / 4))
    const out: VectorPath = { id: uid(), name: `${p.name} outline`, subpaths: v.outlineStroke(p.subpaths, w) }
    setPaths([...(s.doc.paths ?? []), out], 'Outline stroke'); useEditor.setState({ activePathId: out.id })
    s.notify(`Outlined at ${w} px (a quarter of the brush size).`)
  } catch (e) { console.error(e); s.notify('Could not outline that stroke. Try Simplify on the path first.') }
}

// ─── Type on a path ────────────────────────────────────────────────

/** Put text along a path (document space). `at` picks where along the path it starts. */
export function textOnPath(docSubs?: SubPath[], at?: { x: number; y: number }) {
  const s = st(); if (!s.doc) return
  const subs = (docSubs ?? currentPath()?.subpaths ?? []).slice(0, 1)
  if (!subs.length || subs[0].nodes.length < 2) { s.notify('Draw or select a path first, then use the Type tool on it.'); return }
  const fontSize = Math.round(Math.max(18, Math.min(s.doc.width, s.doc.height) / 22))
  s.addText(0, 0)
  const l = st().active(); if (l?.type !== 'text') return
  const base: TextLayer = { ...l, text: 'Type along the path', fontSize, fontWeight: 600, name: 'Path text', onPath: { subpaths: [], start: 0, w: 1, h: 1 } }
  const patch = docSubsToTextPathPatch(base, subs)
  let start = 0
  if (at && patch.onPath) {
    const ox = patch.x ?? 0, oy = patch.y ?? 0
    const poly = pathPolyline(patch.onPath.subpaths)
    let bd = Infinity
    for (const q of poly) { const d = Math.hypot(q.x - (at.x - ox), q.y - (at.y - oy)); if (d < bd) { bd = d; start = q.d } }
  }
  st().updateLayer(l.id, { ...patch, text: base.text, fontSize, fontWeight: 600, name: 'Path text', align: 'left', boxWidth: null, onPath: { ...patch.onPath!, start } }, 'Type on path')
  useEditor.setState({ editingTextId: l.id, tool: 'move' })
}

/** Take text off its path: it becomes ordinary point text where the path started. */
export function releaseTextFromPath() {
  const s = st(); const l = s.active(); if (l?.type !== 'text' || !l.onPath) return
  const first = layerSubsToDoc(l)[0]?.nodes[0]
  s.updateLayer(l.id, { onPath: null, x: first ? first.x : l.x, y: first ? first.y - l.fontSize : l.y, scaleX: 1, scaleY: 1, rotation: 0 }, 'Release text from path')
}

// ─── Vector masks ──────────────────────────────────────────────────

/** Add a vector mask: from the selected saved path, or a reveal-all rectangle you then edit. */
export function addVectorMask(fromPath = true) {
  const s = st(); const l = s.active(); if (!s.doc || !l) { s.notify('Select a layer first.'); return }
  if (l.type === 'adjustment') { s.notify('Vector masks work on image, text and shape layers. Use a layer mask on adjustments.'); return }
  const src = fromPath ? activePath() : null
  const { w, h } = layerSize(l, s.doc)
  const subpaths = src ? docToVmask(l, src.subpaths, s.doc) : [{ closed: true, nodes: [emptyNode(0, 0), emptyNode(w, 0), emptyNode(w, h), emptyNode(0, h)] }]
  s.updateLayer(l.id, { vmask: { subpaths, enabled: true, feather: 0 } }, src ? 'Vector mask from path' : 'Add vector mask')
  useEditor.setState({ vmaskEditId: l.id, activePathId: null, tool: 'pathselect' })
  s.notify(src ? 'Vector mask added. Edit its points with Direct Select (A) or add parts with the Pen.' : 'Vector mask added around the layer. Drag its points with Direct Select (A), or draw into it with the Pen.')
}
export function editVectorMask(id: string | null) { useEditor.setState({ vmaskEditId: id, ...(id ? { tool: 'pathselect' as const, activePathId: null } : {}) }) }
export function updateVectorMask(patch: Partial<NonNullable<Layer['vmask']>>, label?: string) {
  const s = st(); const l = s.active(); if (!l?.vmask) return
  s.updateLayer(l.id, { vmask: { ...l.vmask, ...patch } }, label)
}
export function deleteVectorMask() {
  const s = st(); const l = s.active(); if (!l?.vmask) return
  s.updateLayer(l.id, { vmask: null }, 'Delete vector mask'); if (s.vmaskEditId === l.id) useEditor.setState({ vmaskEditId: null })
}
/** Turn the vector mask into pixels, combined with any layer mask already there. */
export function rasterizeVectorMask() {
  const s = st(); const l = s.active(); if (!s.doc || !l?.vmask) return
  const { w, h } = layerSize(l, s.doc)
  const vm = vectorMaskCanvas(l, w, h)
  const m = l.mask ? cloneCanvas(l.mask) : fullMaskSized(w, h)
  const x = ctx2d(m); x.globalCompositeOperation = 'destination-in'; x.drawImage(vm, 0, 0)
  s.updateLayer(l.id, { vmask: null, mask: m, maskEnabled: true }, 'Rasterize vector mask')
  useEditor.setState({ vmaskEditId: null })
}
