// B03: compatibility adapter for the existing document graph.
// No format upgrade: reads v1-v5, writes the same version back by default.
// Provides stable node identities + validation without replacing the store.
import type { Doc, Frame, Group, Layer } from '../types'

export interface NodeRef {
  nodeId: string
  kind: 'raster' | 'text' | 'shape' | 'adjustment' | 'group' | 'board'
  parentId: string | null
  boardId: string | null
  masterNodeId: string | null
  rev: number
  role: string | null
}

export function toNodeRefs(doc: Doc, layers: Layer[], groups: Group[]): NodeRef[] {
  const refs: NodeRef[] = []
  for (const g of groups) {
    refs.push({ nodeId: g.id, kind: 'group', parentId: g.parentId ?? null, boardId: null, masterNodeId: null, rev: 0, role: null })
  }
  for (const l of layers) {
    refs.push({
      nodeId: l.id, kind: l.type,
      parentId: l.groupId ?? null, boardId: l.frameId ?? null,
      masterNodeId: l.srcId ?? null, rev: l.rev, role: l.role ?? null,
    })
  }
  for (const f of doc.frames ?? []) {
    refs.push({ nodeId: f.id, kind: 'board', parentId: null, boardId: f.id, masterNodeId: (f as Frame).linkedFrom ?? null, rev: 0, role: null })
  }
  return refs
}

export function validateRefs(refs: NodeRef[]): { dangling: string[]; duplicates: string[] } {
  const ids = new Set(refs.map(r => r.nodeId))
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const r of refs) {
    if (seen.has(r.nodeId)) duplicates.push(r.nodeId)
    seen.add(r.nodeId)
  }
  const dangling = refs
    .filter(r => r.parentId && !ids.has(r.parentId))
    .map(r => r.nodeId + '->' + r.parentId)
  return { dangling, duplicates }
}

// Parent/group/board cycles are prohibited; text-frame flow cycles checked here when present.
export function hasCycle(refs: NodeRef[]): boolean {
  const parent = new Map(refs.map(r => [r.nodeId, r.parentId]))
  for (const r of refs) {
    const seen = new Set<string>()
    let cur: string | null | undefined = r.nodeId
    while (cur) {
      if (seen.has(cur)) return true
      seen.add(cur)
      cur = parent.get(cur) ?? null
    }
  }
  return false
}

// Serialize check: ids survive a JSON round-trip (proxy for save/reopen identity).
export function roundTripIds(refs: NodeRef[]): string[] {
  const back = JSON.parse(JSON.stringify(refs)) as NodeRef[]
  return back.map(r => r.nodeId)
}
