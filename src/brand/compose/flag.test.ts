import { afterEach, describe, expect, it } from 'vitest'
import { brandV2Enabled } from './flag'

const store = new Map<string, string>()
const fakeWindow = (search: string) => ({
  location: { search },
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
})
const go = (search: string) => { (globalThis as { window?: unknown }).window = fakeWindow(search) }

describe('Brand V2 renderer flag', () => {
  afterEach(() => { store.clear(); delete (globalThis as { window?: unknown }).window })
  it('is off on the server and by default', () => {
    expect(brandV2Enabled()).toBe(false)
    go(''); expect(brandV2Enabled()).toBe(false)
  })
  it('turns on with ?brandv2=1 and is remembered', () => {
    go('?brandv2=1'); expect(brandV2Enabled()).toBe(true)
    go(''); expect(brandV2Enabled()).toBe(true)
  })
  it('turns off again with ?brandv2=0', () => {
    go('?brandv2=1'); brandV2Enabled()
    go('?brandv2=0'); expect(brandV2Enabled()).toBe(false)
    go(''); expect(brandV2Enabled()).toBe(false)
  })
  it('stays off when storage is blocked', () => {
    ;(globalThis as { window?: unknown }).window = { location: { search: '' }, get localStorage() { throw new Error('blocked') } }
    expect(brandV2Enabled()).toBe(false)
  })
})
