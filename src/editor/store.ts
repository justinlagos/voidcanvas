import { create } from 'zustand'
import { defaultParams, type EffectType } from '@/store/useStore'
import { ADJUSTMENT_DEFAULTS, cloneCanvas, ctx2d, fullMaskSized, layerBounds, layerMatrix, layerSize, makeCanvas, rasterizeToDoc, renderDoc, uid } from './engine'
import type { AdjustmentKind, AdjustmentLayer, Doc, Frame, Group, Layer, RasterLayer, Rect, ShapeLayer, TextLayer, ToolId, ToolOptions, View } from './types'
import { useUi } from './ui-store'

// Revisions are globally unique so a given (id, rev) always means the same pixels, even across undo branches.
let REV = 1
export const nextRev = () => ++REV

export interface Snapshot { doc: Doc; layers: Layer[]; groups: Group[]; activeId: string | null; selection: HTMLCanvasElement | null; label: string; at?: number }

type Pt = { x: number; y: number }
/** An in-progress free transform (skew, distort, perspective, warp) on one layer. */
export interface TransformSession { layerId: string; mode: 'free' | 'skew' | 'distort' | 'perspective' | 'warp'; quad: Pt[]; grid: Pt[] | null; origin: Pt[] }

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
  curves: 'Curves',
  voidEffect: 'Filter',
  vibrance: 'Vibrance',
  exposure: 'Exposure',
  colorBalance: 'Colour balance',
  channelMixer: 'Channel mixer',
  photoFilter: 'Photo filter',
  gradientMap: 'Gradient map',
  posterize: 'Posterize',
  threshold: 'Threshold',
  lut: 'Colour lookup (LUT)',
  colorMatch: 'Colour match (look)',
}

interface EditorState {
  doc: Doc | null
  layers: Layer[]
  groups: Group[]
  activeId: string | null
  /** Every selected layer. activeId is always one of them. */
  selectedIds: string[]
  editingTextId: string | null
  activeFrameId: string | null
  /** Hold to see the design without any adjustments or filters. */
  compare: boolean
  editingMask: boolean
  selection: HTMLCanvasElement | null
  selRev: number
  docRev: number

  tool: ToolId
  options: ToolOptions
  fg: string
  bg: string
  swatches: string[]
  brandFont: string | null
  view: View
  crop: Rect | null
  cloneSource: { x: number; y: number } | null

  history: Snapshot[]
  historyIndex: number
  /** Named states pinned above the history list. Never trimmed. */
  snapshots: Snapshot[]
  /** Quick mask: paint the selection with Brush and Eraser. */
  quickMask: boolean
  transform: TransformSession | null
  /** Show one channel of the image, or a saved alpha channel, instead of the composite. */
  viewChannel: 'rgb' | 'r' | 'g' | 'b' | string
  /** When set, the next click on the canvas samples a colour for this callback instead of using the tool. */
  pickRequest: { label: string; cb: (hex: string, rgb: [number, number, number]) => void } | null
  /** Selected path in the Paths panel, and the node being edited. */
  activePathId: string | null
  /** Layer whose vector mask the path tools are editing. */
  vmaskEditId: string | null
  /** Cursor position in document pixels, for the status bar and Info panel. */
  pointer: { x: number; y: number; rgb: [number, number, number, number] | null } | null
  dirty: boolean
  toast: { id: number; msg: string } | null
  busy: string | null

  // document
  newDoc: (d: { name?: string; width: number; height: number; background: string | null }) => void
  loadProject: (doc: Doc, layers: Layer[], swatches?: string[], groups?: Group[]) => void
  loadFramed: (doc: Doc, layers: Layer[], swatches?: string[], groups?: Group[]) => void
  closeDoc: () => void
  setDoc: (patch: Partial<Doc>, commit?: boolean) => void
  cropTo: (x: number, y: number, w: number, h: number) => void
  setActiveFrame: (id: string | null) => void
  addFrame: (preset: { name: string; width: number; height: number }) => void
  removeFrame: (id: string) => void
  /** Moves a board and every layer on it by dx, dy document pixels. Live while dragging; commit afterwards. */
  moveFrame: (id: string, dx: number, dy: number) => void
  /** After a board move: keeps every board on the page (nothing above or left of 0,0) and fits the page to them. */
  settleFrames: () => { dx: number; dy: number }
  /** Deletes a group with everything inside it, nested groups included. */
  removeGroup: (groupId: string) => void
  /** Locks or unlocks every layer inside a group, and the group itself. */
  setGroupLocked: (groupId: string, locked: boolean) => void
  renameFrame: (id: string, name: string) => void
  setFrameSize: (id: string, width: number, height: number) => void
  duplicateFrame: (id: string) => void
  organiseFrames: () => void
  reassignLayerFrame: (layerId: string, frameId: string | null) => void

  // layers
  active: () => Layer | null
  setActive: (id: string | null) => void
  toggleSelect: (id: string) => void
  selectGroup: (groupId: string) => void
  groupSelected: () => void
  ungroup: (groupId: string) => void
  updateGroup: (groupId: string, patch: Partial<Group>, commitLabel?: string) => void
  align: (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void
  distribute: (axis: 'h' | 'v') => void
  setLayerBox: (id: string, box: { x?: number; y?: number; w?: number; h?: number }) => void
  removeSelected: () => void
  addLayer: (l: Layer, label?: string) => void
  addBlank: () => void
  addImage: (src: CanvasImageSource, w: number, h: number, name: string) => void
  addText: (x?: number, y?: number, boxWidth?: number | null) => void
  addShape: (shape: ShapeLayer['shape'], x: number, y: number, w: number, h: number, extra?: Partial<ShapeLayer>) => string
  addAdjustment: (kind: AdjustmentKind, effect?: EffectType) => void
  updateLayer: (id: string, patch: Partial<Layer>, commitLabel?: string) => void
  updateLayers: (updates: { id: string; patch: Partial<Layer> }[]) => void
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
  createClippingMask: (id?: string) => void
  releaseClippingMask: (id?: string) => void
  canClip: (id?: string) => boolean
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
  jumpTo: (index: number) => void
  deleteHistoryStep: (index: number) => void
  takeSnapshot: (name?: string) => void
  restoreSnapshot: (index: number) => void
  deleteSnapshot: (index: number) => void
  /** Replace the whole document state in one step (used by image-wide operations). */
  replaceAll: (patch: { doc?: Doc; layers?: Layer[]; groups?: Group[]; selection?: HTMLCanvasElement | null }, label: string) => void

  notify: (msg: string) => void
  setBusy: (msg: string | null) => void
  markSaved: () => void
}

/** Innermost first: the group a layer sits in, then its parent, and so on. */
export function groupChain(groupId: string | null | undefined, groups: Group[]): string[] {
  const out: string[] = []
  let id = groupId ?? null, guard = 0
  while (id && guard++ < 64) { out.push(id); id = groups.find(g => g.id === id)?.parentId ?? null }
  return out
}
export const inGroup = (l: Layer, gid: string, groups: Group[]) => groupChain(l.groupId, groups).includes(gid)
export const groupDepth = (gid: string | null | undefined, groups: Group[]) => groupChain(gid, groups).length

/** Keep only groups that still hold a layer, directly or through a nested group. */
const prune = (groups: Group[], layers: Layer[]) => {
  const used = new Set<string>()
  for (const l of layers) for (const g of groupChain(l.groupId, groups)) used.add(g)
  return groups.filter(g => used.has(g.id))
}

/** Rough bytes held by history: every distinct canvas counted once. */
function historyBytes(snaps: Snapshot[]) {
  const seen = new Set<HTMLCanvasElement>(); let n = 0
  const add = (c: HTMLCanvasElement | null | undefined) => { if (c && !seen.has(c)) { seen.add(c); n += c.width * c.height * 4 } }
  for (const s of snaps) { add(s.selection); for (const l of s.layers) { add(l.mask); if (l.type === 'raster') add(l.canvas) } }
  return n
}
export const historyMemoryMB = (snaps: Snapshot[]) => Math.round(historyBytes(snaps) / 1048576)

/** The document canvas must contain every board, or boards past its edge would not render. */
function coverFrames(doc: Doc): Doc {
  if (!doc.frames?.length) return doc
  const r = Math.max(doc.width, ...doc.frames.map(f => f.x + f.width)), b = Math.max(doc.height, ...doc.frames.map(f => f.y + f.height))
  return r === doc.width && b === doc.height ? doc : { ...doc, width: Math.ceil(r), height: Math.ceil(b) }
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: null,
  layers: [],
  groups: [],
  activeId: null,
  selectedIds: [],
  editingTextId: null,
  activeFrameId: null,
  compare: false,
  editingMask: false,
  selection: null,
  selRev: 0,
  docRev: 0,

  tool: 'move',
  options: { size: 40, hardness: 0.8, opacity: 1, tolerance: 32, contiguous: true, shape: 'rect', cropAspect: null, feather: 0, flow: 1, smoothing: 0.25, sides: 5, star: 1, selMode: 'new', toneRange: 'midtones', exposure: 0.5, sampleAll: true, pressureSize: true, pressureOpacity: false, autoSelect: true, autoSelectGroup: false, showTransform: true, showDistances: true, spongeMode: 'desaturate' },
  fg: '#111111',
  bg: '#ffffff',
  swatches: ['#111111', '#ffffff', '#8b7cff', '#ff5a5f', '#ffb020', '#1fb47a', '#2d7ff9'],
  brandFont: null,
  view: { zoom: 1, panX: 0, panY: 0 },
  crop: null,
  cloneSource: null,

  history: [],
  historyIndex: -1,
  snapshots: [],
  quickMask: false,
  transform: null,
  viewChannel: 'rgb',
  pickRequest: null,
  activePathId: null,
  vmaskEditId: null,
  pointer: null,
  dirty: false,
  toast: null,
  busy: null,

  newDoc: ({ name, width, height, background }) => {
    const doc: Doc = { id: uid(), name: name || 'Untitled design', width, height, background }
    set({ doc, layers: [], groups: [], selectedIds: [], editingTextId: null, activeId: null, selection: null, editingMask: false, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move' })
    get().commit('New design')
    set({ dirty: false })
  },

  loadProject: (doc, layers, swatches, groups) => {
    const top = layers[layers.length - 1]?.id ?? null
    set({ doc, layers, groups: groups ?? [], selectedIds: top ? [top] : [], editingTextId: null, activeId: top, selection: null, editingMask: false, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move', ...(swatches ? { swatches } : {}) })
    get().commit('Open')
    set({ dirty: false })
  },

  loadFramed: (doc, layers, swatches, groups) => {
    const top = layers[layers.length - 1]?.id ?? null
    set({ doc, layers, groups: groups ?? [], selectedIds: top ? [top] : [], editingTextId: null, activeId: top, activeFrameId: doc.frames?.[0]?.id ?? null, selection: null, editingMask: false, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move', ...(swatches ? { swatches } : {}) })
    get().commit('Open'); set({ dirty: false })
  },

  closeDoc: () => set({ doc: null, layers: [], groups: [], selectedIds: [], editingTextId: null, activeId: null, selection: null, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null }),

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

  setActiveFrame: (id) => set({ activeFrameId: id }),

  addFrame: (preset) => {
    const { doc } = get(); if (!doc) return
    const frames = doc.frames ?? []
    // place the new board to the right of the widest existing one
    const maxX = frames.length ? Math.max(...frames.map(f => f.x + f.width)) + 120 : 0
    const f: Frame = { id: uid(), name: preset.name, x: maxX, y: 0, width: preset.width, height: preset.height, background: '#ffffff' }
    set({ doc: coverFrames({ ...doc, frames: [...frames, f] }), activeFrameId: f.id, docRev: get().docRev + 1 })
    get().commit('Add board')
  },

  removeFrame: (id) => {
    const { doc, layers, groups, activeFrameId } = get(); if (!doc?.frames) return
    const f = doc.frames.find(x => x.id === id); if (!f) return
    if (doc.frames.length < 2) { get().notify('A design needs at least one board. Add another board before closing this one.'); return }
    const frames = doc.frames.filter(x => x.id !== id)
    const next = layers.filter(l => l.frameId !== id)
    const keep = activeFrameId && activeFrameId !== id ? activeFrameId : frames[frames.length - 1].id
    set({ doc: { ...doc, frames }, layers: next, groups: prune(groups, next), activeFrameId: keep, selectedIds: [], activeId: null, editingMask: false, docRev: get().docRev + 1 })
    get().commit('Delete board')
    get().notify(`Board “${f.name}” deleted. Undo brings it back.`)
  },

  moveFrame: (id, dx, dy) => {
    const { doc, layers } = get(); if (!doc?.frames || (!dx && !dy)) return
    set({
      doc: { ...doc, frames: doc.frames.map(f => f.id === id ? { ...f, x: f.x + dx, y: f.y + dy } : f) },
      layers: layers.map(l => l.frameId === id ? ({ ...l, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer) : l),
      docRev: get().docRev + 1,
    })
  },

  settleFrames: () => {
    const { doc, layers } = get(); if (!doc?.frames?.length) return { dx: 0, dy: 0 }
    // Boards can be dragged anywhere. The page is the box around them, so a board dragged above or left of the
    // others shifts everything to keep the page starting at 0,0; the view shifts back so nothing appears to jump.
    const minX = Math.min(...doc.frames.map(f => f.x)), minY = Math.min(...doc.frames.map(f => f.y))
    const dx = minX < 0 ? -Math.floor(minX) : 0, dy = minY < 0 ? -Math.floor(minY) : 0
    const frames = doc.frames.map(f => ({ ...f, x: f.x + dx, y: f.y + dy }))
    const loose = layers.some(l => !l.frameId)
    const r = Math.ceil(Math.max(...frames.map(f => f.x + f.width))), b = Math.ceil(Math.max(...frames.map(f => f.y + f.height)))
    const guides = doc.guides && (dx || dy) ? { v: doc.guides.v.map(v => v + dx), h: doc.guides.h.map(h => h + dy) } : doc.guides
    set({
      doc: { ...doc, frames, guides, width: loose ? Math.max(doc.width + dx, r) : r, height: loose ? Math.max(doc.height + dy, b) : b },
      layers: dx || dy ? layers.map(l => ({ ...l, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer)) : layers,
      docRev: get().docRev + 1,
    })
    return { dx, dy }
  },

  removeGroup: (groupId) => {
    const { layers, groups } = get()
    const g = groups.find(x => x.id === groupId); if (!g) return
    const next = layers.filter(l => !inGroup(l, groupId, groups))
    const keep = next[next.length - 1]?.id ?? null
    set({ layers: next, groups: prune(groups.filter(x => x.id !== groupId), next), activeId: keep, selectedIds: keep ? [keep] : [], editingMask: false, docRev: get().docRev + 1 })
    get().commit('Delete group')
  },

  setGroupLocked: (groupId, locked) => {
    const { layers, groups } = get()
    const inside = (gid: string | null | undefined): boolean => !!gid && (gid === groupId || inside(groups.find(x => x.id === gid)?.parentId))
    set({
      layers: layers.map(l => inGroup(l, groupId, groups) ? ({ ...l, locked, rev: nextRev() } as Layer) : l),
      groups: groups.map(x => inside(x.id) ? { ...x, locked } : x),
      docRev: get().docRev + 1,
    })
    get().commit(locked ? 'Lock group' : 'Unlock group')
  },

  renameFrame: (id, name) => {
    const { doc } = get(); if (!doc?.frames) return
    set({ doc: { ...doc, frames: doc.frames.map(f => f.id === id ? { ...f, name } : f) }, docRev: get().docRev + 1 })
  },

  setFrameSize: (id, width, height) => {
    const { doc } = get(); if (!doc?.frames) return
    const w = Math.min(8000, Math.max(16, Math.round(width))), h = Math.min(8000, Math.max(16, Math.round(height)))
    set({ doc: coverFrames({ ...doc, frames: doc.frames.map(f => f.id === id ? { ...f, width: w, height: h } : f) }), docRev: get().docRev + 1 })
    get().commit('Resize board')
  },

  duplicateFrame: (id) => {
    const { doc, layers, groups } = get(); if (!doc?.frames) return
    const src = doc.frames.find(f => f.id === id); if (!src) return
    const nf = { ...src, id: uid(), name: src.name + ' copy' }
    // place the copy to the right of the widest board
    nf.x = Math.max(...doc.frames.map(f => f.x + f.width)) + 120; nf.y = src.y
    const dx = nf.x - src.x, dy = nf.y - src.y
    const srcLayers = layers.filter(l => l.frameId === id)
    // copy layers, remap group ids so the copy's groups are independent
    const groupMap = new Map<string, string>()
    for (const l of srcLayers) if (l.groupId && !groupMap.has(l.groupId)) groupMap.set(l.groupId, uid())
    const copies = srcLayers.map(l => ({ ...l, id: uid(), frameId: nf.id, groupId: l.groupId ? groupMap.get(l.groupId)! : null, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer))
    const newGroups = groups.filter(g => groupMap.has(g.id)).map(g => ({ ...g, id: groupMap.get(g.id)! }))
    // insert copies right after the source board's layers so stacking stays sane
    set({ doc: coverFrames({ ...doc, frames: [...doc.frames, nf] }), layers: [...layers, ...copies], groups: [...groups, ...newGroups], activeFrameId: nf.id, docRev: get().docRev + 1 })
    get().commit('Duplicate board')
  },

  organiseFrames: () => {
    const { doc } = get(); if (!doc?.frames?.length) return
    const gap = 120
    const cols = Math.ceil(Math.sqrt(doc.frames.length))
    const colW: number[] = [], rowH: number[] = []
    doc.frames.forEach((f, i) => { const c = i % cols, r = Math.floor(i / cols); colW[c] = Math.max(colW[c] ?? 0, f.width); rowH[r] = Math.max(rowH[r] ?? 0, f.height) })
    const xOff = [0]; for (let c = 1; c <= cols; c++) xOff[c] = xOff[c - 1] + colW[c - 1] + gap
    const rows = Math.ceil(doc.frames.length / cols); const yOff = [0]; for (let r = 1; r <= rows; r++) yOff[r] = yOff[r - 1] + rowH[r - 1] + gap
    // move each board and its layers by the delta
    const deltas = new Map<string, { dx: number; dy: number }>()
    const placed = doc.frames.map((f, i) => { const c = i % cols, r = Math.floor(i / cols); const nx = xOff[c], ny = yOff[r]; deltas.set(f.id, { dx: nx - f.x, dy: ny - f.y }); return { ...f, x: nx, y: ny } })
    const layers = get().layers.map(l => { const d = l.frameId ? deltas.get(l.frameId) : null; return d ? ({ ...l, x: l.x + d.dx, y: l.y + d.dy, rev: nextRev() } as Layer) : l })
    set({ doc: { ...doc, frames: placed, width: xOff[cols] - gap, height: yOff[rows] - gap }, layers, docRev: get().docRev + 1 })
    get().commit('Organise boards')
  },

  reassignLayerFrame: (layerId, frameId) => {
    set({ layers: get().layers.map(l => l.id === layerId ? ({ ...l, frameId, rev: nextRev() } as Layer) : l), docRev: get().docRev + 1 })
  },

  active: () => get().layers.find(l => l.id === get().activeId) ?? null,
  setActive: (id) => set({ activeId: id, selectedIds: id ? [id] : [], editingMask: false }),

  toggleSelect: (id) => {
    const cur = get().selectedIds
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    set({ selectedIds: next, activeId: next.includes(id) ? id : (next[next.length - 1] ?? null), editingMask: false })
  },

  selectGroup: (groupId) => {
    const ids = get().layers.filter(l => inGroup(l, groupId, get().groups)).map(l => l.id)
    set({ selectedIds: ids, activeId: ids[ids.length - 1] ?? null, editingMask: false })
  },

  groupSelected: () => {
    const { layers, selectedIds, groups } = get()
    if (selectedIds.length < 1) { get().notify('Select one or more layers to group them. Shift-click adds to the selection.'); return }
    const sel = layers.filter(l => selectedIds.includes(l.id))
    // The new group sits inside the innermost group that holds every selected layer.
    const chains = sel.map(l => groupChain(l.groupId, groups))
    const parent = chains[0].find(g => chains.every(c => c.includes(g))) ?? null
    const g: Group = { id: uid(), name: `Group ${groups.length + 1}`, visible: true, opacity: 1, collapsed: false, parentId: parent }
    // A group whose layers are all selected moves into the new group whole, so nesting is kept.
    const wholly = (gid: string) => layers.filter(l => inGroup(l, gid, groups)).every(l => selectedIds.includes(l.id))
    const reparent = new Set<string>()
    const picked = sel.map(l => {
      const chain = groupChain(l.groupId, groups)
      const below = parent ? chain.slice(0, chain.indexOf(parent)) : chain
      let top: string | null = null
      for (const gid of below) if (wholly(gid)) top = gid
      if (top) { reparent.add(top); return { ...l, rev: nextRev() } as Layer }
      return { ...l, groupId: g.id, rev: nextRev() } as Layer
    })
    const topIndex = Math.max(...selectedIds.map(id => layers.findIndex(l => l.id === id)))
    const anchor = layers[topIndex].id
    const rest = layers.filter(l => !selectedIds.includes(l.id) || l.id === anchor)
    const at = rest.findIndex(l => l.id === anchor)
    rest.splice(at, 1, ...picked)
    const nextGroups = [...groups.map(x => reparent.has(x.id) ? { ...x, parentId: g.id } : x), g]
    set({ layers: rest.map(l => ({ ...l, rev: nextRev() } as Layer)), groups: prune(nextGroups, rest), docRev: get().docRev + 1 })
    get().commit('Group layers')
  },

  ungroup: (groupId) => {
    const groups = get().groups, g = groups.find(x => x.id === groupId), up = g?.parentId ?? null
    set({
      layers: get().layers.map(l => (l.groupId === groupId ? ({ ...l, groupId: up, rev: nextRev() } as Layer) : l)),
      groups: groups.filter(x => x.id !== groupId).map(x => x.parentId === groupId ? { ...x, parentId: up } : x),
      docRev: get().docRev + 1,
    })
    get().commit('Ungroup')
  },

  updateGroup: (groupId, patch, commitLabel) => {
    set({ groups: get().groups.map(g => (g.id === groupId ? { ...g, ...patch } : g)), docRev: get().docRev + 1 })
    if (commitLabel) get().commit(commitLabel)
  },

  align: (how) => {
    const { layers, selectedIds, doc } = get(); if (!doc) return
    const sel = layers.filter(l => selectedIds.includes(l.id) && l.type !== 'adjustment' && !l.locked)
    if (!sel.length) return
    const boxes = sel.map(l => layerBounds(l, doc))
    // One layer aligns to the page. Several layers align to each other.
    const frame = sel.length === 1 ? { x: 0, y: 0, w: doc.width, h: doc.height } : {
      x: Math.min(...boxes.map(b => b.x)), y: Math.min(...boxes.map(b => b.y)),
      w: Math.max(...boxes.map(b => b.x + b.w)) - Math.min(...boxes.map(b => b.x)),
      h: Math.max(...boxes.map(b => b.y + b.h)) - Math.min(...boxes.map(b => b.y)),
    }
    const moves = new Map(sel.map((l, i) => {
      const b = boxes[i]
      const dx = how === 'left' ? frame.x - b.x : how === 'hcenter' ? frame.x + frame.w / 2 - (b.x + b.w / 2) : how === 'right' ? frame.x + frame.w - (b.x + b.w) : 0
      const dy = how === 'top' ? frame.y - b.y : how === 'vcenter' ? frame.y + frame.h / 2 - (b.y + b.h / 2) : how === 'bottom' ? frame.y + frame.h - (b.y + b.h) : 0
      return [l.id, { dx, dy }]
    }))
    set({ layers: layers.map(l => { const m = moves.get(l.id); return m ? ({ ...l, x: l.x + m.dx, y: l.y + m.dy, rev: nextRev() } as Layer) : l }), docRev: get().docRev + 1 })
    get().commit('Align')
  },

  distribute: (axis) => {
    const { layers, selectedIds, doc } = get(); if (!doc) return
    const sel = layers.filter(l => selectedIds.includes(l.id) && l.type !== 'adjustment' && !l.locked)
    if (sel.length < 3) return
    const boxes = sel.map(l => ({ l, b: layerBounds(l, doc) }))
    // sort along the axis, keep the two extremes fixed, space the middles evenly by gap.
    boxes.sort((a, b) => axis === 'h' ? (a.b.x - b.b.x) : (a.b.y - b.b.y))
    const first = boxes[0].b, last = boxes[boxes.length - 1].b
    const totalSpan = axis === 'h' ? (last.x + last.w) - first.x : (last.y + last.h) - first.y
    const sumSize = boxes.reduce((n, x) => n + (axis === 'h' ? x.b.w : x.b.h), 0)
    const gap = (totalSpan - sumSize) / (boxes.length - 1)
    let cursor = axis === 'h' ? first.x : first.y
    const moves = new Map<string, { dx: number; dy: number }>()
    boxes.forEach(({ l, b }) => {
      if (axis === 'h') { moves.set(l.id, { dx: cursor - b.x, dy: 0 }); cursor += b.w + gap }
      else { moves.set(l.id, { dx: 0, dy: cursor - b.y }); cursor += b.h + gap }
    })
    set({ layers: layers.map(l => { const m = moves.get(l.id); return m ? ({ ...l, x: l.x + m.dx, y: l.y + m.dy, rev: nextRev() } as Layer) : l }), docRev: get().docRev + 1 })
    get().commit('Distribute')
  },

  // Set a layer's document-space box precisely. x/y move the top-left of the unrotated bounds; w/h rescale from it.
  setLayerBox: (id, box) => {
    const { layers, doc } = get(); if (!doc) return
    const l = layers.find(x => x.id === id); if (!l || l.type === 'adjustment') return
    const b = layerBounds(l, doc)
    const patch: any = {}
    if (box.x != null) patch.x = l.x + (box.x - b.x)
    if (box.y != null) patch.y = l.y + (box.y - b.y)
    if (box.w != null && b.w > 0) { const k = box.w / b.w; if (l.type === 'text') patch.fontSize = Math.max(1, l.fontSize * k); else patch.scaleX = l.scaleX * k }
    if (box.h != null && b.h > 0) { const k = box.h / b.h; if (l.type === 'text') { /* text height follows fontSize */ } else patch.scaleY = l.scaleY * k }
    set({ layers: layers.map(x => x.id === id ? ({ ...x, ...patch, rev: nextRev() } as Layer) : x), docRev: get().docRev + 1 })
  },

  removeSelected: () => {
    const { layers, selectedIds, groups } = get(); if (!selectedIds.length) return
    const next = layers.filter(l => !selectedIds.includes(l.id))
    const keep = next[next.length - 1]?.id ?? null
    set({ layers: next, groups: prune(groups, next), activeId: keep, selectedIds: keep ? [keep] : [], editingMask: false, docRev: get().docRev + 1 })
    get().commit(selectedIds.length > 1 ? 'Delete layers' : 'Delete layer')
  },

  addLayer: (l, label) => {
    const { layers, activeId } = get()
    const idx = activeId ? layers.findIndex(x => x.id === activeId) : layers.length - 1
    const next = [...layers]
    const st = get(); const host = idx >= 0 ? layers[idx] : null
    if (st.doc?.frames?.length && l.frameId === undefined) l = { ...l, frameId: st.activeFrameId ?? st.doc.frames[0].id } as Layer
    let at = idx + 1
    if (host?.groupId && l.groupId === undefined) {
      // Adjustments land above the whole group so they keep affecting everything beneath them.
      if (l.type === 'adjustment') { while (at < layers.length && layers[at].groupId === host.groupId) at++ }
      else l = { ...l, groupId: host.groupId } as Layer
    }
    next.splice(at, 0, l)
    set({ layers: next, activeId: l.id, selectedIds: [l.id], editingMask: false, docRev: get().docRev + 1 })
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
      ...base(name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || 'Image'), type: 'raster', canvas: c, source: 'photo',
      scaleX: fit, scaleY: fit, x: (doc.width - w * fit) / 2, y: (doc.height - h * fit) / 2,
    }, 'Add image')
    set({ tool: 'move' })
  },

  addText: (x, y, boxWidth) => {
    const { doc, fg, brandFont } = get(); if (!doc) return
    const size = boxWidth ? Math.round(Math.max(16, Math.min(doc.width / 40, boxWidth / 12))) : Math.round(Math.max(24, doc.width / 14))
    const l: TextLayer = {
      // Starts empty: the canvas editor opens with a caret and a hint, so there is nothing to delete first.
      ...base(boxWidth ? 'Paragraph' : 'Text'), type: 'text', text: '',
      fontFamily: brandFont ?? 'Inter', fontSize: size, fontWeight: boxWidth ? 400 : 700, italic: false,
      color: fg, align: 'left', lineHeight: boxWidth ? 1.4 : 1.15, letterSpacing: 0, boxWidth: boxWidth ?? null,
    }
    const s = layerSize(l)
    l.x = x ?? (doc.width - s.w) / 2; l.y = y ?? (doc.height - s.h) / 2
    get().addLayer(l, 'Add text')
    set({ tool: 'move', editingTextId: l.id })
  },

  addShape: (shape, x, y, w, h, extra) => {
    const { fg, options } = get()
    const names: Record<string, string> = { rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line', polygon: (options.star ?? 1) < 1 ? 'Star' : 'Polygon', path: 'Shape' }
    const l: ShapeLayer = {
      ...base(names[shape]), type: 'shape', shape, w, h,
      fill: shape === 'line' ? null : fg, stroke: shape === 'line' ? fg : null, strokeWidth: shape === 'line' ? 6 : 0, radius: 0, x, y,
      ...(shape === 'polygon' ? { sides: options.sides ?? 5, star: options.star ?? 1 } : {}),
      ...extra,
    }
    get().addLayer(l, 'Add shape')
    return l.id
  },

  addAdjustment: (kind, effect) => {
    const l: AdjustmentLayer = {
      ...base(ADJUSTMENT_LABELS[kind]), type: 'adjustment', kind, values: { ...ADJUSTMENT_DEFAULTS[kind] },
      ...(kind === 'curves' ? { points: [[0, 0], [255, 255]] as [number, number][] } : {}),
      ...(kind === 'voidEffect' && effect ? { effect, effectParams: { ...defaultParams, seed: Math.random() * 1000 } } : {}),
    }
    if (kind === 'voidEffect' && effect) l.name = effect.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) + ' filter'
    get().addLayer(l, 'Add ' + l.name.toLowerCase())
  },

  updateLayers: (updates) => {
    const map = new Map(updates.map(u => [u.id, u.patch]))
    set({ layers: get().layers.map(l => { const patch = map.get(l.id); return patch ? ({ ...l, ...patch, rev: nextRev() } as Layer) : l }), docRev: get().docRev + 1 })
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
    const act = activeId === id ? (next[Math.max(0, idx - 1)]?.id ?? null) : activeId
    set({ layers: next, groups: prune(get().groups, next), activeId: act, selectedIds: act ? [act] : [], editingMask: false, docRev: get().docRev + 1 })
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
    const at = Math.max(0, Math.min(layers.length, toIndex))
    const below = layers[at - 1], above = layers[at]
    // Dropped between two members of a group: join it. Dropped away from its own group: leave it.
    const groupId = below?.groupId && below.groupId === above?.groupId ? below.groupId
      : l.groupId && (below?.groupId === l.groupId || above?.groupId === l.groupId) ? l.groupId : null
    layers.splice(at, 0, { ...l, groupId, rev: nextRev() } as Layer)
    // Anything above the moved layer may now sit over different pixels.
    set({ layers: layers.map(x => ({ ...x, rev: nextRev() } as Layer)), groups: prune(get().groups, layers), docRev: get().docRev + 1 })
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
    const merged: RasterLayer = { ...base(layers[i - 1].name), type: 'raster', canvas: c, visible: layers[i - 1].visible, groupId: layers[i - 1].groupId ?? null }
    const next = [...layers]
    next.splice(i - 1, 2, merged)
    set({ layers: next, groups: prune(get().groups, next), activeId: merged.id, selectedIds: [merged.id], editingMask: false, docRev: get().docRev + 1 })
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
    const r: RasterLayer = { ...base(l.name), id: l.id, type: 'raster', canvas: c, opacity: l.opacity, blend: l.blend, visible: l.visible, groupId: l.groupId ?? null, rev: nextRev() }
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
    if (l.locked || l.lockPixels) { get().notify('This layer is locked. Unlock it to paint.'); return null }
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

  // A layer can be clipped if there is a non-adjustment layer directly below it in the same frame/group.
  canClip: (id) => {
    const st = get(); const lid = id ?? st.activeId; if (!lid) return false
    const idx = st.layers.findIndex(l => l.id === lid); if (idx <= 0) return false
    const l = st.layers[idx], below = st.layers[idx - 1]
    if (l.type === 'adjustment' || l.clipId) return false
    if (below.type === 'adjustment') return false
    if ((l.groupId ?? null) !== (below.groupId ?? null)) return false
    if ((l.frameId ?? null) !== (below.frameId ?? null)) return false
    return true
  },

  createClippingMask: (id) => {
    const st = get(); const lid = id ?? st.activeId; if (!lid || !st.canClip(lid)) return
    const idx = st.layers.findIndex(l => l.id === lid)
    const below = st.layers[idx - 1]
    // If the layer below is itself clipped, join the same base run; otherwise the below layer becomes the base.
    const baseId = below.clipId ?? below.id
    set({ layers: st.layers.map(l => l.id === lid ? ({ ...l, clipId: baseId, rev: nextRev() } as Layer) : l), docRev: st.docRev + 1 })
    get().commit('Create clipping mask')
  },

  releaseClippingMask: (id) => {
    const st = get(); const lid = id ?? st.activeId; if (!lid) return
    const l = st.layers.find(x => x.id === lid); if (!l?.clipId) return
    set({ layers: st.layers.map(x => x.id === lid ? ({ ...x, clipId: null, rev: nextRev() } as Layer) : x), docRev: st.docRev + 1 })
    get().commit('Release clipping mask')
  },

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
    const snap: Snapshot = { doc: { ...doc }, layers: [...layers], groups: get().groups.map(g => ({ ...g })), activeId, selection, label, at: Date.now() }
    const ui = useUi.getState()
    let next = [...history.slice(0, historyIndex + 1), snap].slice(-Math.max(5, ui.historyLimit))
    // Keep history inside its memory budget: drop the oldest steps first, always keeping the last five.
    const budget = ui.historyMemoryMB * 1048576
    if (next.length > 5 && historyBytes(next) > budget) {
      while (next.length > 5 && historyBytes(next) > budget) next = next.slice(Math.max(1, Math.floor(next.length / 10)))
    }
    set({ history: next, historyIndex: next.length - 1, dirty: true })
  },

  undo: () => {
    const { history, historyIndex } = get(); if (historyIndex <= 0) return
    get().jumpTo(historyIndex - 1)
  },

  redo: () => {
    const { history, historyIndex } = get(); if (historyIndex >= history.length - 1) return
    get().jumpTo(historyIndex + 1)
  },

  jumpTo: (index) => {
    const { history } = get(); const s = history[index]; if (!s) return
    set({ doc: { ...s.doc }, layers: [...s.layers], groups: s.groups.map(g => ({ ...g })), selectedIds: s.activeId ? [s.activeId] : [], editingTextId: null, activeId: s.activeId, selection: s.selection, historyIndex: index, editingMask: false, transform: null, docRev: get().docRev + 1, selRev: get().selRev + 1, dirty: true })
  },

  deleteHistoryStep: (index) => {
    const { history, historyIndex } = get()
    if (index <= 0 || index >= history.length || history.length < 2) return
    const next = history.filter((_, i) => i !== index)
    const cur = index < historyIndex ? historyIndex - 1 : Math.min(historyIndex, next.length - 1)
    set({ history: next })
    get().jumpTo(cur)
  },

  takeSnapshot: (name) => {
    const { doc, layers, activeId, selection, snapshots } = get(); if (!doc) return
    const snap: Snapshot = { doc: { ...doc }, layers: [...layers], groups: get().groups.map(g => ({ ...g })), activeId, selection, label: name || `Snapshot ${snapshots.length + 1}`, at: Date.now() }
    set({ snapshots: [...snapshots, snap] })
  },

  restoreSnapshot: (index) => {
    const s = get().snapshots[index]; if (!s) return
    set({ doc: { ...s.doc }, layers: [...s.layers], groups: s.groups.map(g => ({ ...g })), activeId: s.activeId, selectedIds: s.activeId ? [s.activeId] : [], selection: s.selection, editingMask: false, docRev: get().docRev + 1, selRev: get().selRev + 1 })
    get().commit('Restore ' + s.label)
  },

  deleteSnapshot: (index) => set({ snapshots: get().snapshots.filter((_, i) => i !== index) }),

  replaceAll: (patch, label) => {
    set({ ...patch, ...(patch.layers ? { layers: patch.layers.map(l => ({ ...l, rev: nextRev() } as Layer)) } : {}), docRev: get().docRev + 1, selRev: get().selRev + 1, transform: null } as any)
    get().commit(label)
  },

  notify: (msg) => set({ toast: { id: Date.now(), msg } }),
  setBusy: (msg) => set({ busy: msg }),
  markSaved: () => set({ dirty: false }),
}))

/** Show a teaching tip the first time something happens, then never again. */
export function tipOnce(key: string, msg: string) {
  try { if (localStorage.getItem('vc-tip-' + key)) return; localStorage.setItem('vc-tip-' + key, '1') } catch { return }
  useEditor.getState().notify(msg)
}
