import { describe, expect, it } from 'vitest'
import { replayStructure, type StructuralItem } from '../variant-prototype'

const item = (masterNodeId: string, name: string, order: number, extra?: Partial<StructuralItem>): StructuralItem =>
  ({ masterNodeId, instanceId: masterNodeId + '@V', name, order, ...extra })

describe('B.1 VariantGraph structural replay', () => {
  it('adopts master-added layers and keeps variant-only layers', () => {
    const base = [item('A', 'A', 0)]
    const masterNow = [item('A', 'A', 0), item('B', 'B', 1)]
    const variant = [item('A', 'A', 0), item('C', 'Mine', 1)]
    const r = replayStructure(base, masterNow, variant)
    expect(r.items.map(i => i.masterNodeId).sort()).toEqual(['A', 'B', 'C'])
    expect(r.conflicts).toEqual([])
  })
  it('flags master-deleted-but-variant-edited instead of dropping', () => {
    const base = [item('A', 'A', 0)]
    const masterNow: StructuralItem[] = []
    const variant = [item('A', 'A-local', 0)]
    const r = replayStructure(base, masterNow, variant)
    expect(r.items.map(i => i.masterNodeId)).toEqual(['A'])
    expect(r.conflicts).toEqual([{ masterNodeId: 'A', kind: 'deleted-edited' }])
  })
  it('keeps variant-local order and renames, flagging double renames', () => {
    const base = [item('A', 'A', 0), item('B', 'B', 1)]
    const masterNow = [item('A', 'A', 1), item('B', 'B-master', 0)]
    const variant = [item('A', 'A', 1), item('B', 'B-mine', 1)]
    const r = replayStructure(base, masterNow, variant)
    expect(r.items.find(i => i.masterNodeId === 'B')?.name).toBe('B-mine')
    expect(r.conflicts.map(c => c.kind)).toContain('renamed-both')
  })
})
