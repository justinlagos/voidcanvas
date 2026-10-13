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
