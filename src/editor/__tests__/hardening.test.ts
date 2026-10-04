import { describe, expect, it } from 'vitest'
import { productionIssues } from '../hardening'

const doc: any = { id: 'd', name: 'Test', width: 1000, height: 1000 }
const layer = (id: string): any => ({ id, name: id, type: 'text', text: 'x', visible: true, locked: false, opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, groupId: null })

describe('production hardening', () => {
  it('catches duplicate identities before export', () => {
    expect(productionIssues(doc, [layer('a'), layer('a')], []).some(x => x.code === 'duplicate-layer-id')).toBe(true)
  })
  it('reports orphan group links without blocking otherwise valid artwork', () => {
    const l = { ...layer('a'), groupId: 'missing' }
    const issues = productionIssues(doc, [l], [])
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'orphan-group', severity: 'warn' })]))
  })
})
