import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildConsentRecord, confirmConsent, ProviderDisabledError } from '../provider'
import { getPolicy, isProviderAllowed, resetPolicy, setPolicy } from '../policy'
import { REAL_ADAPTERS } from '../providers/disabled'

afterEach(() => resetPolicy())

describe('GEN-A provider policy (default-deny + kill-switch)', () => {
  it('denies every remote provider by default; mocks always pass', () => {
    expect(isProviderAllowed('openai', false).ok).toBe(false)
    expect(isProviderAllowed('mock-test-provider', true).ok).toBe(true)
    expect(getPolicy().enabled).toEqual([])
  })
  it('allows a listed provider until the kill-switch fires', () => {
    setPolicy({ enabled: ['flux-fal'] })
    expect(isProviderAllowed('flux-fal', false).ok).toBe(true)
    expect(isProviderAllowed('openai', false).ok).toBe(false)
    setPolicy({ killSwitch: true, enabled: ['flux-fal'] })
    expect(isProviderAllowed('flux-fal', false).ok).toBe(false)
    expect(isProviderAllowed('flux-fal', false).reason).toMatch(/off-switch/)
  })
  it('drops non-string ids instead of enabling them', () => {
    setPolicy({ enabled: ['ok', 42 as unknown as string, null as unknown as string] })
    expect(getPolicy().enabled).toEqual(['ok'])
  })
})

describe('GEN-A disabled adapters (no network, honest capabilities)', () => {
  it('all real adapters are unavailable with a reason', () => {
    for (const make of REAL_ADAPTERS) {
      const p = make()
      expect(p.mock).toBe(false)
      expect(p.remote).toBe(true)
      const a = p.availability()
      expect(a.available).toBe(false)
      if (!a.available) expect(a.reason.length).toBeGreaterThan(10)
    }
  })
  it('generate/editRegion throw before any network, even when policy lists them', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    setPolicy({ enabled: ['openai', 'stability', 'flux-fal', 'firefly'] })
    for (const make of REAL_ADAPTERS) {
      const p = make()
      await expect(p.generate({ prompt: 'x', aspect: 'square', count: 1, capability: 'text-to-image' })).rejects.toBeInstanceOf(ProviderDisabledError)
      if (p.editRegion) {
        const blob = new Blob(['x'], { type: 'image/png' })
        await expect(p.editRegion({ image: blob, mask: blob, width: 8, height: 8, prompt: 'x' })).rejects.toBeInstanceOf(ProviderDisabledError)
      }
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
  it('capability advertisements match researched support (no outpaint where unverified)', () => {
    const caps = Object.fromEntries(REAL_ADAPTERS.map(m => [m().id, m().capabilities]))
    expect(caps['stability']).toContain('outpaint')
    expect(caps['firefly']).toContain('outpaint')
    expect(caps['openai']).not.toContain('outpaint')
    expect(caps['flux-fal']).not.toContain('outpaint')
  })
  it('flux estimates per-megapixel cost; others refuse to quote', () => {
    const flux = REAL_ADAPTERS.find(m => m().id === 'flux-fal')!()
    const est = flux.estimateCost('text-to-image', { count: 2, width: 1024, height: 1024 })
    expect(est.amount).toBeCloseTo(0.012, 3) // ceil(1.05MP)->2MP x $0.003 x 2 images
    expect(est.breakdown).toMatch(/Verify live fal pricing/)
    for (const make of REAL_ADAPTERS) {
      const p = make()
      if (p.id === 'flux-fal') continue
      expect(p.estimateCost('text-to-image', { count: 1, width: 512, height: 512 }).amount).toBeNull()
    }
  })
})

describe('GEN-A consent records', () => {
  it('builds an unconfirmed record and confirms explicitly', () => {
    const flux = REAL_ADAPTERS.find(m => m().id === 'flux-fal')!()
    const r = buildConsentRecord({
      provider: flux,
      operation: 'region-edit (1024x768 crop)',
      dataSent: ['1024x768 source crop PNG', '1024x768 mask PNG'],
      sharesCanvasContext: false,
      cost: flux.estimateCost('region-edit', { count: 1, width: 1024, height: 768 }),
      licenceNote: 'Verify endpoint commercial terms before use.',
      retentionNote: 'Verify provider retention policy before use.',
    })
    expect(r.confirmed).toBe(false)
    expect(r.dataSent).toHaveLength(2)
    expect(r.sharesCanvasContext).toBe(false)
    const c = confirmConsent(r)
    expect(c.confirmed).toBe(true)
    expect(c.confirmedAt).toBeGreaterThan(0)
  })
})
