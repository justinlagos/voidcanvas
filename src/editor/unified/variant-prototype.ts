// B06 (isolated) + 02 contracts: VariantGraph prototype. Pure, no store access.
// Production `resyncVariants` still owns live boards until Stage 5; this module
// proves the merge semantics and hosts the override-loss regression fixtures.
export interface VariantRecord {
  instanceId: string
  masterNodeId: string
  boardId: string
  basedOnRev: number
  masterRev: number
  inherited: Record<string, unknown>
  overrides: Record<string, unknown>
}

export interface MergeResult {
  merged: Record<string, unknown>
  conflicts: { prop: string; masterValue: unknown; variantValue: unknown }[]
  dropped: { nodeId: string; reason: string }[]
}

// Simulates current production behaviour: delete/recreate drops identity + overrides.
export function legacyResyncLosesOverrides(overrides: Record<string, unknown>): { preserved: number; lost: string[] } {
  void overrides
  return { preserved: 0, lost: Object.keys(overrides) }
}

export function buildVariant(masterNodeId: string, boardId: string, masterRev: number, inherited: Record<string, unknown>): VariantRecord {
  return { instanceId: masterNodeId + '@' + boardId, masterNodeId, boardId, basedOnRev: masterRev, masterRev, inherited: { ...inherited }, overrides: {} }
}

export function applyLocalEdit(v: VariantRecord, prop: string, value: unknown): VariantRecord {
  return { ...v, overrides: { ...v.overrides, [prop]: value } }
}

export function threeWayMerge(base: Record<string, unknown>, masterNow: Record<string, unknown>, variant: VariantRecord): MergeResult {
  const merged: Record<string, unknown> = {}
  const conflicts: MergeResult['conflicts'] = []
  const keys = new Set([...Object.keys(base), ...Object.keys(masterNow), ...Object.keys(variant.overrides), ...Object.keys(variant.inherited)])
  for (const k of Array.from(keys)) {
    const b = base[k]
    const m = masterNow[k]
    const overridden = k in variant.overrides
    const masterChanged = JSON.stringify(b) !== JSON.stringify(m)
    if (overridden) {
      if (masterChanged && JSON.stringify(variant.overrides[k]) !== JSON.stringify(m)) {
        conflicts.push({ prop: k, masterValue: m, variantValue: variant.overrides[k] })
      }
      merged[k] = variant.overrides[k]
    } else {
      merged[k] = m
    }
  }
  return { merged, conflicts, dropped: [] }
}

// Required content (logo/headline/cta/pinned) is never silently dropped.
export function requiredDropCheck(role: string | null, readable: boolean): { leftOut: boolean; reason: string | null } {
  const required = role === 'logo' || role === 'headline' || role === 'cta'
  if (required && !readable) return { leftOut: true, reason: 'required content kept with warning: too small to read at this size' }
  if (!readable) return { leftOut: true, reason: 'omitted: below minimum readable size' }
  return { leftOut: false, reason: null }
}

// ─── Structural operations (B.1 extension) ───────────────────────────
// Property merge is not enough: master edits can add/delete/reorder/rename
// layers and groups. Structural replay keys everything by masterNodeId so
// variant-local layout and overrides survive.

export interface StructuralItem { masterNodeId: string; instanceId: string; name: string; order: number; deleted?: boolean }

export function replayStructure(base: StructuralItem[], masterNow: StructuralItem[], variant: StructuralItem[]): {
  items: StructuralItem[]; conflicts: { masterNodeId: string; kind: 'deleted-edited' | 'renamed-both' | 'reordered-moved' }[]
} {
  const baseById = new Map(base.map(i => [i.masterNodeId, i]))
  const masterById = new Map(masterNow.map(i => [i.masterNodeId, i]))
  const variantById = new Map(variant.map(i => [i.masterNodeId, i]))
  const conflicts: { masterNodeId: string; kind: 'deleted-edited' | 'renamed-both' | 'reordered-moved' }[] = []
  const items: StructuralItem[] = []
  const ids = new Set([...Array.from(baseById.keys()), ...Array.from(masterById.keys()), ...Array.from(variantById.keys())])
  for (const id of Array.from(ids)) {
    const b = baseById.get(id)
    const m = masterById.get(id)
    const v = variantById.get(id)
    if (!b && m && !v) { items.push({ ...m }); continue } // master-added: adopt
    if (b && !m && v && !v.deleted) { conflicts.push({ masterNodeId: id, kind: 'deleted-edited' }); items.push({ ...v }); continue } // master-deleted, variant kept: keep + flag
    if (b && !m && v?.deleted) continue // both deleted
    if (!b && !m && v) { items.push({ ...v }); continue } // variant-only: keep
    if (m && v && !v.deleted) {
      const masterRenamed = b && b.name !== m.name
      const variantRenamed = b && b.name !== v.name && v.name !== m.name
      if (masterRenamed && variantRenamed) conflicts.push({ masterNodeId: id, kind: 'renamed-both' })
      const order: number = v.order !== b?.order ? v.order : m.order // variant-local order wins
      if (v.order !== b?.order && m.order !== b?.order && v.order !== m.order) conflicts.push({ masterNodeId: id, kind: 'reordered-moved' })
      items.push({ ...v, name: variantRenamed ? v.name : m.name, order })
      continue
    }
    if (m && !v) { items.push({ ...m }); continue }
  }
  items.sort((a, b) => a.order - b.order)
  return { items, conflicts }
}
