import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { validateSnapshot, type Snapshot } from '../model'
const mocks = vi.hoisted(() => ({
  owner: vi.fn(),
  get: vi.fn(),
  getWithMetadata: vi.fn(),
  setJSON: vi.fn(),
  readPublication: vi.fn(),
}))
vi.mock('@/brand/server', () => ({
  owner: mocks.owner,
  readPublication: mocks.readPublication,
  store: () => mocks,
}))
import { PUT, GET, DELETE } from '@/app/api/brand/[slug]/route.web'
const s: Snapshot = {
  name: 'Acme',
  colors: [{ role: 'primary', hex: '#94c11f' }],
  display: 'Inter',
  body: 'Inter',
  logoMin: 40,
  clearSpace: 0.5,
  voice: [],
  dos: [],
  donts: [],
  logos: [],
  imagery: [],
  pages: [],
  system: buildBrand(
    resolve({ ...initialTokens(), name: 'Acme', brandColor: '#94c11f' }),
  ),
}
const ctx = { params: { slug: 'acme' } }
const request = (
  body: unknown = {
    snapshot: s,
    visibility: 'link',
    sourceId: 'brand-1',
    version: 0,
  },
  method = 'PUT',
) =>
  new Request('https://voidcanvas.app/api/brand/acme', {
    method,
    headers: {
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    ...(method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
  })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.owner.mockResolvedValue('owner-1')
  mocks.getWithMetadata.mockResolvedValue(null)
  mocks.setJSON.mockResolvedValue({ modified: true })
})
describe('published brand boundaries', () => {
  it('accepts a complete inert snapshot and rejects executable SVG and invalid colours', () => {
    expect(validateSnapshot(s)).toBe(true)
    expect(
      validateSnapshot({
        ...s,
        logos: [
          {
            name: 'unsafe',
            data: 'data:image/svg+xml;base64,PHN2Zz4=',
            w: 40,
            h: 40,
          },
        ],
      }),
    ).toBe(false)
    expect(
      validateSnapshot({
        ...s,
        colors: [{ role: 'primary', hex: 'url(https://example.com)' }],
      }),
    ).toBe(false)
  })
  it('requires a verified account before writing', async () => {
    mocks.owner.mockResolvedValue(null)
    expect((await PUT(request(), ctx)).status).toBe(401)
    expect(mocks.setJSON).not.toHaveBeenCalled()
  })
  it('reserves slugs atomically, with no owner data in the public response', async () => {
    const r = await PUT(request(), ctx)
    expect(r.status).toBe(200)
    expect(mocks.setJSON.mock.calls[0][2]).toEqual({ onlyIfNew: true })
    expect(await r.json()).not.toHaveProperty('owner')
  })
  it('cannot overwrite someone else’s brand address', async () => {
    mocks.getWithMetadata.mockResolvedValue({
      data: { owner: 'another' },
      etag: 'old',
    })
    expect((await PUT(request(), ctx)).status).toBe(409)
    expect(mocks.setJSON).not.toHaveBeenCalled()
  })
  it('rejects stale versions and simultaneous writes', async () => {
    mocks.getWithMetadata.mockResolvedValue({
      data: { owner: 'owner-1', sourceId: 'brand-1', version: 2 },
      etag: 'old',
    })
    expect((await PUT(request(), ctx)).status).toBe(409)
    mocks.getWithMetadata.mockResolvedValue(null)
    mocks.setJSON.mockResolvedValue({ modified: false })
    expect((await PUT(request(), ctx)).status).toBe(409)
  })
  it('updates only the published snapshot with optimistic concurrency', async () => {
    mocks.getWithMetadata.mockResolvedValue({
      data: { owner: 'owner-1', sourceId: 'brand-1', version: 1 },
      etag: 'old',
    })
    const r = await PUT(
      request({
        snapshot: s,
        visibility: 'public',
        sourceId: 'brand-1',
        version: 1,
      }),
      ctx,
    )
    expect(r.status).toBe(200)
    expect(mocks.setJSON.mock.calls[0][1].version).toBe(2)
    expect(mocks.setJSON.mock.calls[0][2]).toEqual({ onlyIfMatch: 'old' })
  })
  it('unpublishes without releasing the address', async () => {
    mocks.getWithMetadata.mockResolvedValue({
      data: { owner: 'owner-1', slug: 'acme', version: 3, live: true },
      etag: 'old',
    })
    expect((await DELETE(request(null, 'DELETE'), ctx)).status).toBe(200)
    expect(mocks.setJSON.mock.calls[0][1]).toMatchObject({
      owner: 'owner-1',
      slug: 'acme',
      version: 3,
      live: false,
    })
  })
  it('rejects cross-origin writes and oversized bodies', async () => {
    const r = request()
    r.headers.set('origin', 'https://other.test')
    expect((await PUT(r, ctx)).status).toBe(403)
    const large = request()
    large.headers.set('content-length', '5000000')
    expect((await PUT(large, ctx)).status).toBe(413)
  })
  it('returns no-cache public reads and hides unavailable brands', async () => {
    mocks.readPublication.mockResolvedValue({ slug: 'acme' })
    const r = await GET(
      new Request('https://voidcanvas.app/api/brand/acme'),
      ctx,
    )
    expect(r.headers.get('cache-control')).toBe('no-store')
    mocks.readPublication.mockResolvedValue(null)
    expect(
      (await GET(new Request('https://voidcanvas.app/api/brand/acme'), ctx))
        .status,
    ).toBe(404)
  })
})
