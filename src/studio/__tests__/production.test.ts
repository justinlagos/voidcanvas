import { describe, expect, it } from 'vitest'
import { productionState } from '../production'
import { newJob } from '../jobs'

describe('Studio production state', () => {
  it('flags design changes after approval and stale delivery', () => {
    const j = newJob({
      deliverables: [{ id: 'a', label: 'Post', presetId: 'custom', width: 1080, height: 1080, group: 'Social', done: true }],
      versions: [{ id: 'v1', n: 1, label: 'v1', notes: '', at: 100, images: [], pins: {}, todo: [], status: 'approved' }],
      deliveries: [{ at: 120, files: ['post.png'] }],
    })
    const s = productionState(j, 150)
    expect(s.designChangedAfterApproval).toBe(true)
    expect(s.staleDelivery).toBe(true)
    expect(s.ready).toBe(false)
  })

  it('is ready only when formats, feedback and approval are current', () => {
    const j = newJob({
      deliverables: [{ id: 'a', label: 'Post', presetId: 'custom', width: 1080, height: 1080, group: 'Social', done: true }],
      versions: [{ id: 'v1', n: 1, label: 'v1', notes: '', at: 200, images: [], pins: {}, todo: [], status: 'approved' }],
    })
    expect(productionState(j, 190).ready).toBe(true)
  })
})
