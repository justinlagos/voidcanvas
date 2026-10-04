import 'server-only'
import { cache } from 'react'
import { getStore } from '@netlify/blobs'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/analytics'
import type { Publication, StoredPublication } from './model'
export const store = () =>
  getStore({ name: 'brand-portals', consistency: 'strong' })
export async function owner(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: auth },
    cache: 'no-store',
  })
  if (!r.ok) return null
  const u = await r.json()
  return typeof u.id === 'string' ? u.id : null
}
export const readPublication = cache(
  async (slug: string): Promise<Publication | null> => {
    const p = (await store().get(`brand/${slug}`, {
      type: 'json',
    })) as StoredPublication | null
    if (!p?.live) return null
    const { owner: _owner, sourceId: _id, live: _live, ...publicRecord } = p
    return publicRecord
  },
)
