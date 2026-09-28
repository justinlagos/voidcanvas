import { describe, expect, it } from 'vitest'
import { versionsToDrop, type VersionSummary } from '../versions'

const v = (i: number, extra: Partial<VersionSummary> = {}): VersionSummary => ({ id: 'v' + i, docId: 'd', at: i, label: 'Automatic', auto: true, thumb: '', width: 1, height: 1, ...extra })

describe('which versions make room', () => {
  it('keeps everything under the limit', () => {
    expect(versionsToDrop([v(1), v(2)], 5)).toEqual([])
  })
  it('drops the oldest automatic versions first, then unnamed ones saved by hand', () => {
    const list = [v(1, { auto: false, label: 'Saved by you' }), v(2), v(3), v(4, { auto: false, label: 'Saved by you' }), v(5)]
    expect(versionsToDrop(list, 3).map(x => x.id)).toEqual(['v2', 'v3'])
    expect(versionsToDrop(list, 1).map(x => x.id)).toEqual(['v2', 'v3', 'v5', 'v1'])
  })
  it('never drops named or approved versions, even past the limit', () => {
    const list = [v(1, { name: 'Direction A' }), v(2, { keep: true }), v(3), v(4)]
    expect(versionsToDrop(list, 1).map(x => x.id)).toEqual(['v3', 'v4'])
  })
})
