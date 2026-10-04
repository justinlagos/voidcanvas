import type { Doc, Group, Layer } from './types'

export interface ProductionIssue { severity: 'error' | 'warn'; code: string; message: string; layerId?: string }

/** Cheap invariants before expensive production/export work. Never mutates the document. */
export function productionIssues(doc: Doc, layers: Layer[], groups: Group[]): ProductionIssue[] {
  const out: ProductionIssue[] = []
  if (!Number.isFinite(doc.width) || !Number.isFinite(doc.height) || doc.width <= 0 || doc.height <= 0) out.push({ severity: 'error', code: 'document-size', message: 'Document dimensions are invalid.' })
  if (doc.width * doc.height > 1_000_000_000) out.push({ severity: 'warn', code: 'extreme-size', message: 'This document exceeds one billion pixels; export one board at a time.' })
  const ids = new Set<string>()
  for (const l of layers) {
    if (ids.has(l.id)) out.push({ severity: 'error', code: 'duplicate-layer-id', message: `Duplicate layer id: ${l.name}`, layerId: l.id })
    ids.add(l.id)
    if (l.groupId && !groups.some(g => g.id === l.groupId)) out.push({ severity: 'warn', code: 'orphan-group', message: `${l.name} points to a missing group.`, layerId: l.id })
    if (![l.x, l.y, l.scaleX, l.scaleY, l.rotation, l.opacity].every(Number.isFinite)) out.push({ severity: 'error', code: 'invalid-transform', message: `${l.name} has an invalid transform.`, layerId: l.id })
    if (l.type === 'raster' && (!l.canvas || l.canvas.width < 1 || l.canvas.height < 1)) out.push({ severity: 'error', code: 'empty-raster', message: `${l.name} has no raster pixels.`, layerId: l.id })
  }
  const groupIds = new Set<string>()
  for (const g of groups) {
    if (groupIds.has(g.id)) out.push({ severity: 'error', code: 'duplicate-group-id', message: `Duplicate group id: ${g.name}` })
    groupIds.add(g.id)
  }
  return out
}

export function assertProductionSafe(doc: Doc, layers: Layer[], groups: Group[]) {
  const errors = productionIssues(doc, layers, groups).filter(x => x.severity === 'error')
  if (errors.length) throw new Error(errors.map(x => x.message).join(' '))
}
