// B02: shared selection + transformation bridge. Read-only selectors plus
// patches applied through the ONE authoritative store (useEditor). This module
// owns no selection state and creates no parallel undo stack.
import type { Group, Layer } from '../types'
import { inGroup } from '../store'

export interface StableSelection {
  ids: string[]
  activeId: string | null
  keyObjectId: string | null
  frameId: string | null
}

// Identity is stable: same ids in same order, derived from the single store.
export function stableSelection(selectedIds: string[], activeId: string | null, keyObjectId: string | null, frameId: string | null): StableSelection {
  return { ids: [...selectedIds], activeId, keyObjectId, frameId }
}

export function selectionKey(sel: StableSelection): string {
  return [...sel.ids].sort().join('|') + '#' + (sel.activeId ?? '') + '@' + (sel.frameId ?? '')
}

// Drops ids whose layers no longer exist (deleted, merged, or from another document) so a stale
// selection can never point at nothing. Order of the surviving ids is kept. Active, key and frame
// ids are cleared when their target is gone. Returns the same object when nothing changed.
export function reconcileSelection(sel: StableSelection, layers: Layer[], frameIds: string[] = []): StableSelection {
  const live = new Set(layers.map(l => l.id))
  const ids = sel.ids.filter(id => live.has(id))
  const frames = new Set(frameIds)
  const activeId = sel.activeId && live.has(sel.activeId) ? sel.activeId : null
  const keyObjectId = sel.keyObjectId && live.has(sel.keyObjectId) ? sel.keyObjectId : null
  const frameId = sel.frameId && frames.has(sel.frameId) ? sel.frameId : null
  const unchanged = ids.length === sel.ids.length && activeId === sel.activeId && keyObjectId === sel.keyObjectId && frameId === sel.frameId
  return unchanged ? sel : { ids, activeId, keyObjectId, frameId }
}

export function layersForSelection(layers: Layer[], sel: StableSelection): Layer[] {
  const set = new Set(sel.ids)
  return layers.filter(l => set.has(l.id))
}

export function movePatch(layer: Layer, dx: number, dy: number): Partial<Layer> {
  return { x: layer.x + dx, y: layer.y + dy }
}

export function isInGroup(layer: Layer, gid: string, groups: Group[]): boolean {
  return inGroup(layer, gid, groups)
}

// Transform applies via caller-owned commit (one undo step). Helper only builds patches.
export function transformPatches(targets: Layer[], dx: number, dy: number): { id: string; patch: Partial<Layer> }[] {
  return targets.filter(t => !t.locked).map(t => ({ id: t.id, patch: movePatch(t, dx, dy) }))
}
