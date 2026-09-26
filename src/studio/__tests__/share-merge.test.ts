import { describe, expect, it } from 'vitest'
import { applyShareEvents } from '../share-merge'
import type { Version } from '../jobs'
import type { ShareEvent } from '@/lib/share'

const base = (): Version => ({ id: 'v', n: 1, label: 'v1', notes: '', at: 0, images: [], pins: { '0': [{ id: 'mine', x: 0.1, y: 0.1, text: 'own note', done: false, at: 0 }] }, todo: [], status: 'sent', share: { id: 's', secret: 'x', url: '', expiresAt: '', at: 0 } })
const ev = (eid: number, body: any, team = false): ShareEvent => ({ ...body, eid, team, at: new Date(1000 + eid).toISOString() })

describe('review link events', () => {
  it('adds client pins, replies and done marks once, however often they arrive', () => {
    const events = [
      ev(1, { t: 'pin', id: 'p1', img: 1, x: 0.5, y: 2, text: 'Bigger logo', by: 'Ada' }),
      ev(2, { t: 'reply', id: 'r1', pin: 'p1', text: 'Done in v2', by: 'x' }, true),
      ev(3, { t: 'done', pin: 'p1', done: true, by: 'x' }, true),
    ]
    const once = applyShareEvents(base(), events)
    const twice = applyShareEvents(once, events)
    expect(twice).toEqual(once)
    const p = once.pins['1'][0]
    expect(p).toMatchObject({ id: 'p1', by: 'Ada', shared: true, done: true, y: 1 })
    expect(p.replies).toEqual([expect.objectContaining({ by: 'Designer', text: 'Done in v2', team: true })])
    expect(once.pins['0']).toHaveLength(1) // the designer's own pins are left alone
    expect(once.share?.seen).toBe(3)
  })
  it('takes the latest decision and turns a change request into a to-do', () => {
    const v = applyShareEvents(base(), [ev(4, { t: 'decision', id: 'd1', value: 'changes', note: 'Warmer photo', by: 'Ada' })])
    expect(v.status).toBe('changes')
    expect(v.todo).toEqual([{ id: 'd1', text: 'Ada: Warmer photo', done: false }])
    const w = applyShareEvents(v, [ev(5, { t: 'decision', id: 'd2', value: 'approved', note: '', by: 'Ada' })])
    expect(w.status).toBe('approved')
    expect(w.decision).toMatchObject({ value: 'approved', by: 'Ada' })
  })
  it('ignores events for a version without a link', () => {
    const v = { ...base(), share: null }
    expect(applyShareEvents(v, [ev(1, { t: 'pin', id: 'p', img: 0, x: 0, y: 0, text: 'x', by: 'y' })])).toBe(v)
  })
})
