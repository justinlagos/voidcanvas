import { create } from 'zustand'
import { defaultParams, type EffectType } from '@/store/useStore'
import { ADJUSTMENT_DEFAULTS, cloneCanvas, ctx2d, fullMaskSized, keepTextAnchor, layerBounds, layerMatrix, maskBounds, layerSize, makeCanvas, rasterizeToDoc, renderDoc, uid } from './engine'
import { boardGap, frameForLayer, occupied, placeBeside, type Side } from './frames'
import type { AdjustmentKind, AdjustmentLayer, Doc, Effect, Frame, Group, Layer, LayerRole, MaskAt, RasterLayer, Rect, ShapeLayer, TextLayer, ToolId, ToolOptions, View } from './types'
import { copyEffect, freshFx, fxId, newEffect, linkedCopies, moveInList, patchEffect, resetEffect as resetFx, sameTarget, stackOf, withStacks, type FxTarget } from './effects'
import { useUi } from './ui-store'
import { touchCanvas } from './touch'
import { noteStep, noteUndo } from '@/lib/analytics'

// Revisions are globally unique so a given (id, rev) always means the same pixels, even across undo branches.
let REV = 1
export const nextRev = () => ++REV

export interface Snapshot { doc: Doc; layers: Layer[]; groups: Group[]; activeId: string | null; selection: HTMLCanvasElement | null; label: string; at?: number; selectedIds?: string[]; activeFrameId?: string | null }

type Pt = { x: number; y: number }
/** An in-progress free transform (skew, distort, perspective, warp) on one layer. */
export interface TransformSession { layerId: string; mode: 'free' | 'skew' | 'distort' | 'perspective' | 'warp'; quad: Pt[]; grid: Pt[] | null; origin: Pt[] }

export const base = (name: string) => ({
  id: uid(), name, visible: true, locked: false, opacity: 1, blend: 'source-over' as const,
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, rev: nextRev(),
})

export interface AddImageOptions {
  /** 'fit' centres the picture at the largest size that fits (the default). 'corner' places it as a logo: small, in the emptiest corner. */
  placement?: 'fit' | 'corner'
  role?: LayerRole | null
  brandLogoId?: string | null
  /** Clear space as a share of the logo height, kept from the board edge. */
  clearSpace?: number
  /** Corners to try first, best first (read from the photo underneath); one that other layers cover is skipped. */
  cornerOrder?: ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right')[]
}

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
  /** With several layers selected: the one the others align to (click it a second time to choose it). */
  keyObjectId: string | null
  /** A group being edited on its own: everything else is dimmed and cannot be picked. */
  isolatedGroupId: string | null
  editingTextId: string | null
  activeFrameId: string | null
  /** Hold to see the design without any adjustments, filters or effects. */
  compare: boolean
  /** View, Effects off: shows the design with every effect switched off (the design itself is unchanged). */
  fxOff: boolean
  drawInsideId: string | null
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
  /** Copy a board beside itself. `empty` adds a blank board of the same size instead. */
  duplicateFrame: (id: string, side?: Side, empty?: boolean) => void
  /** Replace boards, layers and groups in one undoable step (Cascade, Formats). */
  applyBoards: (doc: Doc, layers: Layer[], groups: Group[], label: string, activeFrameId?: string | null) => void
  organiseFrames: () => void
  reassignLayerFrame: (layerId: string, frameId: string | null) => void

  // layers
  active: () => Layer | null
  setActive: (id: string | null) => void
  toggleSelect: (id: string) => void
  setKeyObject: (id: string | null) => void
  setIsolated: (groupId: string | null) => void
  /**
   * Duplicate everything selected: single layers and whole groups (a group whose layers are all selected is copied
   * as a group). Copies sit just above their originals, offset by dx, dy, and become the selection. Returns their ids.
   */
  duplicateSelected: (opts?: { dx?: number; dy?: number; label?: string; commit?: boolean }) => string[]
  selectGroup: (groupId: string) => void
  groupSelected: () => void
  ungroup: (groupId: string) => void
  updateGroup: (groupId: string, patch: Partial<Group>, commitLabel?: string) => void

  // effect stacks (effects.ts)
  /** Add an effect to each target. On several targets the copies are linked: changing one changes them all. */
  /** Add one effect, or several in order, to each target; with several targets they are linked copies. One undo step. */
  addEffect: (targets: FxTarget[], fx: Effect | Effect[], label?: string) => void
  /** Change an effect and every linked copy of it. Without a label the change waits for `commit` (sliders). */
  updateEffect: (t: FxTarget, id: string, patch: Partial<Effect>, label?: string) => void
  removeEffect: (t: FxTarget, id: string) => void
  moveEffect: (t: FxTarget, from: number, to: number) => void
  duplicateEffect: (t: FxTarget, id: string) => void
  resetEffect: (t: FxTarget, id: string) => void
  /** This copy stops following the others. */
  unlinkEffect: (t: FxTarget, id: string) => void
  /** Put linked copies of this effect on more targets. */
  linkEffectTo: (t: FxTarget, id: string, more: FxTarget[]) => void
  /** Replace or extend a target's stack (paste effects). */
  setEffects: (t: FxTarget, list: Effect[], label: string) => void
  /** A group's effects become linked copies on each thing directly inside it. */
  groupFxToContents: (groupId: string) => void
  /** Leave a layer or group out of the effects of the group it sits in, or bring it back. */
  setFxExclude: (t: { type: 'layer' | 'group'; id: string }, v: boolean) => void
  /** Mask a group from the pixel selection (or show all), invert it, or take it off. */
  setGroupMask: (groupId: string, how: 'reveal' | 'selection' | 'hideSelection' | 'invert' | 'remove' | 'toggle') => void
  /** Limit one effect (and its linked copies) to the pixel selection, or hide it there; invert, switch off or remove. */
  setEffectMask: (t: FxTarget, id: string, how: 'selection' | 'hideSelection' | 'invert' | 'remove' | 'toggle') => void
  align: (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void
  /** Space three or more layers evenly between the outer two, or at a set gap (px) from the first. */
  distribute: (axis: 'h' | 'v', gap?: number) => void
  setLayerBox: (id: string, box: { x?: number; y?: number; w?: number; h?: number }) => void
  removeSelected: () => void
  addLayer: (l: Layer, label?: string) => void
  addBlank: () => void
  addImage: (src: CanvasImageSource, w: number, h: number, name: string, opts?: AddImageOptions) => void
  addText: (x?: number, y?: number, boxWidth?: number | null) => void
  addShape: (shape: ShapeLayer['shape'], x: number, y: number, w: number, h: number, extra?: Partial<ShapeLayer>) => string
  addAdjustment: (kind: AdjustmentKind, effect?: EffectType) => void
  updateLayer: (id: string, patch: Partial<Layer>, commitLabel?: string) => void
  updateLayers: (updates: { id: string; patch: Partial<Layer> }[]) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  /** Move in the stack. `toFrame` (a drop in another board's list) also moves the layer onto that board, keeping its place on the board. */
  moveLayer: (id: string, toIndex: number, toFrame?: string | null) => void
  /** Move several layers together to where the layer at `toIndex` is (dragging several rows in the Layers list). */
  moveLayers: (ids: string[], toIndex: number, toFrame?: string | null) => void
  /** Put layers into a group (just above its top layer), or with `null` take them out of the group they are in. */
  moveToGroup: (ids: string[], groupId: string | null) => void
  nudgeOrder: (id: string, dir: 1 | -1) => void
  mergeDown: (id: string) => void
  rasterize: (id: string) => RasterLayer | null
  ensurePaintable: () => Layer | null
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
  /** Record an undo step. `merge`: replace the last step of the same name made within that many ms.
   *  `ifChanged`: skip it when nothing differs from the last step (a field left as it was, a drag that ended where it began). */
  commit: (label: string, opts?: { merge?: number; ifChanged?: boolean }) => void
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

/** True when the design is exactly as a history step left it. Layers are replaced, never changed in place, so
 *  comparing references is enough; the design and groups are compared field by field. */
function sameAsStep(step: Snapshot, doc: Doc, layers: Layer[], groups: Group[], selection: HTMLCanvasElement | null): boolean {
  if (step.selection !== selection || step.layers.length !== layers.length || step.groups.length !== groups.length) return false
  for (let i = 0; i < layers.length; i++) if (step.layers[i] !== layers[i]) return false
  const shallow = (a: any, b: any) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => a[k] === b[k]) }
  if (!shallow(step.doc, doc)) return false
  for (let i = 0; i < groups.length; i++) if (!shallow(step.groups[i], groups[i])) return false
  return true
}

/**
 * The selection as objects: each outermost group whose layers are all selected is one object, any other selected
 * layer is one on its own. The group being edited on its own (and the groups around it) never count as objects.
 */
export function selectionUnits(layers: Layer[], groups: Group[], selectedIds: string[], isolatedGroupId?: string | null): { ids: string[]; group: string | null }[] {
  const sel = new Set(selectedIds)
  const blocked = new Set(isolatedGroupId ? [isolatedGroupId, ...groupChain(isolatedGroupId, groups)] : [])
  const members = new Map<string, string[]>()
  const membersOf = (gid: string) => { let m = members.get(gid); if (!m) { m = layers.filter(l => inGroup(l, gid, groups)).map(l => l.id); members.set(gid, m) } return m }
  const out: { ids: string[]; group: string | null }[] = []
  const seen = new Set<string>()
  for (const l of layers) {
    if (!sel.has(l.id) || seen.has(l.id)) continue
    let top: string | null = null
    for (const gid of groupChain(l.groupId, groups)) { if (blocked.has(gid)) break; if (membersOf(gid).every(id => sel.has(id))) top = gid }
    const ids = top ? membersOf(top) : [l.id]
    for (const id of ids) seen.add(id)
    out.push({ ids, group: top })
  }
  return out
}

/** Objects that align and distribute can move: adjustments left out, and anything with a locked layer kept still. */
function alignUnits(layers: Layer[], groups: Group[], selectedIds: string[], isolatedGroupId: string | null) {
  const byId = new Map(layers.map(l => [l.id, l]))
  return selectionUnits(layers, groups, selectedIds, isolatedGroupId)
    .map(u => ({ ids: u.ids, ls: u.ids.map(id => byId.get(id)!).filter(l => l && l.type !== 'adjustment') }))
    .filter(u => u.ls.length && !u.ls.some(l => l.locked || l.lockPosition))
}

export function unionBox(bs: Rect[]): Rect {
  const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y))
  return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y }
}

/**
 * What a click on a layer picks when groups are picked whole: the outermost group around it that you are not
 * already inside. You are inside a group when the selection sits in it without being all of it, or when it is
 * the group being edited on its own. Returns null to pick the layer itself.
 */
export function pickGroupFor(hit: Layer, layers: Layer[], groups: Group[], selectedIds: string[], isolatedGroupId?: string | null): string | null {
  const chain = groupChain(hit.groupId, groups)
  if (!chain.length) return null
  const blocked = new Set(isolatedGroupId ? [isolatedGroupId, ...groupChain(isolatedGroupId, groups)] : [])
  const sel = layers.filter(l => selectedIds.includes(l.id))
  const inside = (gid: string) => {
    if (blocked.has(gid) || !sel.length || !sel.every(l => inGroup(l, gid, groups))) return blocked.has(gid)
    return !layers.filter(l => inGroup(l, gid, groups)).every(l => selectedIds.includes(l.id))
  }
  const outer = chain.filter(g => !inside(g))
  return outer.length ? outer[outer.length - 1] : null
}

/** Write new effect stacks into the state. Layers that changed get a new rev, so thumbnails and caches follow. */
function applyFx(set: (p: Partial<EditorState>) => void, get: () => EditorState, changes: { t: FxTarget; list: Effect[] }[]) {
  if (!changes.length) return
  const st = get()
  const out = withStacks(st, changes)
  const touched = new Set(changes.filter(c => c.t.type === 'layer').map(c => (c.t as { id: string }).id))
  const patch: Partial<EditorState> = { docRev: st.docRev + 1 }
  if (out.layers) patch.layers = out.layers.map(l => (touched.has(l.id) ? ({ ...l, rev: nextRev() } as Layer) : l))
  if (out.groups) patch.groups = out.groups
  if (out.doc) patch.doc = out.doc
  set(patch)
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
export const prune = (groups: Group[], layers: Layer[]) => {
  const used = new Set<string>()
  for (const l of layers) for (const g of groupChain(l.groupId, groups)) used.add(g)
  return groups.filter(g => used.has(g.id))
}

/** After layers are removed: anything clipped to a layer that is gone is released, never left pointing at nothing. */
export function releaseOrphans(layers: Layer[]): Layer[] {
  const ids = new Set(layers.map(l => l.id))
  return layers.map(l => (l.clipId && !ids.has(l.clipId) ? ({ ...l, clipId: null, rev: nextRev() } as Layer) : l))
}

/** A layer is shown only if it and every group around it are visible. The renderer uses the same rule. */
export const isShown = (l: Layer, groups: Group[]) => l.visible && groupChain(l.groupId, groups).every(gid => groups.find(g => g.id === gid)?.visible !== false)

/** Which board a layer belongs on, from where it is: the board under its centre, else the active board. */
export function boardFor(doc: Doc, l: Layer, activeFrameId: string | null): string | null {
  if (!doc.frames?.length) return null
  if (l.type === 'adjustment') return activeFrameId ?? doc.frames[0].id
  return frameForLayer(doc, l)?.id ?? (activeFrameId && doc.frames.some(f => f.id === activeFrameId) ? activeFrameId : doc.frames[0].id)
}

/** A name for a copy: "Rectangle" becomes "Rectangle 2", then "Rectangle 3", never "copy copy". */
export function copyName(name: string, taken: Iterable<string>) {
  const used = new Set(taken)
  const stem = name.replace(/( copy)+( \d+)?$/i, '').replace(/ \d+$/, '') || name
  for (let n = 2; n < 10000; n++) { const c = `${stem} ${n}`; if (!used.has(c)) return c }
  return `${stem} copy`
}

/** Rough bytes held by history: every distinct canvas counted once. */
function historyBytes(snaps: Snapshot[]) {
  const seen = new Set<HTMLCanvasElement>(); let n = 0
  const add = (c: HTMLCanvasElement | null | undefined) => { if (c && !seen.has(c)) { seen.add(c); n += c.width * c.height * 4 } }
  for (const s of snaps) { add(s.selection); for (const l of s.layers) { add(l.mask); if (l.type === 'raster') add(l.canvas) } }
  return n
}
export const historyMemoryMB = (snaps: Snapshot[]) => Math.round(historyBytes(snaps) / 1048576)

// ─── Masks placed on the page ──────────────────────────────────────
// Adjustment layer masks, group masks and the masks of effects on groups, boards and the design are document
// pixels with a position (`maskAt`). They move with their board. Effect masks on a layer sit relative to the layer
// and move with it on their own.

export type MaskFn = (mask: HTMLCanvasElement, at: MaskAt | null | undefined) => { mask: HTMLCanvasElement; at: MaskAt | null }

/** Change every placed mask, or with `board` only those of things on that board. */
export function mapDocMasks(doc: Doc, layers: Layer[], groups: Group[], fn: MaskFn, o: { board?: string; adjustments?: boolean } = {}): { doc: Doc; layers: Layer[]; groups: Group[] } {
  const all = o.board === undefined
  const fx = (list?: Effect[] | null) => (list?.some(e => e.mask) ? list.map(e => { if (!e.mask) return e; const r = fn(e.mask, e.maskAt); return { ...e, mask: r.mask, maskAt: r.at } }) : list)
  const nl = o.adjustments === false ? layers : layers.map(l => {
    if (l.type !== 'adjustment' || !l.mask || !(all || l.frameId === o.board)) return l
    const r = fn(l.mask, l.maskAt)
    return { ...l, mask: r.mask, maskAt: r.at, rev: nextRev() } as Layer
  })
  const boardOfGroup = (g: Group) => layers.find(l => inGroup(l, g.id, groups))?.frameId ?? null
  const ng = groups.map(g => {
    if (!g.mask && !g.effects?.some(e => e.mask)) return g
    if (!all && boardOfGroup(g) !== o.board) return g
    const r = g.mask ? fn(g.mask, g.maskAt) : null
    return { ...g, ...(r ? { mask: r.mask, maskAt: r.at } : {}), effects: fx(g.effects) as Effect[] | undefined }
  })
  const touched = (all && doc.effects?.some(e => e.mask)) || doc.frames?.some(f => (all || f.id === o.board) && f.effects?.some(e => e.mask))
  const nd: Doc = !touched ? doc : { ...doc, ...(all ? { effects: fx(doc.effects) as Effect[] | undefined } : {}), frames: doc.frames?.map(f => ((all || f.id === o.board) && f.effects?.some(e => e.mask) ? { ...f, effects: fx(f.effects) as Effect[] | undefined } : f)) }
  return { doc: nd, layers: nl, groups: ng }
}
/** Move placed masks by dx, dy (no pixels change). */
export const shiftMask = (dx: number, dy: number): MaskFn => (mask, at) => ({ mask, at: { x: (at?.x ?? 0) + dx, y: (at?.y ?? 0) + dy } })
/** A mask as a canvas the size of the page, at 0,0, then changed by `t` (for whole-page changes: resize, rotate). */
export function maskOnPage(w: number, h: number, t: (c: HTMLCanvasElement) => HTMLCanvasElement = c => c): MaskFn {
  return (mask, at) => {
    let c = mask
    if (at?.x || at?.y || mask.width !== w || mask.height !== h) { c = makeCanvas(w, h); ctx2d(c).drawImage(mask, at?.x ?? 0, at?.y ?? 0) }
    return { mask: t(c), at: null }
  }
}
/** Effect masks on layers, for whole-page pixel changes: put on the page as `before` had them, changed by `t`, and
 *  placed again relative to each layer as it is in `after`. */
export function layerFxMasksOnPage(before: Layer[], after: Layer[], w: number, h: number, t: (c: HTMLCanvasElement) => HTMLCanvasElement): Layer[] {
  return after.map((l, i) => {
    const b = before[i]; if (!b?.effects?.some(e => e.mask)) return l
    const effects = b.effects.map(e => {
      if (!e.mask) return e
      const r = maskOnPage(w, h, t)(e.mask, { x: b.x + (e.maskAt?.x ?? 0), y: b.y + (e.maskAt?.y ?? 0) })
      return { ...e, mask: r.mask, maskAt: { x: -l.x, y: -l.y } }
    })
    return { ...l, effects, rev: nextRev() } as Layer
  })
}

/** The document canvas must contain every board, or boards past its edge would not render. */
/** A design without boards becomes a design with one board, so boards can be added beside it. */
export function ensureFramed(doc: Doc, layers: Layer[]): { doc: Doc; layers: Layer[] } {
  if (doc.frames?.length) return { doc, layers }
  const f0: Frame = { id: uid(), name: doc.name, x: 0, y: 0, width: doc.width, height: doc.height, background: doc.background }
  return { doc: { ...doc, frames: [f0], background: null }, layers: layers.map(l => ({ ...l, frameId: f0.id } as Layer)) }
}

/**
 * Boards may be placed left of or above the others. The pasteboard starts at 0,0, so shift
 * everything back into positive space and move the view by the same amount: nothing appears to jump.
 */
function settleInto(doc: Doc, layers: Layer[], groups: Group[], view: View): { doc: Doc; layers: Layer[]; groups: Group[]; view: View } {
  if (!doc.frames?.length) return { doc, layers, groups, view }
  const minX = Math.min(0, ...doc.frames.map(f => f.x)), minY = Math.min(0, ...doc.frames.map(f => f.y))
  const dx = minX < 0 ? -Math.floor(minX) : 0, dy = minY < 0 ? -Math.floor(minY) : 0
  if (!dx && !dy) return { doc: coverFrames(doc), layers, groups, view }
  const frames = doc.frames.map(f => ({ ...f, x: f.x + dx, y: f.y + dy }))
  const guides = doc.guides ? { v: doc.guides.v.map(v => v + dx), h: doc.guides.h.map(h => h + dy) } : doc.guides
  const moved = layers.map(l => (l.type === 'adjustment' && !l.frameId ? l : ({ ...l, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer)))
  // Placed masks move with everything else.
  const m = mapDocMasks({ ...doc, frames, guides, width: doc.width + dx, height: doc.height + dy }, moved, groups, shiftMask(dx, dy))
  return { doc: coverFrames(m.doc), layers: m.layers, groups: m.groups, view: { ...view, panX: view.panX - dx * view.zoom, panY: view.panY - dy * view.zoom } }
}

function coverFrames(doc: Doc): Doc {
  if (!doc.frames?.length) return doc
  const r = Math.max(doc.width, ...doc.frames.map(f => f.x + f.width)), b = Math.max(doc.height, ...doc.frames.map(f => f.y + f.height))
  return r === doc.width && b === doc.height ? doc : { ...doc, width: Math.ceil(r), height: Math.ceil(b) }
}

/** A layer with a patch applied; text keeps its anchor unless the patch places it or sizes its box. */
function anchored(l: Layer, patch: Partial<Layer>): Layer {
  let next = { ...l, ...patch, rev: nextRev() } as Layer
  if(l.mask && l.maskLinked!==false && l.maskResize==='scale' && !('mask' in patch) && l.type!=='adjustment') {
    const a=layerSize(l),b=layerSize(next)
    if(a.w!==b.w || a.h!==b.h){const mask=makeCanvas(b.w,b.h);ctx2d(mask).drawImage(l.mask,0,0,b.w,b.h);next={...next,mask} as Layer}
  }
  return 'x' in patch || 'y' in patch || 'boxWidth' in patch ? next : keepTextAnchor(l, next)
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: null,
  layers: [],
  groups: [],
  activeId: null,
  selectedIds: [],
  keyObjectId: null,
  isolatedGroupId: null,
  editingTextId: null,
  activeFrameId: null,
  compare: false,
  fxOff: false,
  drawInsideId: null,
  editingMask: false,
  selection: null,
  selRev: 0,
  docRev: 0,

  tool: 'move',
  options: { size: 40, hardness: 0.8, opacity: 1, tolerance: 32, contiguous: true, shape: 'rect', cropAspect: null, feather: 0, flow: 1, smoothing: 0.25, sides: 5, star: 1, selMode: 'new', toneRange: 'midtones', exposure: 0.5, sampleAll: true, pressureSize: true, pressureOpacity: false, autoSelect: true, autoSelectGroup: true, showTransform: true, showDistances: true, spongeMode: 'desaturate' },
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
    set({ doc, layers: [], groups: [], selectedIds: [], editingTextId: null, activeId: null, selection: null, drawInsideId: null, cloneSource: null, editingMask: false, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move' })
    get().commit('New design')
    set({ dirty: false })
  },

  loadProject: (doc, layers, swatches, groups) => {
    const top = layers[layers.length - 1]?.id ?? null
    set({ doc, layers, groups: groups ?? [], selectedIds: top ? [top] : [], editingTextId: null, activeId: top, selection: null, drawInsideId: null, cloneSource: null, editingMask: false, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move', ...(swatches ? { swatches } : {}) })
    get().commit('Open')
    set({ dirty: false })
  },

  loadFramed: (doc, layers, swatches, groups) => {
    const top = layers[layers.length - 1]?.id ?? null
    set({ doc, layers, groups: groups ?? [], selectedIds: top ? [top] : [], editingTextId: null, activeId: top, activeFrameId: doc.frames?.[0]?.id ?? null, selection: null, drawInsideId: null, cloneSource: null, editingMask: false, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null, docRev: get().docRev + 1, selRev: get().selRev + 1, tool: 'move', ...(swatches ? { swatches } : {}) })
    get().commit('Open'); set({ dirty: false })
  },

  closeDoc: () => set({ doc: null, layers: [], groups: [], selectedIds: [], editingTextId: null, activeId: null, selection: null, drawInsideId: null, cloneSource: null, history: [], historyIndex: -1, snapshots: [], quickMask: false, transform: null, viewChannel: 'rgb', activePathId: null, vmaskEditId: null }),

  setDoc: (patch, commit) => {
    const { doc } = get(); if (!doc) return
    set({ doc: { ...doc, ...patch }, docRev: get().docRev + 1 })
    if (commit) get().commit('Document')
  },

  cropTo: (x, y, w, h) => {
    const { doc, layers, groups } = get(); if (!doc) return
    x = Math.round(x); y = Math.round(y); w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
    const next = layers.map(l => {
      if (l.type === 'adjustment') {
        if (!l.mask) return { ...l, rev: nextRev() }
        const m = makeCanvas(w, h); ctx2d(m).drawImage(l.mask, (l.maskAt?.x ?? 0) - x, (l.maskAt?.y ?? 0) - y)
        return { ...l, mask: m, maskAt: null, rev: nextRev() }
      }
      return { ...l, x: l.x - x, y: l.y - y, rev: nextRev() }
    })
    const m = mapDocMasks({ ...doc, width: w, height: h }, next, groups, shiftMask(-x, -y), { adjustments: false })
    set({ doc: m.doc, layers: m.layers, groups: m.groups, selection: null, selRev: get().selRev + 1, docRev: get().docRev + 1 })
    get().commit('Crop')
  },

  setActiveFrame: (id) => set({ activeFrameId: id }),

  addFrame: (preset) => {
    const st = get(); if (!st.doc) return
    const { doc, layers } = ensureFramed(st.doc, st.layers)
    const frames = doc.frames!
    // Beside the active board, in the first free spot to its right.
    const ref = frames.find(f => f.id === st.activeFrameId) ?? frames[frames.length - 1]
    const p = placeBeside(occupied(doc, layers), { x: ref.x, y: ref.y, w: ref.width, h: ref.height }, preset.width, preset.height, 'right', boardGap([...frames, preset]))
    const f: Frame = { id: uid(), name: preset.name, x: p.x, y: p.y, width: preset.width, height: preset.height, background: '#ffffff' }
    set({ doc: coverFrames({ ...doc, frames: [...frames, f] }), layers, activeFrameId: f.id, docRev: get().docRev + 1 })
    get().commit('Add board')
  },

  applyBoards: (doc, layers, groups, label, activeFrameId) => {
    const r = settleInto(doc, layers, groups, get().view)
    set({ doc: r.doc, layers: r.layers, groups: r.groups, view: r.view, activeFrameId: activeFrameId ?? get().activeFrameId, selectedIds: [], activeId: null, editingMask: false, docRev: get().docRev + 1, dirty: true })
    get().commit(label)
  },

  removeFrame: (id) => {
    const { doc, layers, groups, activeFrameId } = get(); if (!doc?.frames) return
    const f = doc.frames.find(x => x.id === id); if (!f) return
    if (doc.frames.length < 2) { get().notify('A design needs at least one board. Add another board before closing this one.'); return }
    const frames = doc.frames.filter(x => x.id !== id)
    const next = releaseOrphans(layers.filter(l => l.frameId !== id))
    const keep = activeFrameId && activeFrameId !== id ? activeFrameId : frames[frames.length - 1].id
    set({ doc: { ...doc, frames }, layers: next, groups: prune(groups, next), activeFrameId: keep, selectedIds: [], activeId: null, editingMask: false, docRev: get().docRev + 1 })
    get().commit('Delete board')
    get().notify(`Board “${f.name}” deleted. Undo brings it back.`)
  },

  moveFrame: (id, dx, dy) => {
    const { doc, layers, groups } = get(); if (!doc?.frames || (!dx && !dy)) return
    const m = mapDocMasks(
      { ...doc, frames: doc.frames.map(f => f.id === id ? { ...f, x: f.x + dx, y: f.y + dy } : f) },
      layers.map(l => l.frameId === id ? ({ ...l, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer) : l),
      groups, shiftMask(dx, dy), { board: id })
    set({ doc: m.doc, layers: m.layers, groups: m.groups, docRev: get().docRev + 1 })
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
    const nd: Doc = { ...doc, frames, guides, width: loose ? Math.max(doc.width + dx, r) : r, height: loose ? Math.max(doc.height + dy, b) : b }
    const nl = dx || dy ? layers.map(l => ({ ...l, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer)) : layers
    const m = dx || dy ? mapDocMasks(nd, nl, get().groups, shiftMask(dx, dy)) : { doc: nd, layers: nl, groups: get().groups }
    set({ doc: m.doc, layers: m.layers, groups: m.groups, docRev: get().docRev + 1 })
    return { dx, dy }
  },

  removeGroup: (groupId) => {
    const { layers, groups } = get()
    const g = groups.find(x => x.id === groupId); if (!g) return
    if (layers.some(l => inGroup(l, groupId, groups) && l.locked)) { get().notify('This group has locked layers. Unlock them to delete the group.'); return }
    const next = releaseOrphans(layers.filter(l => !inGroup(l, groupId, groups)))
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

  duplicateFrame: (id, side = 'right', empty = false) => {
    const { doc, layers, groups } = get(); if (!doc?.frames) return
    const src = doc.frames.find(f => f.id === id); if (!src) return
    const taken = new Set(doc.frames.map(f => f.name))
    const stem = src.name.replace(/ copy( \d+)?$/, '')
    let name = `${stem} copy`; for (let n = 2; taken.has(name); n++) name = `${stem} copy ${n}`
    const p = placeBeside(occupied(doc, layers), { x: src.x, y: src.y, w: src.width, h: src.height }, src.width, src.height, side, boardGap(doc.frames))
    const fxLinks = new Map<string, string>()
    const nf: Frame = { ...src, id: uid(), name, x: p.x, y: p.y, linkedFrom: null, deliverableId: null, effects: freshFx(src.effects, fxLinks) }
    const dx = nf.x - src.x, dy = nf.y - src.y
    const srcLayers = empty ? [] : layers.filter(l => l.frameId === id)
    // Copy layers and give the copy its own groups (nested groups keep their nesting).
    const groupMap = new Map<string, string>()
    const byId = new Map(groups.map(g => [g.id, g]))
    const want = (gid?: string | null) => { let g = gid ? byId.get(gid) : undefined; while (g && !groupMap.has(g.id)) { groupMap.set(g.id, uid()); g = g.parentId ? byId.get(g.parentId) : undefined } }
    srcLayers.forEach(l => want(l.groupId))
    // Layers linked to each other on the board stay linked in the copy, but not to the originals.
    const linkMap = new Map<string, string>()
    const relink = (lid?: string | null) => { if (!lid) return null; if (!linkMap.has(lid)) linkMap.set(lid, uid()); return linkMap.get(lid)! }
    const copies = srcLayers.map(l => ({ ...l, id: uid(), frameId: nf.id, srcId: undefined, linkId: relink(l.linkId), effects: freshFx(l.effects, fxLinks), groupId: l.groupId ? groupMap.get(l.groupId)! : null, x: l.x + dx, y: l.y + dy, rev: nextRev() } as Layer))
    const idMap = new Map(srcLayers.map((l, i) => [l.id, copies[i].id]))
    for (const c of copies) if (c.clipId) c.clipId = idMap.get(c.clipId) ?? null
    const newGroups0 = groups.filter(g => groupMap.has(g.id)).map(g => ({ ...g, id: groupMap.get(g.id)!, parentId: g.parentId ? groupMap.get(g.parentId) ?? null : null, effects: freshFx(g.effects, fxLinks) }))
    // The copies' placed masks go with them to the new board.
    const moved = mapDocMasks({ ...doc, effects: undefined, frames: [nf] }, copies, newGroups0, shiftMask(dx, dy))
    const r = settleInto({ ...doc, frames: [...doc.frames, moved.doc.frames![0]] }, [...layers, ...moved.layers], [...groups, ...moved.groups], get().view)
    set({ doc: r.doc, layers: r.layers, view: r.view, groups: r.groups, activeFrameId: nf.id, docRev: get().docRev + 1 })
    get().commit(empty ? 'Add board' : 'Duplicate board')
  },

  organiseFrames: () => {
    const { doc } = get(); if (!doc?.frames?.length) return
    const frames = doc.frames
    const gap = boardGap(frames)
    // Each master sits on its own row with its formats in the row below, widest to tallest.
    // Boards on their own are packed into rows of a sensible width.
    const ids = new Set(frames.map(f => f.id))
    const kids = (id: string) => frames.filter(f => f.linkedFrom === id).sort((a, b) => b.width / b.height - a.width / a.height)
    const rows: Frame[][] = []
    const loose: Frame[] = []
    for (const f of frames) {
      if (f.linkedFrom && ids.has(f.linkedFrom)) continue
      const k = kids(f.id)
      if (k.length) { rows.push([f]); rows.push(k) } else loose.push(f)
    }
    if (loose.length) {
      const area = loose.reduce((a, f) => a + f.width * f.height, 0)
      const limit = Math.max(...loose.map(f => f.width), Math.sqrt(area) * 1.8)
      let row: Frame[] = [], w = 0
      for (const f of loose) {
        if (row.length && w + gap + f.width > limit) { rows.push(row); row = []; w = 0 }
        w += (row.length ? gap : 0) + f.width; row.push(f)
      }
      if (row.length) rows.push(row)
    }
    const deltas = new Map<string, { dx: number; dy: number }>()
    const placed: Frame[] = []
    let y = 0
    for (const row of rows) {
      let x = 0
      for (const f of row) { deltas.set(f.id, { dx: x - f.x, dy: y - f.y }); placed.push({ ...f, x, y }); x += f.width + gap }
      y += Math.max(...row.map(f => f.height)) + gap * 2
    }
    const order = new Map(frames.map((f, i) => [f.id, i]))
    placed.sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    const layers = get().layers.map(l => { const d = l.frameId ? deltas.get(l.frameId) : null; return d ? ({ ...l, x: l.x + d.dx, y: l.y + d.dy, rev: nextRev() } as Layer) : l })
    const width = Math.max(...placed.map(f => f.x + f.width)), height = Math.max(...placed.map(f => f.y + f.height))
    const loosePx = layers.some(l => !l.frameId && l.type !== 'adjustment')
    set({ doc: { ...doc, frames: placed, width: loosePx ? Math.max(doc.width, width) : width, height: loosePx ? Math.max(doc.height, height) : height }, layers, docRev: get().docRev + 1 })
    get().commit('Organise boards')
  },

  reassignLayerFrame: (layerId, frameId) => {
    set({ layers: get().layers.map(l => l.id === layerId ? ({ ...l, frameId, rev: nextRev() } as Layer) : l), docRev: get().docRev + 1 })
  },

  active: () => get().layers.find(l => l.id === get().activeId) ?? null,
  setActive: (id) => set({ activeId: id, selectedIds: id ? [id] : [], editingMask: false, keyObjectId: null }),

  toggleSelect: (id) => {
    const cur = get().selectedIds
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    const key = get().keyObjectId
    set({ selectedIds: next, activeId: next.includes(id) ? id : (next[next.length - 1] ?? null), editingMask: false, keyObjectId: key && next.includes(key) ? key : null })
  },

  setKeyObject: (id) => set({ keyObjectId: id && get().selectedIds.includes(id) ? id : null }),
  setIsolated: (groupId) => {
    if (!groupId) { set({ isolatedGroupId: null }); return }
    const ids = get().layers.filter(l => inGroup(l, groupId, get().groups)).map(l => l.id)
    set({ isolatedGroupId: groupId, selectedIds: ids.slice(-1), activeId: ids[ids.length - 1] ?? null, keyObjectId: null })
  },

  duplicateSelected: (opts = {}) => {
    const { layers, groups, selectedIds } = get()
    const dx = opts.dx ?? 0, dy = opts.dy ?? 0
    const sel = new Set(selectedIds)
    if (!sel.size) return []
    // Units to copy: the outermost groups whose layers are all selected, then any other selected layer on its own.
    const whole = (gid: string) => layers.filter(l => inGroup(l, gid, groups)).every(l => sel.has(l.id))
    const groupUnits = new Set<string>()
    for (const l of layers) {
      if (!sel.has(l.id)) continue
      const chain = groupChain(l.groupId, groups)
      let top: string | null = null
      for (const gid of chain) if (whole(gid)) top = gid
      if (top) groupUnits.add(top)
    }
    type Unit = { ids: string[]; end: number; group: string | null }
    const units: Unit[] = []
    for (const gid of Array.from(groupUnits)) {
      const ids = layers.filter(l => inGroup(l, gid, groups)).map(l => l.id)
      units.push({ ids, end: Math.max(...ids.map(id => layers.findIndex(l => l.id === id))), group: gid })
    }
    const inUnit = new Set(units.flatMap(u => u.ids))
    layers.forEach((l, i) => { if (sel.has(l.id) && !inUnit.has(l.id)) units.push({ ids: [l.id], end: i, group: null }) })
    // From the top of the stack down, so earlier inserts do not move later positions.
    units.sort((a, b) => b.end - a.end)
    const next = [...layers]; const nextGroups = [...groups]
    const taken = new Set(layers.map(l => l.name))
    const copies: string[] = []
    const linkMap = new Map<string, string>(), fxLinks = new Map<string, string>()
    for (const u of units) {
      const gMap = new Map<string, string>()
      if (u.group) {
        // Copy the group and every group inside it; the copy sits beside the original, in the same parent.
        const byId = new Map(groups.map(g => [g.id, g]))
        const inside = groups.filter(g => groupChain(g.id, groups).includes(u.group!))
        for (const g of inside) gMap.set(g.id, uid())
        for (const g of inside) nextGroups.push({ ...g, id: gMap.get(g.id)!, name: g.id === u.group ? copyName(g.name, groups.map(x => x.name)) : g.name, parentId: g.id === u.group ? (byId.get(u.group!)?.parentId ?? null) : gMap.get(g.parentId!) ?? g.parentId ?? null, effects: freshFx(g.effects, fxLinks) })
      }
      const idMap = new Map<string, string>()
      const made = u.ids.map(id => {
        const l = layers.find(x => x.id === id)!
        const nid = uid(); idMap.set(id, nid)
        const name = u.group ? l.name : copyName(l.name, taken); taken.add(name)
        const lk = l.linkId ? (linkMap.get(l.linkId) ?? (linkMap.set(l.linkId, uid()), linkMap.get(l.linkId)!)) : null
        return { ...l, id: nid, name, srcId: null, linkId: u.group ? lk : null, effects: freshFx(l.effects, fxLinks), groupId: l.groupId && gMap.has(l.groupId) ? gMap.get(l.groupId)! : l.groupId ?? null, x: l.x + (l.type === 'adjustment' ? 0 : dx), y: l.y + (l.type === 'adjustment' ? 0 : dy), rev: nextRev() } as Layer
      })
      for (const c of made) if (c.clipId && idMap.has(c.clipId)) c.clipId = idMap.get(c.clipId)!
      const at = next.findIndex(l => l.id === u.ids[u.ids.length - 1])
      next.splice(at + 1, 0, ...made)
      copies.push(...made.map(m => m.id))
    }
    // Copies moved onto another board belong to that board.
    const doc = get().doc
    const placed = doc?.frames?.length && (dx || dy) ? next.map(l => (copies.includes(l.id) && l.type !== 'adjustment' ? ({ ...l, frameId: boardFor(doc, l, get().activeFrameId) } as Layer) : l)) : next
    // Copied groups moved by dx, dy take their placed masks with them.
    const fresh = new Set(nextGroups.slice(groups.length).map(g => g.id))
    const shifted = (dx || dy) && doc && fresh.size ? mapDocMasks(doc, [], nextGroups.filter(g => fresh.has(g.id)), shiftMask(dx, dy)).groups : []
    const finalGroups = shifted.length ? nextGroups.map(g => shifted.find(x => x.id === g.id) ?? g) : nextGroups
    set({ layers: placed, groups: prune(finalGroups, placed), selectedIds: copies, activeId: copies[0] ?? null, keyObjectId: null, editingMask: false, docRev: get().docRev + 1 })
    if (opts.commit !== false) get().commit(opts.label ?? (copies.length > 1 ? 'Duplicate layers' : 'Duplicate layer'))
    return copies
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
    // The new group goes where the topmost selected layer was, but never in the middle of a group it
    // does not belong to: members of a group always stay next to each other in the stack.
    const topIndex = Math.max(...selectedIds.map(id => layers.findIndex(l => l.id === id)))
    const rest = layers.filter(l => !selectedIds.includes(l.id))
    let ins = layers.slice(0, topIndex).filter(l => !selectedIds.includes(l.id)).length
    const anc = new Set(parent ? groupChain(parent, groups) : [])
    const chainOf = (l: Layer) => groupChain(l.groupId, groups)
    const blocking = (i: number) => {
      if (i <= 0 || i >= rest.length) return null
      const above = new Set(chainOf(rest[i]))
      const shared = chainOf(rest[i - 1]).filter(gid => above.has(gid) && !anc.has(gid))
      return shared.length ? shared[shared.length - 1] : null
    }
    for (let gB = blocking(ins), guard = 0; gB && guard < 64; gB = blocking(ins), guard++) { while (ins < rest.length && chainOf(rest[ins]).includes(gB)) ins++ }
    rest.splice(ins, 0, ...picked)
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

  addEffect: (targets, fx, label) => {
    const st = get(); if (!targets.length) return
    const add = Array.isArray(fx) ? fx : [fx]; if (!add.length) return
    const links = add.map(() => (targets.length > 1 ? fxId() : null))
    const changes = targets.map(t => ({ t, list: [...stackOf(st, t), ...add.map((e, i) => ({ ...copyEffect(e), ...(links[i] ? { link: links[i] } : {}) }))] }))
    applyFx(set, get, changes)
    get().commit(label ?? 'Add effect')
  },
  updateEffect: (t, id, patch, label) => {
    applyFx(set, get, patchEffect(get(), t, id, patch))
    if (label) get().commit(label, { merge: 800 })
  },
  removeEffect: (t, id) => {
    const st = get(); const list = stackOf(st, t); const gone = list.find(e => e.id === id); if (!gone) return
    const changes = [{ t, list: list.filter(e => e.id !== id) }]
    // The last other copy of a link is no longer linked to anything.
    if (gone.link) { const rest = linkedCopies(st, gone.link).filter(c => !(sameTarget(c.t, t) && c.id === id)); if (rest.length === 1) changes.push({ t: rest[0].t, list: stackOf(st, rest[0].t).map(e => (e.id === rest[0].id ? { ...e, link: null } : e)) }) }
    applyFx(set, get, changes)
    get().commit('Remove effect')
  },
  moveEffect: (t, from, to) => { applyFx(set, get, [{ t, list: moveInList(stackOf(get(), t), from, to) }]); get().commit('Reorder effects') },
  duplicateEffect: (t, id) => {
    const list = stackOf(get(), t); const i = list.findIndex(e => e.id === id); if (i < 0) return
    const next = list.slice(); next.splice(i + 1, 0, copyEffect(list[i]))
    applyFx(set, get, [{ t, list: next }]); get().commit('Duplicate effect')
  },
  resetEffect: (t, id) => {
    const e = stackOf(get(), t).find(x => x.id === id); if (!e) return
    const fresh = resetFx(e); const { id: _i, link: _l, on: _o, ...settings } = fresh
    applyFx(set, get, patchEffect(get(), t, id, { ...settings, opacity: 1, blend: 'source-over' }))
    get().commit('Reset effect')
  },
  unlinkEffect: (t, id) => {
    const st = get(); const e = stackOf(st, t).find(x => x.id === id); if (!e?.link) return
    const others = linkedCopies(st, e.link).filter(c => !(sameTarget(c.t, t) && c.id === id))
    const changes = [{ t, list: stackOf(st, t).map(x => (x.id === id ? { ...x, link: null } : x)) }]
    if (others.length === 1) changes.push({ t: others[0].t, list: stackOf(st, others[0].t).map(x => (x.id === others[0].id ? { ...x, link: null } : x)) })
    applyFx(set, get, changes); get().commit('Unlink effect')
  },
  linkEffectTo: (t, id, more) => {
    const st = get(); const e = stackOf(st, t).find(x => x.id === id); if (!e) return
    const link = e.link ?? fxId()
    const have = e.link ? linkedCopies(st, e.link) : []
    const add = more.filter(m => !sameTarget(m, t) && !have.some(h => sameTarget(h.t, m)))
    if (!add.length) return
    const changes = [{ t, list: stackOf(st, t).map(x => (x.id === id ? { ...x, link } : x)) }, ...add.map(m => ({ t: m, list: [...stackOf(st, m), { ...copyEffect(e), link }] }))]
    applyFx(set, get, changes); get().commit('Link effect')
  },
  setEffects: (t, list, label) => { applyFx(set, get, [{ t, list }]); get().commit(label) },
  groupFxToContents: (groupId) => {
    const st = get(); const g = st.groups.find(x => x.id === groupId); if (!g?.effects?.length) return
    // Direct children: layers in the group itself, and groups whose parent is this one.
    const kids: FxTarget[] = [
      ...st.layers.filter(l => l.groupId === groupId && l.type !== 'adjustment').map(l => ({ type: 'layer' as const, id: l.id })),
      ...st.groups.filter(x => x.parentId === groupId).map(x => ({ type: 'group' as const, id: x.id })),
    ]
    if (!kids.length) return
    const links = g.effects.map(e => e.link ?? fxId())
    const changes = [{ t: { type: 'group', id: groupId } as FxTarget, list: [] as Effect[] }, ...kids.map(k => ({ t: k, list: [...stackOf(st, k), ...g.effects!.map((e, i) => ({ ...copyEffect(e), link: kids.length > 1 ? links[i] : null }))] }))]
    applyFx(set, get, changes); get().commit('Effects on each layer')
  },
  setFxExclude: (t, v) => {
    if (t.type === 'layer') set({ layers: get().layers.map(l => (l.id === t.id ? ({ ...l, fxExclude: v || undefined, rev: nextRev() } as Layer) : l)), docRev: get().docRev + 1 })
    else set({ groups: get().groups.map(g => (g.id === t.id ? { ...g, fxExclude: v || undefined } : g)), docRev: get().docRev + 1 })
    get().commit(v ? 'Leave out of group effects' : 'Back in group effects')
  },
  setGroupMask: (groupId, how) => {
    const st = get(); const g = st.groups.find(x => x.id === groupId); if (!g || !st.doc) return
    const { width: w, height: h } = st.doc
    let mask = g.mask ?? null, enabled = g.maskEnabled !== false, at = g.maskAt ?? null
    if (how === 'remove') { mask = null; at = null }
    else if (how === 'toggle') enabled = !enabled
    else if (how === 'invert' && mask) { const src = maskOnPage(w, h)(mask, at).mask; const c = makeCanvas(w, h); const x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; x.drawImage(src, 0, 0); mask = c; at = null }
    else {
      // Masks are new canvases every time, never changed in place, so history and caches stay right.
      const c = makeCanvas(w, h); const x = ctx2d(c)
      if (how === 'reveal' || !st.selection) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h) }
      else if (how === 'selection') x.drawImage(st.selection, 0, 0, w, h)
      else { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; x.drawImage(st.selection, 0, 0, w, h) }
      mask = c; enabled = true; at = null
    }
    set({ groups: st.groups.map(x => (x.id === groupId ? { ...x, mask, maskAt: at, maskEnabled: enabled } : x)), docRev: st.docRev + 1 })
    get().commit(how === 'remove' ? 'Remove group mask' : how === 'invert' ? 'Invert group mask' : how === 'toggle' ? 'Toggle group mask' : 'Group mask')
  },
  setEffectMask: (t, id, how) => {
    const st = get(); if (!st.doc) return
    const fx = stackOf(st, t).find(e => e.id === id); if (!fx) return
    const { width: w, height: h } = st.doc
    let patch: Partial<Effect>
    // Where this copy's mask sits on the page (a layer's is relative to the layer).
    const lay = t.type === 'layer' ? st.layers.find(l => l.id === t.id) : null
    const pageAt = (e: Effect): MaskAt => ({ x: (lay?.x ?? 0) + (e.maskAt?.x ?? 0), y: (lay?.y ?? 0) + (e.maskAt?.y ?? 0) })
    if (how === 'remove') patch = { mask: null, maskAt: null, maskOn: undefined }
    else if (how === 'toggle') { if (!fx.mask) return; patch = { maskOn: fx.maskOn === false } }
    else if (how === 'invert') {
      if (!fx.mask) return
      const src = maskOnPage(w, h)(fx.mask, pageAt(fx)).mask
      const c = makeCanvas(w, h); const x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; x.drawImage(src, 0, 0); patch = { mask: c }
    } else {
      if (!st.selection) { get().notify('Make a selection first: the effect then shows only there.'); return }
      // A new canvas every time, never changed in place, so history and caches stay right.
      const c = makeCanvas(w, h); const x = ctx2d(c)
      if (how === 'selection') x.drawImage(st.selection, 0, 0, w, h)
      else { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; x.drawImage(st.selection, 0, 0, w, h) }
      patch = { mask: c, maskOn: true }
    }
    const changes = patchEffect(st, t, id, patch)
    // A new mask is page pixels at 0,0: on a layer it is placed relative to that layer, so it moves with it.
    if (patch.mask) for (const ch of changes) {
      const owner = ch.t.type === 'layer' ? st.layers.find(l => l.id === (ch.t as { id: string }).id) : null
      ch.list = ch.list.map(e => (e.mask === patch.mask ? { ...e, maskAt: owner ? { x: -owner.x, y: -owner.y } : null } : e))
    }
    applyFx(set, get, changes)
    get().commit(how === 'remove' ? 'Remove effect mask' : how === 'invert' ? 'Invert effect mask' : how === 'toggle' ? 'Effect mask on or off' : 'Effect mask')
  },
  updateGroup: (groupId, patch, commitLabel) => {
    set({ groups: get().groups.map(g => (g.id === groupId ? { ...g, ...patch } : g)), docRev: get().docRev + 1 })
    if (commitLabel) get().commit(commitLabel)
  },

  align: (how) => {
    const { layers, selectedIds, doc, groups, isolatedGroupId, keyObjectId } = get(); if (!doc) return
    // Whole groups move as one object; a locked layer keeps its whole object in place.
    const units = alignUnits(layers, groups, selectedIds, isolatedGroupId)
    if (!units.length) return
    const boxes = units.map(u => unionBox(u.ls.map(l => layerBounds(l, doc))))
    // One object aligns to its board (or the page without boards). Several align to the key object if one
    // is chosen, otherwise to the box around them all.
    const first = units[0].ls[0]
    const board = units.length === 1 && doc.frames?.length ? doc.frames.find(f => f.id === (first.frameId ?? boardFor(doc, first, get().activeFrameId))) : null
    const key = units.length > 1 && keyObjectId ? units.findIndex(u => u.ids.includes(keyObjectId)) : -1
    const frame = units.length === 1 ? (board ? { x: board.x, y: board.y, w: board.width, h: board.height } : { x: 0, y: 0, w: doc.width, h: doc.height }) : key >= 0 ? boxes[key] : unionBox(boxes)
    const moves = new Map<string, { dx: number; dy: number }>()
    units.forEach((u, i) => {
      const b = boxes[i]
      const dx = how === 'left' ? frame.x - b.x : how === 'hcenter' ? frame.x + frame.w / 2 - (b.x + b.w / 2) : how === 'right' ? frame.x + frame.w - (b.x + b.w) : 0
      const dy = how === 'top' ? frame.y - b.y : how === 'vcenter' ? frame.y + frame.h / 2 - (b.y + b.h / 2) : how === 'bottom' ? frame.y + frame.h - (b.y + b.h) : 0
      for (const l of u.ls) moves.set(l.id, { dx, dy })
    })
    set({ layers: layers.map(l => { const m = moves.get(l.id); return m ? ({ ...l, x: l.x + m.dx, y: l.y + m.dy, rev: nextRev() } as Layer) : l }), docRev: get().docRev + 1 })
    get().commit('Align', { ifChanged: true })
  },

  distribute: (axis, fixedGap) => {
    const { layers, selectedIds, doc, groups, isolatedGroupId } = get(); if (!doc) return
    const units = alignUnits(layers, groups, selectedIds, isolatedGroupId)
    if (units.length < (fixedGap != null ? 2 : 3)) return
    const boxes = units.map(u => ({ u, b: unionBox(u.ls.map(l => layerBounds(l, doc))) }))
    // Sort along the axis, keep the first where it is, and space the rest by the gap (even, or the one given).
    boxes.sort((a, b) => axis === 'h' ? (a.b.x - b.b.x) : (a.b.y - b.b.y))
    const first = boxes[0].b, last = boxes[boxes.length - 1].b
    const totalSpan = axis === 'h' ? (last.x + last.w) - first.x : (last.y + last.h) - first.y
    const sumSize = boxes.reduce((n, x) => n + (axis === 'h' ? x.b.w : x.b.h), 0)
    const gap = fixedGap != null ? fixedGap : (totalSpan - sumSize) / (boxes.length - 1)
    let cursor = axis === 'h' ? first.x : first.y
    const moves = new Map<string, { dx: number; dy: number }>()
    boxes.forEach(({ u, b }) => {
      const m = axis === 'h' ? { dx: cursor - b.x, dy: 0 } : { dx: 0, dy: cursor - b.y }
      cursor += (axis === 'h' ? b.w : b.h) + gap
      for (const l of u.ls) moves.set(l.id, m)
    })
    set({ layers: layers.map(l => { const m = moves.get(l.id); return m ? ({ ...l, x: l.x + m.dx, y: l.y + m.dy, rev: nextRev() } as Layer) : l }), docRev: get().docRev + 1 })
    get().commit('Distribute', { ifChanged: true })
  },

  // Set a layer's document-space box precisely. x/y move the top-left of the unrotated bounds; w/h rescale from it.
  setLayerBox: (id, box) => {
    const { layers, doc } = get(); if (!doc) return
    const l = layers.find(x => x.id === id); if (!l || l.type === 'adjustment') return
    if (l.locked || l.lockPosition) { get().notify('This layer is locked. Unlock it to move or resize it.'); return }
    const b = layerBounds(l, doc)
    const patch: any = {}
    if (box.x != null) patch.x = l.x + (box.x - b.x)
    if (box.y != null) patch.y = l.y + (box.y - b.y)
    if (box.w != null && b.w > 0) { const k = box.w / b.w; if (l.type === 'text') patch.fontSize = Math.max(1, l.fontSize * k); else patch.scaleX = l.scaleX * k }
    if (box.h != null && b.h > 0) { const k = box.h / b.h; if (l.type === 'text') { /* text height follows fontSize */ } else patch.scaleY = l.scaleY * k }
    set({ layers: layers.map(x => x.id === id ? anchored(x,patch) : x), docRev: get().docRev + 1 })
  },

  removeSelected: () => {
    const { layers, selectedIds, groups } = get(); if (!selectedIds.length) return
    // Locked layers are never deleted by a selection; unlock them first.
    const gone = new Set(layers.filter(l => selectedIds.includes(l.id) && !l.locked).map(l => l.id))
    const kept = selectedIds.length - gone.size
    if (!gone.size) { get().notify(kept > 1 ? 'These layers are locked. Unlock them to delete them.' : 'This layer is locked. Unlock it to delete it.'); return }
    const next = releaseOrphans(layers.filter(l => !gone.has(l.id)))
    const keep = next[next.length - 1]?.id ?? null
    set({ drawInsideId: gone.has(get().drawInsideId??'')?null:get().drawInsideId, layers: next, groups: prune(groups, next), activeId: keep, selectedIds: keep ? [keep] : [], editingMask: false, docRev: get().docRev + 1 })
    get().commit(gone.size > 1 ? 'Delete layers' : 'Delete layer')
    if (kept) get().notify(`${kept} locked ${kept > 1 ? 'layers were' : 'layer was'} kept.`)
  },

  addLayer: (l, label) => {
    const { layers, activeId } = get()
    let idx = activeId ? layers.findIndex(x => x.id === activeId) : layers.length - 1
    const inside = layers.find(x => x.id === get().drawInsideId)
    if (inside && l.type !== 'adjustment') {
      if(layers[idx]?.clipId!==inside.id)idx=layers.indexOf(inside)
      l = { ...l, clipId: inside.id, groupId: inside.groupId??null, frameId: inside.frameId??null } as Layer
    }
    const next = [...layers]
    const st = get(); const host = idx >= 0 ? layers[idx] : null
    if (st.doc?.frames?.length && l.frameId === undefined) l = { ...l, frameId: boardFor(st.doc, l, st.activeFrameId) } as Layer
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

  addImage: (src, w, h, name, opts = {}) => {
    const { doc, layers, activeFrameId } = get(); if (!doc) return
    const c = makeCanvas(w, h)
    ctx2d(c).drawImage(src, 0, 0, w, h)
    const frame = doc.frames?.find(f => f.id === activeFrameId) ?? doc.frames?.[0] ?? null
    const box = frame ? { x: frame.x, y: frame.y, w: frame.width, h: frame.height } : { x: 0, y: 0, w: doc.width, h: doc.height }
    const label = name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || 'Image'
    if (opts.placement === 'corner') {
      // A logo: about a fifth of the shorter side, in the emptiest corner, with its clear space kept from the edge.
      const short = Math.min(box.w, box.h)
      const k = Math.min(1, (short * 0.22) / w, (short * 0.22) / h)
      const lw = w * k, lh = h * k
      const margin = Math.max(lh * (opts.clearSpace ?? 0.5), short * 0.05)
      const corners = [
        { x: box.x + margin, y: box.y + margin }, { x: box.x + box.w - margin - lw, y: box.y + margin },
        { x: box.x + margin, y: box.y + box.h - margin - lh }, { x: box.x + box.w - margin - lw, y: box.y + box.h - margin - lh },
      ]
      const others = layers.filter(l => l.visible && l.type !== 'adjustment' && (!frame || l.frameId === frame.id) && l.role !== 'background').map(l => layerBounds(l, doc)).filter(b => b.w * b.h < box.w * box.h * 0.8)
      const overlap = (p: { x: number; y: number }) => others.reduce((a, b) => a + Math.max(0, Math.min(p.x + lw, b.x + b.w) - Math.max(p.x, b.x)) * Math.max(0, Math.min(p.y + lh, b.y + b.h) - Math.max(p.y, b.y)), 0)
      const byName = { 'top-left': corners[0], 'top-right': corners[1], 'bottom-left': corners[2], 'bottom-right': corners[3] }
      // The photo's best corner, unless type or shapes are already there; else the emptiest corner.
      const fromPhoto = opts.cornerOrder?.map(c => byName[c]).find(p => overlap(p) < lw * lh * 0.05)
      const at = fromPhoto ?? corners.reduce((best, p) => (overlap(p) < overlap(best) ? p : best), corners[0])
      get().addLayer({ ...base(label), type: 'raster', canvas: c, source: 'photo', scaleX: k, scaleY: k, x: at.x, y: at.y, role: opts.role ?? 'logo', brandLogoId: opts.brandLogoId ?? null, frameId: frame?.id ?? null }, 'Add logo')
      set({ tool: 'move' })
      return
    }
    const fit = Math.min(1, box.w / w, box.h / h)
    get().addLayer({
      ...base(label), type: 'raster', canvas: c, source: 'photo',
      scaleX: fit, scaleY: fit, x: box.x + (box.w - w * fit) / 2, y: box.y + (box.h - h * fit) / 2, ...(frame ? { frameId: frame.id } : {}), ...(opts.role ? { role: opts.role } : {}), ...(opts.brandLogoId ? { brandLogoId: opts.brandLogoId } : {}),
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
    // With boards, new text goes in the middle of the board being worked on, not the middle of the pasteboard.
    const f = doc.frames?.find(fr => fr.id === get().activeFrameId) ?? doc.frames?.[0]
    const box = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: doc.width, h: doc.height }
    l.x = x ?? box.x + (box.w - s.w) / 2; l.y = y ?? box.y + (box.h - s.h) / 2
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
    const st = get()
    // Target what the designer selected, not every layer underneath by accident.
    // Multiple selections and existing clipped layers get native, editable effects on
    // each exact layer. This also avoids extending a clipping run to its other members.
    const targets = st.layers.filter(l => st.selectedIds.includes(l.id) && l.type !== 'adjustment')
    if (targets.length > 1 || (targets.length === 1 && targets[0].clipId)) {
      get().addEffect(targets.map(l => ({ type: 'layer' as const, id: l.id })), newEffect(kind, effect), 'Adjust selected layers')
      useUi.getState().showPanel('properties')
      return
    }

    // A new adjustment layer is clipped to the one selected layer by default.
    // "Changes" in Properties still lets the user switch to Everything below.
    const host = st.selectedIds.length === 1 ? targets[0] : null
    const l: AdjustmentLayer = {
      ...base(ADJUSTMENT_LABELS[kind]), type: 'adjustment', kind, values: { ...ADJUSTMENT_DEFAULTS[kind] },
      ...(host ? { clipId: host.id, reach: 'clip' as const, groupId: host.groupId ?? null, frameId: host.frameId ?? null } : {}),
      ...(kind === 'curves' ? { points: [[0, 0], [255, 255]] as [number, number][] } : {}),
      ...(kind === 'voidEffect' && effect ? { effect, effectParams: { ...defaultParams, seed: Math.random() * 1000 } } : {}),
    }
    if (kind === 'voidEffect' && effect) l.name = effect.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) + ' filter'
    get().addLayer(l, 'Add ' + l.name.toLowerCase())
    useUi.getState().showPanel('properties')
  },

  // Text keeps its anchor (left edge, middle or right edge, and top) when a change alters its size, unless the
  // change places the layer or sizes its box itself (handles, position fields).
  updateLayers: (updates) => {
    const map = new Map(updates.map(u => [u.id, u.patch]))
    set({ layers: get().layers.map(l => { const patch = map.get(l.id); return patch ? anchored(l, patch) : l }), docRev: get().docRev + 1 })
  },

  updateLayer: (id, patch, commitLabel) => {
    set({
      layers: get().layers.map(l => (l.id === id ? anchored(l, patch) : l)),
      docRev: get().docRev + 1,
    })
    if (commitLabel) get().commit(commitLabel)
  },

  removeLayer: (id) => {
    const { layers, activeId } = get()
    const idx = layers.findIndex(l => l.id === id); if (idx < 0) return
    if (layers[idx].locked) { get().notify('This layer is locked. Unlock it to delete it.'); return }
    const next = releaseOrphans(layers.filter(l => l.id !== id))
    const act = activeId === id ? (next[Math.max(0, idx - 1)]?.id ?? null) : activeId
    set({ drawInsideId: get().drawInsideId===id?null:get().drawInsideId, layers: next, groups: prune(get().groups, next), activeId: act, selectedIds: act ? [act] : [], editingMask: false, docRev: get().docRev + 1 })
    get().commit('Delete layer')
  },

  duplicateLayer: (id) => {
    const l = get().layers.find(x => x.id === id); if (!l) return
    // A copy is its own layer: not linked to the original, and not fed from a master format.
    const copy = { ...l, id: uid(), name: copyName(l.name, get().layers.map(x => x.name)), linkId: null, srcId: null, effects: freshFx(l.effects, new Map()), x: l.x + (l.type === 'adjustment' ? 0 : 16), y: l.y + (l.type === 'adjustment' ? 0 : 16), rev: nextRev() } as Layer
    set({ activeId: id })
    get().addLayer(copy, 'Duplicate layer')
  },

  moveLayer: (id, toIndex, toFrame) => {
    const layers = [...get().layers]
    const from = layers.findIndex(l => l.id === id); if (from < 0) return
    const [l] = layers.splice(from, 1)
    const at = Math.max(0, Math.min(layers.length, toIndex))
    const below = layers[at - 1], above = layers[at]
    // Dropped inside a group (both neighbours in it): join the innermost group they share, so no group is
    // split. At the edge of its own group it stays in it. Anywhere else it leaves its group.
    const groups = get().groups
    const cb = below ? groupChain(below.groupId, groups) : [], ca = above ? groupChain(above.groupId, groups) : []
    const shared = cb.find(g => ca.includes(g)) ?? null
    const own = l.groupId ?? null
    const ownEdge = !!own && (cb.includes(own) || ca.includes(own)) && (!shared || groupChain(own, groups).includes(shared))
    const groupId = ownEdge ? own : shared
    let moved = { ...l, groupId, rev: nextRev() } as Layer
    const doc = get().doc
    if (toFrame && doc?.frames?.length && toFrame !== l.frameId) {
      const src = doc.frames.find(f => f.id === l.frameId), dst = doc.frames.find(f => f.id === toFrame)
      if (dst) {
        moved = { ...moved, frameId: dst.id } as Layer
        if (src && l.type !== 'adjustment') moved = { ...moved, x: l.x + dst.x - src.x, y: l.y + dst.y - src.y } as Layer
        if (moved.clipId) moved = { ...moved, clipId: null } as Layer
      }
    }
    layers.splice(at, 0, moved)
    // Anything above the moved layer may now sit over different pixels.
    set({ layers: layers.map(x => ({ ...x, rev: nextRev() } as Layer)), groups: prune(get().groups, layers), docRev: get().docRev + 1 })
    get().commit('Reorder layers')
  },

  moveLayers: (ids, toIndex, toFrame) => {
    const all = get().layers
    const moving = all.filter(l => ids.includes(l.id))
    if (moving.length <= 1) { if (moving[0]) get().moveLayer(moving[0].id, toIndex, toFrame); return }
    const target = all[toIndex]; if (!target || ids.includes(target.id)) return
    const rest = all.filter(l => !ids.includes(l.id))
    const ti = rest.indexOf(target)
    // Dragged up from below the target they land above it, dragged down from above they land below it.
    const at = all.indexOf(moving[0]) < toIndex ? ti + 1 : ti
    const below = rest[at - 1], above = rest[at]
    const groups = get().groups
    const cb = below ? groupChain(below.groupId, groups) : [], ca = above ? groupChain(above.groupId, groups) : []
    const shared = cb.find(g => ca.includes(g)) ?? null
    const own = moving.every(l => l.groupId === moving[0].groupId) ? moving[0].groupId ?? null : null
    const ownEdge = !!own && (cb.includes(own) || ca.includes(own)) && (!shared || groupChain(own, groups).includes(shared))
    const groupId = ownEdge ? own : shared
    const doc = get().doc
    const dst = toFrame && doc?.frames?.length ? doc.frames.find(f => f.id === toFrame) : null
    const block = moving.map(l => {
      let m = { ...l, groupId } as Layer
      if (dst && l.frameId !== dst.id) {
        const src = doc!.frames!.find(f => f.id === l.frameId)
        m = { ...m, frameId: dst.id, clipId: null } as Layer
        if (src && l.type !== 'adjustment') m = { ...m, x: l.x + dst.x - src.x, y: l.y + dst.y - src.y } as Layer
      }
      return m
    })
    const next = releaseOrphans([...rest.slice(0, at), ...block, ...rest.slice(at)])
    set({ layers: next.map(x => ({ ...x, rev: nextRev() } as Layer)), groups: prune(groups, next), docRev: get().docRev + 1 })
    get().commit('Reorder layers')
  },

  moveToGroup: (ids, gid) => {
    const { layers, groups } = get()
    const moving = layers.filter(l => ids.includes(l.id) && !l.locked)
    if (!moving.length) return
    const rest = layers.filter(l => !moving.includes(l))
    let into: string | null, at: number
    if (gid) {
      const members = rest.filter(l => inGroup(l, gid, groups))
      if (!members.length) return
      into = gid; at = rest.indexOf(members[members.length - 1]) + 1
    } else {
      // Out of the innermost group they are in, to just above it.
      const inner = moving[0].groupId; if (!inner) return
      const members = rest.filter(l => inGroup(l, inner, groups))
      into = groups.find(g => g.id === inner)?.parentId ?? null
      at = members.length ? rest.indexOf(members[members.length - 1]) + 1 : rest.length
    }
    const frame = gid ? rest.find(l => inGroup(l, gid, groups))?.frameId : undefined
    const ids2 = new Set(moving.map(l => l.id))
    const frames = get().doc?.frames ?? []
    const block = moving.map(l => {
      let m = { ...l, groupId: into, ...(l.clipId && !ids2.has(l.clipId) ? { clipId: null } : {}) } as Layer
      // Into a group on another board: the layer goes to that board, at the same place on it.
      if (frame !== undefined && frame !== l.frameId) {
        const src = frames.find(f => f.id === l.frameId), dst = frames.find(f => f.id === frame)
        m = { ...m, frameId: frame } as Layer
        if (src && dst && l.type !== 'adjustment') m = { ...m, x: l.x + dst.x - src.x, y: l.y + dst.y - src.y } as Layer
      }
      return m
    })
    const next = releaseOrphans([...rest.slice(0, at), ...block, ...rest.slice(at)])
    set({ layers: next.map(x => ({ ...x, rev: nextRev() } as Layer)), groups: prune(groups, next), docRev: get().docRev + 1 })
    get().commit(gid ? 'Move into group' : 'Move out of group')
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
    const lower = layers[i - 1], upper = layers[i]
    if (lower.type === 'adjustment') { get().notify('Merge down needs a picture, text or shape layer below. The layer below is a filter.'); return }
    if (lower.locked || upper.locked) { get().notify('One of these layers is locked. Unlock it to merge.'); return }
    const c = makeCanvas(doc.width, doc.height)
    // Render both at full opacity inside the lower layer's board, then keep the lower layer's place, board and opacity.
    // fullRes: filters are baked at document size, as a 1x export would draw them, not from the 1200 px preview.
    renderDoc(c, doc, [lower, upper].map(l => ({ ...l, visible: true } as Layer)), { transparent: true, noCache: true, fullRes: true })
    const merged: RasterLayer = { ...base(lower.name), type: 'raster', canvas: c, visible: lower.visible, groupId: lower.groupId ?? null, frameId: lower.frameId ?? null, clipId: lower.clipId ?? null, role: lower.role, linkId: lower.linkId ?? null }
    const next = [...layers]
    next.splice(i - 1, 2, merged)
    // Anything clipped to either layer is now clipped to the merged one, so nothing is left clipped to a layer that is gone.
    const fixed = next.map(l => (l.clipId === lower.id || l.clipId === upper.id) && l.id !== merged.id ? ({ ...l, clipId: merged.id, rev: nextRev() } as Layer) : l)
    set({ layers: fixed, groups: prune(get().groups, fixed), activeId: merged.id, selectedIds: [merged.id], editingMask: false, docRev: get().docRev + 1 })
    get().commit('Merge down')
  },

  rasterize: (id) => {
    const { layers, doc } = get(); if (!doc) return null
    const l = layers.find(x => x.id === id)
    if (!l || l.type === 'adjustment') return null
    if(l.locked || l.lockPixels){get().notify('Unlock this layer before rasterizing it.');return null}
    if (l.type === 'raster') {
      const baked = { ...rasterizeToDoc(l, doc), smart: undefined, liquify: undefined, maskLinked:true, maskMatrix:undefined }
      get().updateLayer(id, baked)
      return get().layers.find(x => x.id === id) as RasterLayer
    }
    const c = makeCanvas(doc.width, doc.height)
    // The mask and vector mask are baked into the pixels; layer styles and fill opacity stay live on the new layer.
    renderDoc(c, doc, [{ ...l, opacity: 1, blend: 'source-over', visible: true, styles: null, fillOpacity: 1, clipId: null } as Layer], { transparent: true, noCache: true, frameRects: [] })
    // Pixels replace the text or shape; everything else about the layer (board, group, clip, link, role, locks, label, name) stays.
    const r: RasterLayer = {
      ...base(l.name), id: l.id, type: 'raster', canvas: c, opacity: l.opacity, blend: l.blend, visible: l.visible, locked: l.locked,
      groupId: l.groupId ?? null, frameId: l.frameId ?? null, clipId: l.clipId ?? null, linkId: l.linkId ?? null, role: l.role ?? null, label: l.label ?? null,
      lockAlpha: l.lockAlpha, lockPixels: l.lockPixels, lockPosition: l.lockPosition, styles: l.styles ?? null, fillOpacity: l.fillOpacity, brandLogoId: l.brandLogoId ?? null, rev: nextRev(),
    }
    set({ layers: layers.map(x => (x.id === id ? r : x)), docRev: get().docRev + 1 })
    return r
  },

  /** The layer brushes should paint on. Bakes transforms, and creates a layer if there is nothing to paint on. */
  ensurePaintable: () => {
    const s = get(); if (!s.doc) return null
    let l = s.active()
    if (l && (l.locked || l.lockPixels)) { get().notify('This layer is locked. Unlock it to paint.'); return null }
    // Mask editing must keep editable type, shapes and their transforms intact.
    if (l && s.editingMask && l.mask) {
      if (!l.maskEnabled) { get().notify('This mask is disabled. Enable it before painting.'); return null }
      return l
    }
    if (l && l.type === 'adjustment') {
      if (!l.mask) get().updateLayer(l.id, { mask: fullMaskSized(s.doc.width, s.doc.height), maskAt: null } as Partial<Layer>)
      set({ editingMask: true })
      return get().active() as AdjustmentLayer
    }
    if (!l || l.type !== 'raster') { get().addBlank(); l = get().active() }
    if (!l || l.type !== 'raster') return null
    if (l.locked || l.lockPixels) { get().notify('This layer is locked. Unlock it to paint.'); return null }
    if(l.liquify){get().notify('Rasterize this liquified layer explicitly before painting, or paint on a new layer.');return null}
    if (l.smart) { get().notify('Edit this smart object’s contents or explicitly rasterize it before painting.'); return null }
    const aligned = l.x === 0 && l.y === 0 && l.scaleX === 1 && l.scaleY === 1 && l.rotation === 0 && l.canvas.width === s.doc.width && l.canvas.height === s.doc.height
    if (!aligned) return get().rasterize(l.id)
    return l
  },

  flip: (id, axis) => {
    const l = get().layers.find(x => x.id === id)
    if (!l || l.type === 'adjustment') return
    if (l.locked || l.lockPixels) { get().notify('This layer is locked. Unlock it to flip it.'); return }
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
    if (l.locked || l.lockPixels) { get().notify('This layer is locked. Unlock it to add a mask.'); return }
    const { w, h } = layerSize(l, doc)
    let mask: HTMLCanvasElement
    if (fromSelection && selection) {
      mask = makeCanvas(w, h)
      const x = ctx2d(mask)
      if (l.type !== 'adjustment') x.setTransform(layerMatrix(l, doc).inverse())
      x.drawImage(selection, 0, 0)
    } else mask = fullMaskSized(w, h)
    get().updateLayer(id, { mask, maskEnabled: true, ...(l.type === 'adjustment' ? { maskAt: null } : {}) } as Partial<Layer>)
    set({ editingMask: true, activeId: id, ...(fromSelection ? { selection: null, selRev: get().selRev + 1 } : {}) })
    get().commit('Add mask')
  },

  removeMask: (id) => { get().updateLayer(id, { mask: null, maskAt: null } as Partial<Layer>, 'Remove mask'); set({ editingMask: false }) },

  // A layer can be clipped if there is a non-adjustment layer directly below it in the same frame/group.
  canClip: (id) => {
    const st = get(); const lid = id ?? st.activeId; if (!lid) return false
    const idx = st.layers.findIndex(l => l.id === lid); if (idx <= 0) return false
    const l = st.layers[idx], below = st.layers[idx - 1]
    if (l.clipId) return false
    // An adjustment can clip to the layer below it (it then changes only that layer); nothing clips to an adjustment.
    if (below.type === 'adjustment' && !below.clipId) return false
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
    set({ layers: st.layers.map(l => l.id === lid ? ({ ...l, clipId: baseId, ...(l.type === 'adjustment' ? { reach: 'clip' } : {}), rev: nextRev() } as Layer) : l), docRev: st.docRev + 1 })
    get().commit('Create clipping mask')
  },

  releaseClippingMask: (id) => {
    const st = get(); const lid = id ?? st.activeId; if (!lid) return
    const l = st.layers.find(x => x.id === lid); if (!l?.clipId) return
    set({ layers: st.layers.map(x => x.id === lid ? ({ ...x, clipId: null, ...(x.type === 'adjustment' ? { reach: 'below' } : {}), rev: nextRev() } as Layer) : x), docRev: st.docRev + 1 })
    get().commit('Release clipping mask')
  },

  invertMask: (id) => {
    const st = get(); const l = st.layers.find(x => x.id === id); if (!l?.mask || !st.doc) return
    // An adjustment's mask is inverted over the whole page, wherever it sits.
    const src = l.type === 'adjustment' ? maskOnPage(st.doc.width, st.doc.height)(l.mask, l.maskAt).mask : l.mask
    const c = fullMaskSized(src.width, src.height)
    const x = ctx2d(c); x.globalCompositeOperation = 'destination-out'; x.drawImage(src, 0, 0)
    get().updateLayer(id, { mask: c, ...(l.type === 'adjustment' ? { maskAt: null } : {}) } as Partial<Layer>, 'Invert mask')
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
    // A cut-out must own only the visible pixels, not an invisible full-page canvas.
    // Cropping the backing pixels and offsetting the new layer preserves their exact
    // position while giving Move/Transform an accurate, usable bounding box.
    const b = maskBounds(c)
    if (!b) { s.notify('No visible pixels inside this selection.'); return }
    const trimmed = makeCanvas(b.w, b.h)
    ctx2d(trimmed).drawImage(c, -b.x, -b.y)
    if (cut) get().clearSelectionPixels()
    set({ activeId: l.id })
    get().addLayer({ ...base(l.name + (cut ? ' cut' : ' copy')), type: 'raster', canvas: trimmed, x: b.x, y: b.y }, cut ? 'Cut to new layer' : 'Copy to new layer')
    set({ selection: null, selRev: get().selRev + 1 })
  },

  clearSelectionPixels: () => {
    const s = get(); if (!s.selection) return
    const a = s.active(); if (a?.lockAlpha) { s.notify('Transparent pixels are locked. Unlock them to clear pixels.'); return }
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
    const c = cloneCanvas(l.canvas), cx = ctx2d(c); if (l.lockAlpha) cx.globalCompositeOperation = 'source-atop'; cx.drawImage(fill, 0, 0)
    get().updateLayer(l.id, { canvas: c }, 'Fill')
  },

  setTool: (t) => set({ tool: t, crop: null }),
  setOption: (k, v) => set({ options: { ...get().options, [k]: v } }),
  setFg: (c) => set({ fg: c }),
  setBg: (c) => set({ bg: c }),
  swapColors: () => set({ fg: get().bg, bg: get().fg }),
  addSwatch: (c) => { const s = get().swatches; if (!s.includes(c)) set({ swatches: [c, ...s].slice(0, 21) }) },
  setView: (v) => set({ view: { ...get().view, ...v } }),

  commit: (label, opts) => {
    const { doc, layers, activeId, selection, history, historyIndex, selectedIds, activeFrameId } = get(); if (!doc) return
    const snap: Snapshot = { doc: { ...doc }, layers: [...layers], groups: get().groups.map(g => ({ ...g })), activeId, selection, label, at: Date.now(), selectedIds: [...selectedIds], activeFrameId }
    const ui = useUi.getState()
    const last = history[historyIndex]
    if (opts?.ifChanged && last && sameAsStep(last, doc, layers, get().groups, selection)) return
    // A run of the same small step (arrow-key nudges) becomes one undo step.
    const merge = !!opts?.merge && historyIndex === history.length - 1 && historyIndex > 0 && last?.label === label && Date.now() - (last.at ?? 0) < opts.merge
    let next = (merge ? [...history.slice(0, historyIndex), snap] : [...history.slice(0, historyIndex + 1), snap]).slice(-Math.max(5, ui.historyLimit))
    // Keep history inside its memory budget: drop the oldest steps first, always keeping the last five.
    // Phones keep a smaller history so the browser does not close the tab for using too much memory.
    const budget = (touchCanvas.phone ? Math.min(ui.historyMemoryMB, 300) : ui.historyMemoryMB) * 1048576
    if (next.length > 5 && historyBytes(next) > budget) {
      while (next.length > 5 && historyBytes(next) > budget) next = next.slice(Math.max(1, Math.floor(next.length / 10)))
    }
    set({ history: next, historyIndex: next.length - 1, dirty: true })
    if (!merge) noteStep(label)
  },

  undo: () => {
    const { history, historyIndex } = get(); if (historyIndex <= 0) return
    const step = history[historyIndex]
    noteUndo(step?.label, step?.at ? Date.now() - step.at : -1)
    get().jumpTo(historyIndex - 1)
  },

  redo: () => {
    const { history, historyIndex } = get(); if (historyIndex >= history.length - 1) return
    get().jumpTo(historyIndex + 1)
  },

  jumpTo: (index) => {
    const { history } = get(); const s = history[index]; if (!s) return
    // What is selected, and the board being worked on, stay as they are when they still exist after the
    // step; otherwise they come back as they were at that step. Nothing ever points at something gone.
    const ids = new Set(s.layers.map(l => l.id))
    const now = get()
    const kept = now.selectedIds.filter(x => ids.has(x))
    const sel = kept.length ? kept : (s.selectedIds ?? (s.activeId ? [s.activeId] : [])).filter(x => ids.has(x))
    const frames = s.doc.frames ?? []
    const frame = frames.length ? (frames.some(f => f.id === now.activeFrameId) ? now.activeFrameId! : frames.some(f => f.id === s.activeFrameId) ? s.activeFrameId! : frames[0].id) : null
    const act = now.activeId && sel.includes(now.activeId) ? now.activeId : (sel[sel.length - 1] ?? null)
    // What was exported, and the export choices, are not part of the drawing: undo never takes them back.
    set({ doc: { ...s.doc, exports: now.doc?.exports ?? s.doc.exports, exportPrefs: now.doc?.exportPrefs ?? s.doc.exportPrefs }, layers: [...s.layers], groups: s.groups.map(g => ({ ...g })), selectedIds: sel.length ? sel : act ? [act] : [], editingTextId: null, activeId: act, activeFrameId: frame, selection: s.selection, historyIndex: index, editingMask: false, transform: null, docRev: get().docRev + 1, selRev: get().selRev + 1, dirty: true })
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
    const cur = get().doc
    set({ doc: { ...s.doc, exports: cur?.exports ?? s.doc.exports, exportPrefs: cur?.exportPrefs ?? s.doc.exportPrefs }, layers: [...s.layers], groups: s.groups.map(g => ({ ...g })), activeId: s.activeId, selectedIds: s.activeId ? [s.activeId] : [], selection: s.selection, editingMask: false, docRev: get().docRev + 1, selRev: get().selRev + 1 })
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

/** Run several edits as one undo step: the steps they made are folded into the last one. */
export function asOneStep(run: () => void, label?: string) {
  const s0 = useEditor.getState(), start = s0.history[s0.historyIndex]
  run()
  const st = useEditor.getState(), from = start ? st.history.indexOf(start) : -1
  if (from >= 0 && st.historyIndex > from + 1) {
    const last = st.history[st.historyIndex]
    useEditor.setState({ history: [...st.history.slice(0, from + 1), label ? { ...last, label } : last], historyIndex: from + 1 })
  }
}
