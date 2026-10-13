import { describe, expect, it } from 'vitest'
import { describeSelection } from '../binding-describe'
import type { Layer } from '../../types'

const shape = (id: string): Layer => ({ id, name: id, type: 'shape', x: 0, y: 0 } as unknown as Layer)
const text = (id: string): Layer => ({ id, name: id, type: 'text', x: 0, y: 0 } as unknown as Layer)

const base = { layers: [shape('S1'), text('T1')], keyObjectId: null, frameId: 'F1', boardCount: 1, inGroup: false, editingMask: false, editingText: false, tool: 'move' as const }

describe('B.1 binding description (integration contract)', () => {
  it('tracks kind/target/scope per selection without touching the store', () => {
    expect(describeSelection({ ...base, selectedIds: ['S1'], activeId: 'S1' }).kind).toBe('shape')
    expect(describeSelection({ ...base, selectedIds: ['T1'], activeId: 'T1', editingText: true }).target).toBe('story')
    const d = describeSelection({ ...base, selectedIds: ['S1', 'T1'], activeId: 'T1' })
    expect(d.scope).toBe('selection')
    expect(d.primary.length).toBeLessThanOrEqual(5)
  })
  it('keeps a stable key across successive selections', () => {
    const a = describeSelection({ ...base, selectedIds: ['S1'], activeId: 'S1' }).key
    const b = describeSelection({ ...base, selectedIds: ['S1'], activeId: 'S1' }).key
    expect(a).toBe(b)
  })
})
