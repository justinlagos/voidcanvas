// Rules the open design must always keep, whatever the designer did. Checked after every step of the
// e2e random walk (e2e/trust.mjs) and in unit tests. Plain data checks: no canvases, no DOM.

import type { Doc, Group, Layer } from './types'

export interface CheckedState {
  doc: Doc | null
  layers: Layer[]
  groups: Group[]
  activeId: string | null
  selectedIds: string[]
  activeFrameId: string | null
  history: unknown[]
  historyIndex: number
}

/** Every broken rule, in words. An empty list means the state is sound. */
export function checkInvariants(s: CheckedState): string[] {
  const out: string[] = []
  if (!s.doc) return s.layers.length ? ['layers without a design'] : []
  const ids = new Set<string>()
  for (const l of s.layers) { if (ids.has(l.id)) out.push(`two layers share the id ${l.id}`); ids.add(l.id) }
  const groups = new Map(s.groups.map(g => [g.id, g]))
  const frames = new Set((s.doc.frames ?? []).map(f => f.id))

  for (const l of s.layers) {
    if (l.frameId && !frames.has(l.frameId)) out.push(`“${l.name}” is on a board that does not exist`)
    if (l.groupId && !groups.has(l.groupId)) out.push(`“${l.name}” is in a group that does not exist`)
    if (l.clipId && !ids.has(l.clipId)) out.push(`“${l.name}” is clipped to a layer that does not exist`)
    if (l.clipId === l.id) out.push(`“${l.name}” is clipped to itself`)
  }
  for (const g of s.groups) {
    if (g.parentId && !groups.has(g.parentId)) out.push(`group “${g.name}” sits in a group that does not exist`)
    let p = g.parentId ?? null, n = 0
    while (p && n++ < 70) p = groups.get(p)?.parentId ?? null
    if (n >= 70) out.push(`group “${g.name}” is inside itself`)
  }
  // Members of a group are always next to each other in the stack.
  const chainOf = (l: Layer) => { const c: string[] = []; let gid = l.groupId ?? null, n = 0; while (gid && n++ < 64) { c.push(gid); gid = groups.get(gid)?.parentId ?? null } return c }
  const spans = new Map<string, number[]>()
  s.layers.forEach((l, i) => { for (const gid of chainOf(l)) { const a = spans.get(gid) ?? []; a.push(i); spans.set(gid, a) } })
  spans.forEach((idx, gid) => { if (idx[idx.length - 1] - idx[0] + 1 !== idx.length) out.push(`group “${groups.get(gid)?.name ?? gid}” is split in the layer stack`) })

  if (s.activeId && !ids.has(s.activeId)) out.push('the active layer does not exist')
  for (const id of s.selectedIds) if (!ids.has(id)) { out.push('a selected layer does not exist'); break }
  if (s.activeId && s.selectedIds.length && !s.selectedIds.includes(s.activeId)) out.push('the active layer is not selected')
  if (frames.size && s.activeFrameId && !frames.has(s.activeFrameId)) out.push('the active board does not exist')
  if (s.historyIndex < -1 || s.historyIndex >= Math.max(1, s.history.length)) out.push('the undo position is outside the history')
  return out
}
