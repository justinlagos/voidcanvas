import type { Group, Layer } from './types'

/**
 * Linked board reconciliation. Never delete and recreate a designer's existing
 * variant objects: their ids, transforms, pixels, history references and local
 * artwork must survive a master refresh.
 *
 * The serialisable cascadeBase records scalar values inherited at creation.
 * A variant value different from its base is an override. Older .void files
 * without a base are handled conservatively: preserve rather than overwrite.
 */
export type LinkedLayer = Layer & { cascadeBase?: Record<string, unknown>; cascadeConflicts?: string[] }

const INHERITED = [
  'name', 'visible', 'opacity', 'blend', 'role',
  'text', 'fontFamily', 'fontWeight', 'italic', 'color', 'align',
  'lineHeight', 'letterSpacing', 'underline', 'strike', 'caps',
  'fill', 'stroke', 'strokeWidth',
] as const

const equal = (a: unknown, b: unknown) => Object.is(a, b)
const props = (l: Layer): Record<string, unknown> => {
  const src = l as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of INHERITED) if (Object.prototype.hasOwnProperty.call(src, key)) out[key] = src[key]
  return out
}

/** Stamp the initial inheritance baseline on freshly cascaded objects. */
export function stampCascadeBaseline(generated: Layer[], masters: Layer[]): Layer[] {
  const byId = new Map(masters.map(m => [m.id, m]))
  return generated.map(l => {
    const master = l.srcId && byId.get(l.srcId)
    return master ? { ...l, cascadeBase: props(master), cascadeConflicts: [] } as LinkedLayer : l
  })
}

export interface BoardReconciliation {
  layers: Layer[]
  groups: Group[]
  conflicts: string[]
  reused: number
  added: number
}

/**
 * A pure merge over one linked board. Fresh is relayout()+regroup() output;
 * previous is the actual user-edited linked board. The master snapshot is live.
 */
export function reconcileCascadeBoard(
  masters: Layer[],
  previous: Layer[],
  oldGroups: Group[],
  fresh: Layer[],
  freshGroups: Group[],
): BoardReconciliation {
  const masterById = new Map(masters.map(l => [l.id, l]))
  const oldBySource = new Map(previous.filter(l => l.srcId).map(l => [l.srcId!, l]))
  const oldGroupById = new Map(oldGroups.map(g => [g.id, g]))
  const freshGroupById = new Map(freshGroups.map(g => [g.id, g]))
  const groupMap = new Map<string, string>()
  const planned = new Map<string, Layer>()
  const conflicts: string[] = []
  let reused = 0

  // Match each freshly generated group with the prior group's identity,
  // including nested ancestors, using the source layer's stable master id.
  for (const f of fresh) {
    const old = f.srcId ? oldBySource.get(f.srcId) : undefined
    let from = f.groupId ?? null
    let to = old?.groupId ?? null
    const visited = new Set<string>()
    while (from && to && !visited.has(from)) {
      visited.add(from)
      if (!groupMap.has(from)) groupMap.set(from, to)
      from = freshGroupById.get(from)?.parentId ?? null
      to = oldGroupById.get(to)?.parentId ?? null
    }
  }

  for (const f of fresh) {
    const source = f.srcId ?? ''
    const master = masterById.get(source)
    const old = oldBySource.get(source) as LinkedLayer | undefined
    if (!master) { planned.set(source, f); continue }
    if (!old) {
      planned.set(source, { ...f, cascadeBase: props(master), cascadeConflicts: [] } as LinkedLayer)
      continue
    }
    reused++
    if (old.type !== f.type) {
      // A type change cannot be merged safely; retain the variant until user resolution.
      const reason = `Layer "${old.name}": master changed type`
      conflicts.push(reason)
      planned.set(source, { ...old, cascadeConflicts: [reason] } as LinkedLayer)
      continue
    }

    // Start from the old object so layout, crop, pixels, effects, masks, native
    // asset lineage, variant-only styles and untracked custom properties survive.
    const merged = { ...old, rev: f.rev, srcId: source, frameId: f.frameId } as LinkedLayer
    const oldBase = old.cascadeBase
    const now = props(master)
    const layerConflicts: string[] = []
    for (const key of INHERITED) {
      const nextValue = now[key]
      const oldValue = (old as unknown as Record<string, unknown>)[key]
      if (!oldBase || !Object.prototype.hasOwnProperty.call(oldBase, key)) continue
      const baseline = oldBase[key]
      const changedLocally = !equal(oldValue, baseline)
      const changedOnMaster = !equal(nextValue, baseline)
      if (!changedLocally) (merged as unknown as Record<string, unknown>)[key] = nextValue
      else if (changedOnMaster && !equal(oldValue, nextValue)) layerConflicts.push(key)
    }
    merged.cascadeBase = now
    merged.cascadeConflicts = layerConflicts
    if (layerConflicts.length) conflicts.push(`Layer "${old.name}": both master and variant changed ${layerConflicts.join(', ')}`)
    planned.set(source, merged)
  }

  // Preserve the designer's local layer order, deleted-master descendants,
  // and entirely variant-local objects. Master additions are appended.
  const used = new Set<string>()
  const layers: Layer[] = []
  for (const l of previous) {
    const newer = l.srcId ? planned.get(l.srcId) : undefined
    if (newer) { layers.push(newer); used.add(l.srcId!) }
    else {
      layers.push(l)
      if (l.srcId && !masterById.has(l.srcId))
        conflicts.push(`Layer "${l.name}": source deleted; variant preserved`)
    }
  }
  let added = 0
  for (const f of fresh) {
    if (f.srcId && used.has(f.srcId)) continue
    const newer = f.srcId ? planned.get(f.srcId) ?? f : f
    layers.push(newer)
    if (f.srcId) used.add(f.srcId)
    added++
  }

  // Remap new groups onto old stable ids, but never move existing user-owned
  // members into a regenerated group. New members join their existing group.
  const groups = freshGroups.map(g => {
    const oldId = groupMap.get(g.id)
    const parentId = g.parentId ? (groupMap.get(g.parentId) ?? g.parentId) : null
    const old = oldId && oldGroupById.get(oldId)
    return old ? { ...old } : { ...g, parentId }
  })
  for (const l of layers) {
    const source = l.srcId ?? ''
    if (!source || oldBySource.has(source)) continue
    if (l.groupId && groupMap.has(l.groupId))
      l.groupId = groupMap.get(l.groupId)!
  }

  // Clipping links on freshly created layers must reference their sibling
  // instance ids, never a master-board object id.
  const instanceBySource = new Map(layers.filter(l => l.srcId).map(l => [l.srcId!, l.id]))
  const oldIds = new Set(previous.map(l => l.id))
  const corrected = layers.map(l => {
    if (!l.clipId || oldIds.has(l.id)) return l
    const inst = instanceBySource.get(l.clipId)
    return inst ? { ...l, clipId: inst } as Layer : l
  })
  return { layers: corrected, groups, conflicts, reused, added }
}
