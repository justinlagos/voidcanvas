import { create } from 'zustand'
import { defaultParams, type EffectType } from '@/store/useStore'
import { ADJUSTMENT_DEFAULTS, cloneCanvas, ctx2d, fullMaskSized, layerMatrix, layerSize, makeCanvas, rasterizeToDoc, renderDoc, uid } from './engine'
import type { AdjustmentKind, AdjustmentLayer, Doc, Layer, RasterLayer, Rect, ShapeLayer, TextLayer, ToolId, ToolOptions, View } from './types'

// Revisions are globally unique so a given (id, rev) always means the same pixels, even across undo branches.
let REV = 1
export const nextRev = () => ++REV

interface Snapshot { doc: Doc; layers: Layer[]; activeId: string | null; selection: HTMLCanvasElement | null; label: string }

export const base = (name: string) => ({
  id: uid(), name, visible: true, locked: false, opacity: 1, blend: 'source-over' as const,
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, rev: nextRev(),
})

export const ADJUSTMENT_LABELS: Record<AdjustmentKind, string> = {
  brightnessContrast: 'Brightness and contrast',
  hueSaturation: 'Hue and saturation',
  levels: 'Levels',
  temperature: 'Temperature',
  blackWhite: 'Black and white',
  invert: 'Invert',
  blur: 'Blur',
  voidEffect: 'Filter',
}

interface EditorState {
  doc: Doc | null
  layers: Layer[]
  activeId: string | null
  editingMask: boolean
  selection: HTMLCanvasElement | null
  selRev: number
  docRev: number

  tool: ToolId
  options: ToolOptions
  fg: string
  bg: string
  swatches: string[]
  view: View
  crop: Rect | null
  cloneSource: { x: number; y: number } | null
  focusText: number

  history: Snapshot[]
  historyIndex: number
  dirty: boolean
  toast: { id: number; msg: string } | null
  busy: string | null

  // document
  newDoc: (d: { name?: string; width: number; height: number; background: string | null }) => void
  loadProject: (doc: Doc, layers: Layer[], swatches?: string[]) => void
  closeDoc: () => void
  setDoc: (patch: Partial<Doc>, commit?: boolean) => void
  cropTo: (x: number, y: number, w: number, h: number) => void

  // layers
  active: () => Layer | null
  setActive: (id: string | null) => void
  addLayer: (l: Layer, label?: string) => void
  addBlank: () => void
  addImage: (src: CanvasImageSource, w: number, h: number, name: string) => void
  addText: (x?: number, y?: number) => void
  addShape: (shape: ShapeLayer['shape'], x: number, y: number, w: number, h: number) => string
  addAdjustment: (kind: AdjustmentKind, effect?: EffectType) => void
  updateLayer: (id: string, patch: Partial<Layer>, commitLabel?: string) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  moveLayer: (id: string, toIndex: number) => void
  nudgeOrder: (id: string, dir: 1 | -1) => void
  mergeDown: (id: string) => void
  rasterize: (id: string) => RasterLayer | null
  ensurePaintable: () => RasterLayer | AdjustmentLayer | null
  flip: (id: string, axis: 'h' | 'v') => void

  // masks
  addMask: (id: string, fromSelection?: boolean) => void
  removeMask: (id: string) => void
  invertMask: (id: string) => void
  setEditingMask: (v: boolean) => void

  // selection
  setSelection: (mask: HTMLCanvasElement | null, commitLabel?: string) => void
  selectAll: () => void
  invertSelection: () => void
  layerFromSelection: (cut: boolean) => void
  clearSelectionPixels: () => void
  fillSelection: (color: string) => void

  // tools / view
  setTool: (t: ToolId) => void
  setOption: <K extends keyof ToolOptions>(k: K, v: ToolOptions[K]) => void
  setFg: (c: string) => void
  setBg: (c: string) => void
  swapColors: () => void
  addSwatch: (c: string) => void
  setView: (v: Partial<View>) => void

  // history
  commit: (label: string) => void
  undo: () => void
  redo: () => void

  notify: (msg: string) => void
  setBusy: (msg: string | null) => void
  markSaved: () => void
}

const HISTORY_LIMIT = 40

export const useEditor = create<EditorState>((set, get) => ({
  doc: null,
  layers: [],
  activeId: null,
  editingMask: false,
  selection: null,
  selRev: 0,
  docRev: 0,

  tool: 'move',
  options: { size: 40, hardness: 0.8, opacity: 1, tolerance: 32, contiguous: true, shape: 'rect', cropAspect: null, feather: 0 },
  fg: '#111111',
  bg: '#ffffff',
  swatches: ['#111111', '#ffffff', '#8b7cff', '#ff5a5f', '#ffb020', '#1fb47a', '#2d7ff9'],
  view: { zoom: 1, panX: 0, panY: 0 },
  crop: null,
  cloneSource: null,
  focusText: 0,

  history: [],
  historyIndex: -1,
  dirty: false,
  toast: null,
  busy: null,

  newDoc: ({ name, width, height, background }) => {
    const doc: Doc = { id: uid(), name: name || 'Untitled design', width, height, background }
    set({ doc, layers: [], activeId: null, selection: null, editingMask: false, history: [], historyIndex: -1, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move' })
    get().commit('New design')
    set({ dirty: false })
  },

  loadProject: (doc, layers, swatches) => {
    set({ doc, layers, activeId: layers[layers.length - 1]?.id ?? null, selection: null, editingMask: false, history: [], historyIndex: -1, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move', ...(swatches ? { swatches } : {}) })
    get().commit('Open')
    set({ dirty: false })
  },

  closeDoc: () => set({ doc: null, layers: [], activeId: null, selection: null, history: [], historyIndex: -1 }),

  setDoc: (patch, commit) => {
    const { doc } = get(); if (!doc) return
    set({ doc: { ...doc, ...patch }, docRev: get().docRev + 1 })
    if (commit) get().commit('Document')
  },

  cropTo: (x, y, w, h) => {
    const { doc, layers } = get(); if (!doc) return
    x = Math.round(x); y = Math.round(y); w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
    const next = layers.map(l => {
      if (l.type === 'adjustment') {
        if (!l.mask) return { ...l, rev: nextRev() }
        const m = makeCanvas(w, h); ctx2d(m).drawImage(l.mask, -x, -y)
        return { ...l, mask: m, rev: nextRev() }
      }
      return { ...l, x: l.x - x, y: l.y - y, rev: nextRev() }
    })
    set({ doc: { ...doc, width: w, height: h }, layers: next, selection: null, selRev: get().selRev + 1, docRev: get().docRev + 1 })
    get().commit('Crop')
  },

  active: () => get().layers.find(l => l.id === get().activeId) ?? null,
  setActive: (id) => set({ activeId: id, editingMask: false }),

  addLayer: (l, label) => {
    const { layers, activeId } = get()
    const idx = activeId ? layers.findIndex(x => x.id === activeId) : layers.length - 1
    const next = [...layers]
    next.splice(idx + 1, 0, l)
    set({ layers: next, activeId: l.id, editingMask: false, docRev: get().docRev + 1 })
    get().commit(label ?? 'Add layer')
  },

  addBlank: () => {
    const { doc, layers } = get(); if (!doc) return
    const n = layers.filter(l => l.type === 'raster').length + 1
    get().addLayer({ ...base(`Layer ${n}`), type: 'raster', canvas: makeCanvas(doc.width, doc.height) })
  },

  addImage: (src, w, h, name) => {
    const { doc } = get(); if (!doc) return
    const c = makeCanvas(w, h)
    ctx2d(c).drawImage(src, 0, 0, w, h)
    const fit = Math.min(1, doc.width / w, doc.height / h)
    get().addLayer({
      ...base(name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || 'Image'), type: 'raster', canvas: c,
      scaleX: fit, scaleY: fit, x: (doc.width - w * fit) / 2, y: (doc.height - h * fit) / 2,
    }, 'Add image')
    set({ tool: 'move' })
  },

  addText: (x, y) => {
    const { doc, fg } = get(); if (!doc) return
    const size = Math.round(Math.max(24, doc.width / 14))
    const l: TextLayer = {
      ...base('Text'), type: 'text', text: 'Your text', fontFamily: 'Inter', fontSize: size, fontWeight: 700, italic: false,
      color: fg, align: 'left', lineHeight: 1.15, letterSpacing: 0,
    }
    const s = layerSize(l)
    l.x = x ?? (doc.width - s.w) / 2; l.y = y ?? (doc.height - s.h) / 2
    get().addLayer(l, 'Add text')
    set({ tool: 'move', focusText: Date.now() })
  },

  addShape: (shape, x, y, w, h) => {
    const { fg } = get()
    const l: ShapeLayer = {
      ...base(shape === 'rect' ? 'Rectangle' : shape === 'ellipse' ? 'Ellipse' : 'Line'), type: 'shape', shape, w, h,
      fill: shape === 'line' ? null : fg, stroke: shape === 'line' ? fg : null, strokeWidth: shape === 'line' ? 6 : 0, radius: 0, x, y,
    }
    get().addLayer(l, 'Add shape')
    return l.id
  },

  addAdjustment: (kind, effect) => {
    const l: AdjustmentLayer = {
      ...base(ADJUSTMENT_LABELS[kind]), type: 'adjustment', kind, values: { ...ADJUSTMENT_DEFAULTS[kind] },
      ...(kind === 'voidEffect' && effect ? { effect, effectParams: { ...defaultParams, seed: Math.random() * 1000 } } : {}),
    }
    if (kind === 'voidEffect' && effect) l.name = effect.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) + ' filter'
    get().addLayer(l, 'Add ' + l.name.toLowerCase())
  },

  updateLayer: (id, patch, commitLabel) => {
    set({
      layers: get().layers.map(l => (l.id === id ? ({ ...l, ...patch, rev: nextRev() } as Layer) : l)),
      docRev: get().docRev + 1,
    })
    if (commitLabel) get().commit(commitLabel)
  },

  removeLayer: (id) => {
    const { layers, activeId } = get()
    const idx = layers.findIndex(l => l.id === id); if (idx < 0) return
    const next = layers.filter(l => l.id !== id)
    set({ layers: next, activeId: activeId === id ? (next[Math.max(0, idx - 1)]?.id ?? null) : activeId, editingMask: false, docRev: get().docRev + 1 })
    get().commit('Delete layer')
  },

  duplicateLayer: (id) => {
    const l = get().layers.find(x => x.id === id); if (!l) return
    const copy = { ...l, id: uid(), name: l.name + ' copy', x: l.x + (l.type === 'adjustment' ? 0 : 16), y: l.y + (l.type === 'adjustment' ? 0 : 16), rev: nextRev() } as Layer
    set({ activeId: id })
    get().addLayer(copy, 'Duplicate layer')
  },

  moveLayer: (id, toIndex) => {
    const layers = [...get().layers]
    const from = layers.findIndex(l => l.id === id); if (from < 0) return
    const [l] = layers.splice(from, 1)
    layers.splice(Math.max(0, Math.min(layers.length, toIndex)), 0, { ...l, rev: nextRev() } as Layer)
    // Anything above the moved layer may now sit over different pixels.
    set({ layers: layers.map(x => ({ ...x, rev: nextRev() } as Layer)), docRev: get().docRev + 1 })
    get().commit('Reorder layers')
  },

  nudgeOrder: (id, dir) => {
    const i = get().layers.findIndex(l => l.id === id)
    if (i < 0) return
    const to = i + dir
    if (to < 0 || to >= get().layers.length) return
    get().moveLayer(id, to)
  },

  mergeDown: (id) => {
    const { layers, doc } = get(); if (!doc) return
    const i = layers.findIndex(l => l.id === id)
    if (i <= 0) return
    const c = makeCanvas(doc.width, doc.height)
    renderDoc(c, doc, [layers[i - 1], layers[i]].map(l => ({ ...l, visible: true } as Layer)), { transparent: true, noCache: true })
    const merged: RasterLayer = { ...base(layers[i - 1].name), type: 'raster', canvas: c, visible: layers[i - 1].visible }
    const next = [...layers]
    next.splice(i - 1, 2, merged)
    set({ layers: next, activeId: merged.id, editingMask: false, docRev: get().docRev + 1 })
    get().commit('Merge down')
  },

  rasterize: (id) => {
    const { layers, doc } = get(); if (!doc) return null
    const l = layers.find(x => x.id === id)
    if (!l || l.type === 'adjustment') return null
    if (l.type === 'raster') {
      const baked = rasterizeToDoc(l, doc)
      get().updateLayer(id, baked)
      return get().layers.find(x => x.id === id) as RasterLayer
    }
    const c = makeCanvas(doc.width, doc.height)
    renderDoc(c, doc, [{ ...l, opacity: 1, blend: 'source-over', visible: true } as Layer], { transparent: true, noCache: true })
    const r: RasterLayer = { ...base(l.name), id: l.id, type: 'raster', canvas: c, opacity: l.opacity, blend: l.blend, visible: l.visible, rev: nextRev() }
    set({ layers: layers.map(x => (x.id === id ? r : x)), docRev: get().docRev + 1 })
    return r
  },

  /** The layer brushes should paint on. Bakes transforms, and creates a layer if there is nothing to paint on. */
  ensurePaintable: () => {
    const s = get(); if (!s.doc) return null
    let l = s.active()
    if (l && l.type === 'adjustment') {
      if (!l.mask) get().updateLayer(l.id, { mask: fullMaskSized(s.doc.width, s.doc.height) })
      set({ editingMask: true })
      return get().active() as AdjustmentLayer
    }
    if (!l || l.type !== 'raster') { get().addBlank(); l = get().active() }
    if (!l || l.type !== 'raster') return null
    if (l.locked) { get().notify('This layer is locked. Unlock it to paint.'); return null }
    const aligned = l.x === 0 && l.y === 0 && l.scaleX === 1 && l.scaleY === 1 && l.rotation === 0 && l.canvas.width === s.doc.width && l.canvas.height === s.doc.height
    if (!aligned) return get().rasterize(l.id)
    return l
  },

  flip: (id, axis) => {
    const l = get().layers.find(x => x.id === id)
    if (!l || l.type === 'adjustment') return
    if (l.type === 'raster') {
      const f = (src: HTMLCanvasElement) => {
        const c = makeCanvas(src.width, src.height); const x = ctx2d(c)
        if (axis === 'h') { x.translate(src.width, 0); x.scale(-1, 1) } else { x.translate(0, src.height); x.scale(1, -1) }
        x.drawImage(src, 0, 0); return c
      }
      get().updateLayer(id, { canvas: f(l.canvas), mask: l.mask ? f(l.mask) : null }, 'Flip')
    } else {
      const r = get().rasterize(id)
      if (r) get().flip(id, axis)
    }
  },

  addMask: (id, fromSelection) => {
    const { layers, doc, selection } = get(); if (!doc) return
    let l = layers.find(x => x.id === id); if (!l) return
    if (l.type === 'text' || l.type === 'shape') { l = get().rasterize(id) ?? undefined; if (!l) return }
    const { w, h } = layerSize(l, doc)
    let mask: HTMLCanvasElement
    if (fromSelection && selection) {
      mask = makeCanvas(w, h)
      const x = ctx2d(mask)
      if (l.type !== 'adjustment') x.setTransform(layerMatrix(l, doc).inverse())
      x.drawImage(selection, 0, 0)
    } else mask = fullMaskSized(w, h)
    get().updateLayer(id, { mask, maskEnabled: true })
    set({ editingMask: true, activeId: id, ...(fromSelection ? { selection: null, selRev: get().selRev + 1 } : {}) })
    get().commit('Add mask')
  },

  removeMask: (id) => { get().updateLayer(id, { mask: null }, 'Remove mask'); set({ editingMask: false }) },

  invertMask: (id) => {
    const l = get().layers.find(x => x.id === id); if (!l?.mask) return
    const c = fullMaskSized(l.mask.width, l.mask.height)
    const x = ctx2d(c); x.globalCompositeOperation = 'destination-out'; x.drawImage(l.mask, 0, 0)
    get().updateLayer(id, { mask: c }, 'Invert mask')
  },

  setEditingMask: (v) => set({ editingMask: v }),

  setSelection: (mask, commitLabel) => {
    set({ selection: mask, selRev: get().selRev + 1 })
    if (commitLabel) get().commit(commitLabel)
  },
  selectAll: () => { const { doc } = get(); if (doc) get().setSelection(fullMaskSized(doc.width, doc.height), 'Select all') },
  invertSelection: () => {
    const { selection, doc } = get(); if (!selection || !doc) return
    const c = fullMaskSized(doc.width, doc.height)
    const x = ctx2d(c); x.globalCompositeOperation = 'destination-out'; x.drawImage(selection, 0, 0)
    get().setSelection(c, 'Invert selection')
  },

  layerFromSelection: (cut) => {
    const s = get(); const l = s.active()
    if (!s.doc || !s.selection || !l || l.type === 'adjustment') return
    const c = makeCanvas(s.doc.width, s.doc.height)
    renderDoc(c, s.doc, [{ ...l, opacity: 1, blend: 'source-over', visible: true } as Layer], { transparent: true, noCache: true })
    const x = ctx2d(c); x.globalCompositeOperation = 'destination-in'; x.drawImage(s.selection, 0, 0)
    if (cut) get().clearSelectionPixels()
    set({ activeId: l.id })
    get().addLayer({ ...base(l.name + (cut ? ' cut' : ' copy')), type: 'raster', canvas: c }, cut ? 'Cut to new layer' : 'Copy to new layer')
    set({ selection: null, selRev: get().selRev + 1 })
  },

  clearSelectionPixels: () => {
    const s = get(); if (!s.selection) return
    const l = s.ensurePaintable()
    if (!l || l.type !== 'raster') return
    const c = cloneCanvas(l.canvas)
    const x = ctx2d(c); x.globalCompositeOperation = 'destination-out'; x.drawImage(s.selection, 0, 0)
    get().updateLayer(l.id, { canvas: c }, 'Clear selection')
  },

  fillSelection: (color) => {
    const s = get(); if (!s.doc) return
    const l = s.ensurePaintable()
    if (!l || l.type !== 'raster') return
    const fill = makeCanvas(s.doc.width, s.doc.height)
    const f = ctx2d(fill); f.fillStyle = color; f.fillRect(0, 0, fill.width, fill.height)
    if (s.selection) { f.globalCompositeOperation = 'destination-in'; f.drawImage(s.selection, 0, 0) }
    const c = cloneCanvas(l.canvas); ctx2d(c).drawImage(fill, 0, 0)
    get().updateLayer(l.id, { canvas: c }, 'Fill')
  },

  setTool: (t) => set({ tool: t, crop: null }),
  setOption: (k, v) => set({ options: { ...get().options, [k]: v } }),
  setFg: (c) => set({ fg: c }),
  setBg: (c) => set({ bg: c }),
  swapColors: () => set({ fg: get().bg, bg: get().fg }),
  addSwatch: (c) => { const s = get().swatches; if (!s.includes(c)) set({ swatches: [c, ...s].slice(0, 21) }) },
  setView: (v) => set({ view: { ...get().view, ...v } }),

  commit: (label) => {
    const { doc, layers, activeId, selection, history, historyIndex } = get(); if (!doc) return
    const snap: Snapshot = { doc: { ...doc }, layers: [...layers], activeId, selection, label }
    const next = [...history.slice(0, historyIndex + 1), snap].slice(-HISTORY_LIMIT)
    set({ history: next, historyIndex: next.length - 1, dirty: true })
  },

  undo: () => {
    const { history, historyIndex } = get(); if (historyIndex <= 0) return
    const s = history[historyIndex - 1]
    set({ doc: { ...s.doc }, layers: [...s.layers], activeId: s.activeId, selection: s.selection, historyIndex: historyIndex - 1, editingMask: false, docRev: get().docRev + 1, selRev: get().selRev + 1, dirty: true })
  },

  redo: () => {
    const { history, historyIndex } = get(); if (historyIndex >= history.length - 1) return
    const s = history[historyIndex + 1]
    set({ doc: { ...s.doc }, layers: [...s.layers], activeId: s.activeId, selection: s.selection, historyIndex: historyIndex + 1, editingMask: false, docRev: get().docRev + 1, selRev: get().selRev + 1, dirty: true })
  },

  notify: (msg) => set({ toast: { id: Date.now(), msg } }),
  setBusy: (msg) => set({ busy: msg }),
  markSaved: () => set({ dirty: false }),
}))
