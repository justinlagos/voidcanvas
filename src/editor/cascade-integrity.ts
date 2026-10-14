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
export type LinkedLayer = Layer & {
  cascadeBase?: Record<string, unknown>
  cascadeVariantBase?: Record<string, unknown>
  cascadeConflicts?: string[]
}

const INHERITED = [
  'name', 'visible', 'opacity', 'blend', 'role',
  'text', 'fontFamily', 'fontWeight', 'italic', 'color', 'align',
  'lineHeight', 'letterSpacing', 'underline', 'strike', 'caps',
  'fill', 'stroke', 'strokeWidth',
] as const

const equal = (a: unknown, b: unknown) => Object.is(a, b)
const jsonCopy = (value: unknown): unknown => value === undefined ? null : JSON.parse(JSON.stringify(value))
const sameStructure = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Only registry-backed replacements have a durable source identity. Painted pixels without
 *  an updated asset record cannot safely be inferred as a source replacement. */
const assetSignature = (l: Layer): string | null =>
  l.type === 'raster' && l.asset?.id ? `${l.asset.id}@${l.asset.sha256}` : null

function sourceBaseline(l: Layer): Record<string, unknown> {
  const result = props(l)
  if (l.type === 'raster') result.__assetSignature = assetSignature(l)
  if (l.type === 'shape') result.__vectorPath = jsonCopy(l.subpaths)
  return result
}

/** Fresh vector geometry is *target-board local*, while the master path is in
 *  master coordinates. Both snapshots are needed for a valid three-way merge. */
function targetBaseline(l: Layer): Record<string, unknown> | undefined {
  return l.type === 'shape' ? { subpaths: jsonCopy(l.subpaths), w: l.w, h: l.h } : undefined
}

/** Detach inherited pixels. cloneNode() alone does NOT copy canvas pixels. */
function detachedPixels(source: HTMLCanvasElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return source // pure unit tests without a DOM
  const copy = document.createElement('canvas')
  copy.width = source.width
  copy.height = source.height
  const context = copy.getContext('2d')
  if (!context) return null
  context.drawImage(source, 0, 0)
  return copy
}
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
    return master ? { ...l, cascadeBase: sourceBaseline(master),
      cascadeVariantBase: targetBaseline(l), cascadeConflicts: [] } as LinkedLayer : l
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
      planned.set(source, { ...f, cascadeBase: sourceBaseline(master),
        cascadeVariantBase: targetBaseline(f), cascadeConflicts: [] } as LinkedLayer)
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
    const now = sourceBaseline(master)
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
    // A native raster replacement is different from a brush stroke. When both
    // master and variant still refer to the previous registry asset, propagate
    // the new source pixels and metadata while keeping local transform/masks.
    if (old.type === 'raster' && master.type === 'raster' && f.type === 'raster' &&
        oldBase && Object.prototype.hasOwnProperty.call(oldBase, '__assetSignature')) {
      const sourceWas = oldBase.__assetSignature
      const sourceNow = assetSignature(master)
      const localNow = assetSignature(old)
      if (sourceWas !== sourceNow) {
        if (localNow === sourceWas && sourceNow) {
          const cloned = detachedPixels(master.canvas)
          if (cloned) {
            const image = merged as LinkedLayer & Extract<Layer, { type: 'raster' }>
            image.canvas = cloned
            image.asset = master.asset ? { ...master.asset } : null
            image.emptyFrame = master.emptyFrame ?? null
          } else {
            layerConflicts.push('asset: pixels could not be safely copied')
          }
        } else if (localNow !== sourceNow) {
          layerConflicts.push('asset')
        }
      }
    }

    // Paths are deeply nested. Compare the original MASTER geometry to the
    // current master, and the original GENERATED geometry to the variant.
    // Update untouched target-local vector paths using relayout's new path,
    // never copy master-space coordinates directly into a variant.
    if (old.type === 'shape' && master.type === 'shape' && f.type === 'shape' &&
        oldBase && Object.prototype.hasOwnProperty.call(oldBase, '__vectorPath')) {
      const previousTarget = old.cascadeVariantBase
      const sourceChanged = !sameStructure(oldBase.__vectorPath, jsonCopy(master.subpaths))
      if (sourceChanged && previousTarget && Object.prototype.hasOwnProperty.call(previousTarget, 'subpaths')) {
        if (sameStructure(jsonCopy(old.subpaths), previousTarget.subpaths)) {
          const vector = merged as LinkedLayer & Extract<Layer, { type: 'shape' }>
          vector.subpaths = f.subpaths ? jsonCopy(f.subpaths) as typeof f.subpaths : undefined
          // Shape dimensions only inherit if they were not locally resized.
          if (old.w === previousTarget.w) vector.w = f.w
          if (old.h === previousTarget.h) vector.h = f.h
        } else if (!sameStructure(jsonCopy(old.subpaths), jsonCopy(f.subpaths))) {
          layerConflicts.push('vector path')
        }
      } else if (sourceChanged) {
        layerConflicts.push('vector path: legacy variant has no target baseline')
      }
    }

    merged.cascadeBase = now
    merged.cascadeVariantBase = targetBaseline(f) ?? old.cascadeVariantBase
    // Keep unresolved three-way conflicts visible on repeated syncs until the
    // designer resolves them. Do not silently clear them on a second click.
    const prior = (old.cascadeConflicts ?? []).filter(k => {
      if (k === 'asset') return old.type === 'raster' && master.type === 'raster' &&
        assetSignature(old) !== assetSignature(master)
      if (k === 'vector path') return old.type === 'shape' && master.type === 'shape' &&
        !sameStructure(jsonCopy(old.subpaths), jsonCopy(f.subpaths))
      if (k.includes(':')) return true
      return (old as unknown as Record<string, unknown>)[k] !==
        (master as unknown as Record<string, unknown>)[k]
    })
    merged.cascadeConflicts = Array.from(new Set([...prior, ...layerConflicts]))
    if (merged.cascadeConflicts.length) conflicts.push(`Layer "${old.name}": review ${merged.cascadeConflicts.join(', ')}`)
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
  const mapped = layers.map(l => {
    const source = l.srcId ?? ''
    if (!source || oldBySource.has(source) || !l.groupId || !groupMap.has(l.groupId)) return l
    return { ...l, groupId: groupMap.get(l.groupId)! } as Layer
  })

  // Clipping links on freshly created layers must reference their sibling
  // instance ids, never a master-board object id.
  const instanceBySource = new Map(mapped.filter(l => l.srcId).map(l => [l.srcId!, l.id]))
  const oldIds = new Set(previous.map(l => l.id))
  const corrected = mapped.map(l => {
    if (!l.clipId || oldIds.has(l.id)) return l
    const inst = instanceBySource.get(l.clipId)
    return inst ? { ...l, clipId: inst } as Layer : l
  })
  return { layers: corrected, groups, conflicts, reused, added }
}
