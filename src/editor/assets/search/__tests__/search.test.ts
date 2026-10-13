import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAssetStore, listAssets } from '../../asset-store'
import { commercialWarning, creditTextFor, rightsBadge, type RightsRecord } from '../rights'
import { createPexelsAdapter, createPixabayAdapter, createSampleLibraryProvider, createUnsplashAdapter, SearchDisabledError } from '../providers'
import { importSearchResult, withTimeout } from '../import'

const rights: RightsRecord = {
  provider: 'sample-library',
  providerDisplayName: 'Sample library',
  creator: 'Jane Doe',
  creatorUrl: null,
  sourceUrl: null,
  licence: 'VoidCanvas sample — free to use',
  licenceUrl: null,
  commercialUse: 'verified',
  attributionRequired: true,
  creditText: null,
  restrictions: null,
  retrievedAt: Date.now(),
  sourceId: 'sample-3',
}

describe('SEARCH-A rights records', () => {
  it('badges verified/unknown/restricted distinctly', () => {
    expect(rightsBadge(rights).tone).toBe('ok')
    expect(rightsBadge({ ...rights, attributionRequired: false }).label).toMatch(/commercial OK/)
    expect(rightsBadge({ ...rights, commercialUse: 'unknown' })).toEqual({ label: expect.stringMatching(/unverified/), tone: 'warn' })
    expect(rightsBadge({ ...rights, commercialUse: 'restricted' }).tone).toBe('stop')
  })
  it('warns on unknown/restricted, stays quiet on clean verified', () => {
    expect(commercialWarning({ ...rights, attributionRequired: false })).toBeNull()
    expect(commercialWarning(rights)).toMatch(/Credit required/)
    expect(commercialWarning({ ...rights, commercialUse: 'unknown' })).toMatch(/not verified/)
    expect(commercialWarning({ ...rights, commercialUse: 'restricted', restrictions: 'No merch.' })).toMatch(/No merch/)
  })
  it('formats credit text', () => {
    expect(creditTextFor(rights)).toBe('Photo by Jane Doe / Sample library')
    expect(creditTextFor({ ...rights, creator: null })).toBe('Photo via Sample library')
  })
})

describe('SEARCH-A providers', () => {
  it('real stock adapters are disabled with zero network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    for (const make of [createUnsplashAdapter, createPexelsAdapter, createPixabayAdapter]) {
      const p = make()
      expect(p.availability().available).toBe(false)
      expect(p.rules.length).toBeGreaterThan(2)
      await expect(p.search({ query: 'rocket' })).rejects.toBeInstanceOf(SearchDisabledError)
      await expect(p.download('x')).rejects.toBeInstanceOf(SearchDisabledError)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
  it('only advertises filters each provider supports', () => {
    expect(createUnsplashAdapter().filters.color).toBe(true)
    expect(createPixabayAdapter().filters.color).toBe(false)
  })
  it('sample library searches honestly labelled local trials', async () => {
    const lib = createSampleLibraryProvider(async () => new Blob(['png'], { type: 'image/png' }))
    expect(lib.availability()).toEqual({ available: true })
    const all = await lib.search({ query: '' })
    expect(all.length).toBe(6)
    expect(all.every(r => r.rights.provider === 'sample-library')).toBe(true)
    expect(all.every(r => r.rights.commercialUse === 'verified')).toBe(true)
    const portraits = await lib.search({ query: '', orientation: 'portrait' })
    expect(portraits.length).toBe(2)
    expect(portraits.every(r => r.height > r.width)).toBe(true)
    const rocket = await lib.search({ query: 'rocket' })
    expect(rocket.length).toBe(1)
    expect(rocket[0].title).toMatch(/Rocket/)
    expect(await lib.search({ query: 'rocket launch' })).toHaveLength(1)
    expect(await lib.search({ query: 'penguin' })).toHaveLength(0)
    expect(await lib.search({ query: 'rocket', orientation: 'landscape' })).toHaveLength(0)
    const blob = await lib.download(all[0].id)
    expect(blob).toBeInstanceOf(Blob)
    await expect(lib.download('sample-404')).rejects.toThrow(/Unknown sample/)
  })
})

describe('SEARCH-A safe import', () => {
  beforeEach(() => clearAssetStore())
  const fakeCanvas = {} as HTMLCanvasElement
  const lib = () =>
    createSampleLibraryProvider(async () => new Blob(['0123456789abcdef'], { type: 'image/png' }))
  it('imports through validation with rights attached', async () => {
    const provider = lib()
    const [result] = await provider.search({ query: '' })
    const asset = await importSearchResult(provider, result, result.rights, {
      decode: async () => ({ canvas: fakeCanvas, width: 1200, height: 800 }),
      sha: async () => 'abc123',
    })
    expect(asset.source).toBe('external_search')
    expect(asset.rights?.sourceId).toBe(result.rights.sourceId)
    expect(asset.rights?.commercialUse).toBe('verified')
    expect(asset.width).toBe(1200)
    expect(listAssets()).toHaveLength(1)
  })
  it('refuses disabled providers, bad MIME and decode failures', async () => {
    const dead = createUnsplashAdapter()
    await expect(
      importSearchResult(dead, { id: 'x', title: 'x', thumbUrl: null, previewUrl: null, width: 1, height: 1, rights }, rights),
    ).rejects.toThrow(/No API key/)
    const provider = lib()
    const [result] = await provider.search({ query: '' })
    const badMime = createSampleLibraryProvider(async () => new Blob(['x'], { type: 'text/html' }))
    await expect(importSearchResult(badMime, result, rights)).rejects.toThrow(/not supported|not an image/i)
    const badDecode = createSampleLibraryProvider(async () => new Blob(['ok-bytes!!'], { type: 'image/png' }))
    await expect(
      importSearchResult(badDecode, result, rights, {
        decode: async () => {
          throw new Error('decode-failed')
        },
      }),
    ).rejects.toThrow(/decode-failed/)
    expect(listAssets()).toHaveLength(0)
  })
})

describe('SEARCH-A transport guards', () => {
  it('withTimeout surfaces slow or failing downloads', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'Download')).rejects.toThrow(/timed out/)
    await expect(withTimeout(Promise.resolve(1), 1000, 'Download')).resolves.toBe(1)
  })
})
