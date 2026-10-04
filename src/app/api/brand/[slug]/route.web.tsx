import { NextResponse } from 'next/server'
import { owner, readPublication, store } from '@/brand/server'
import {
  MAX_PUBLICATION,
  validSlug,
  validateSnapshot,
  type StoredPublication,
} from '@/brand/model'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  if (!validSlug(params.slug))
    return json({ error: 'Guideline not found.' }, 404)
  try {
    if (new URL(req.url).searchParams.has('manage')) {
      const user = await owner(req)
      if (!user)
        return json({ error: 'Sign in to manage your guideline.' }, 401)
      const p = (await store().get(`brand/${params.slug}`, {
        type: 'json',
      })) as StoredPublication | null
      if (!p || p.owner !== user)
        return json({ error: 'Guideline not found.' }, 404)
      return json({
        slug: p.slug,
        version: p.version,
        updatedAt: p.updatedAt,
        visibility: p.visibility,
        live: p.live,
      })
    }
    const p = await readPublication(params.slug)
    return p ? json(p) : json({ error: 'Guideline not found.' }, 404)
  } catch {
    return json({ error: 'Publishing is temporarily unavailable.' }, 503)
  }
}
export async function PUT(
  req: Request,
  { params }: { params: { slug: string } },
) {
  return write(req, params.slug, false)
}
export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } },
) {
  return write(req, params.slug, true)
}
async function write(req: Request, slug: string, remove: boolean) {
  if (!validSlug(slug))
    return json(
      { error: 'Use 3–48 lowercase letters, numbers or hyphens.' },
      400,
    )
  // Same-origin requests only. Bearer auth is checked independently of browser headers.
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin)
    return json({ error: 'Invalid origin.' }, 403)
  try {
    const user = await owner(req)
    if (!user)
      return json(
        { error: 'Sign in to publish and manage your brand link.' },
        401,
      )
    const db = store(),
      key = `brand/${slug}`
    const old = await db.getWithMetadata(key, { type: 'json' })
    const previous = old?.data as StoredPublication | undefined
    if (previous && previous.owner !== user)
      return json({ error: 'That brand address is already taken.' }, 409)
    if (remove && !previous) return json({ error: 'Guideline not found.' }, 404)
    let next: StoredPublication
    if (remove) next = { ...previous!, live: false }
    else {
      if (Number(req.headers.get('content-length')) > MAX_PUBLICATION)
        return json(
          {
            error:
              'This guideline is too large to publish. Use fewer or smaller images.',
          },
          413,
        )
      const reader = req.body?.getReader()
      if (!reader) return json({ error: 'Missing guideline.' }, 400)
      const chunks: Uint8Array[] = []
      let size = 0
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_PUBLICATION) {
          await reader.cancel()
          return json(
            {
              error:
                'This guideline is too large to publish. Use fewer or smaller images.',
            },
            413,
          )
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const c of chunks) {
        bytes.set(c, offset)
        offset += c.length
      }
      let data
      try {
        data = JSON.parse(new TextDecoder().decode(bytes))
      } catch {
        return json({ error: 'Invalid guideline.' }, 400)
      }
      if (
        !validateSnapshot(data.snapshot) ||
        !['link', 'public'].includes(data.visibility) ||
        typeof data.sourceId !== 'string' ||
        data.sourceId.length > 100
      )
        return json({ error: 'Invalid guideline.' }, 400)
      if (
        previous &&
        (data.sourceId !== previous.sourceId ||
          data.version !== previous.version)
      )
        return json(
          {
            error:
              'This link changed elsewhere. Reload its publishing status before updating.',
          },
          409,
        )
      next = {
        slug,
        owner: user,
        sourceId: data.sourceId,
        snapshot: data.snapshot,
        visibility: data.visibility,
        version: (previous?.version ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        live: true,
      }
    }
    const result = await db.setJSON(
      key,
      next,
      old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
    )
    if (!result.modified)
      return json({ error: 'Someone updated this address. Try again.' }, 409)
    return json({
      slug,
      version: next.version,
      updatedAt: next.updatedAt,
      visibility: next.visibility,
      live: next.live,
    })
  } catch {
    return json(
      {
        error:
          'Publishing is temporarily unavailable. Your local draft is safe.',
      },
      503,
    )
  }
}
