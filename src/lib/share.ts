// ─── Studio Share ──────────────────────────────────────────────────
// Review and delivery links for clients. The client needs no account and installs nothing.
// Link: https://voidcanvas.netlify.app/s#<id>.<secret>. The fragment never reaches a server.
// From the secret come the content key (seals the manifest, every file and every comment) and a token; the
// server keeps only a hash of the token, which it checks before handing out sealed data or taking a comment.
// Files sit in the public bucket `vc-share` under random names listed only in the sealed manifest.
// Design: docs/studio-share.md.

import { SUPABASE_KEY, SUPABASE_URL } from './analytics'
import { b64u, openBytes, openJson, randomBytes, sealBytes, sealJson, shareKeys, unb64u } from './vault'

const BUCKET = 'vc-share'
export const SHARE_ORIGIN = 'https://voidcanvas.netlify.app'
export const SHARE_DAYS = 30
/** Largest total a delivery link can carry, and largest single file (the storage limit). */
export const MAX_SHARE_BYTES = 500 * 1024 * 1024
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export interface ShareFile { name: string; path: string; type: string; size: number; w?: number; h?: number }
export interface ReviewManifest { v: 1; kind: 'review'; client: string; job: string; label: string; notes: string; at: number; images: ShareFile[] }
export interface DeliveryManifest { v: 1; kind: 'delivery'; client: string; job: string; label: string; notes: string; at: number; files: ShareFile[] }
export type Manifest = ReviewManifest | DeliveryManifest

export type ShareEventBody =
  | { t: 'pin'; id: string; img: number; x: number; y: number; text: string; by: string }
  | { t: 'reply'; id: string; pin: string; text: string; by: string }
  | { t: 'done'; pin: string; done: boolean; by: string }
  | { t: 'decision'; id: string; value: 'approved' | 'changes'; note: string; by: string }
export type ShareEvent = ShareEventBody & { eid: number; team: boolean; at: string }

/** What a device keeps to reach a share again: the id and the secret, which together make the link. */
export interface ShareRef { id: string; secret: string; url: string; expiresAt: string }

export class ShareError extends Error { constructor(message: string, public code?: string) { super(message) } }

const aad = (id: string, part: 'manifest' | 'file' | 'event') => `share:${id}:${part}`

// ─── Links ─────────────────────────────────────────────────────────

export function shareUrl(id: string, secret: string, origin = SHARE_ORIGIN) { return `${origin}/s#${id}.${secret}` }

export function parseShareLink(text: string): { id: string; secret: string } {
  const frag = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text
  const m = frag.trim().match(/^([A-Za-z0-9_-]{16,32})\.([A-Za-z0-9_-]{20,64})$/)
  if (!m) throw new ShareError('This link is not complete. Ask for it to be sent again.', 'bad_link')
  if (unb64u(m[2]).length !== 16) throw new ShareError('This link is not complete. Ask for it to be sent again.', 'bad_link')
  return { id: m[1], secret: m[2] }
}

// ─── Talking to the server ─────────────────────────────────────────

/** Signed-in team members call as themselves, so their posts are marked as the team's; everyone else calls as a guest. */
async function rpc<T>(fn: string, args: unknown, signedIn = false): Promise<T> {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) }
  let res: Response
  if (signedIn) res = await (await import('./account')).accountFetch(`/rest/v1/rpc/${fn}`, init)
  else res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { ...init, headers: { ...(init.headers as Record<string, string>), apikey: SUPABASE_KEY } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const code = String(err?.message ?? res.status)
    if (code === 'not_found') throw new ShareError('This link has expired or was stopped. Ask for a new one.', code)
    if (code === 'slow_down') throw new ShareError('Too many comments at once. Wait a minute, then try again.', code)
    if (code === 'too_many') throw new ShareError('This review has reached its comment limit. Ask for a new link.', code)
    throw new ShareError('Could not reach Voidcanvas. Check your connection and try again.', code)
  }
  return res.json() as Promise<T>
}

const signedIn = async () => { try { return (await import('./account')).isSignedIn() } catch { return false } }

// ─── Opening a share (anyone with the link) ────────────────────────

export interface OpenShare {
  id: string
  key: Uint8Array
  token: string
  kind: 'review' | 'delivery'
  ready: boolean
  expiresAt: string
  manifest: Manifest
  events: ShareEvent[]
  after: number
}

interface OpenRow { kind: 'review' | 'delivery'; ready: boolean; expires_at: string; manifest: string | null; events: { id: number; body: string; by_team: boolean; at: string }[] }

async function openEvents(id: string, key: Uint8Array, rows: OpenRow['events']): Promise<ShareEvent[]> {
  const out: ShareEvent[] = []
  for (const r of rows) {
    try { out.push({ ...(await openJson<ShareEventBody>(key, r.body, aad(id, 'event'))), eid: r.id, team: r.by_team, at: r.at }) }
    catch { /* not sealed with this link's key: skip */ }
  }
  return out
}

export async function openShare(link: string): Promise<OpenShare> {
  const { id, secret } = parseShareLink(link)
  const { key, token } = await shareKeys(unb64u(secret), id)
  const row = await rpc<OpenRow>('vc_share_open', { p_id: id, p_token: token, p_after: 0 }, await signedIn())
  if (!row.manifest) throw new ShareError('This link could not be opened.')
  let manifest: Manifest
  try { manifest = await openJson<Manifest>(key, row.manifest, aad(id, 'manifest')) } catch { throw new ShareError('This link is damaged. Ask for it to be sent again.', 'bad_key') }
  const events = await openEvents(id, key, row.events)
  return { id, key, token, kind: row.kind, ready: row.ready, expiresAt: row.expires_at, manifest, events, after: row.events.at(-1)?.id ?? 0 }
}

/** New comments since the last check. */
export async function pollShare(s: Pick<OpenShare, 'id' | 'key' | 'token' | 'after'>): Promise<{ events: ShareEvent[]; after: number }> {
  const row = await rpc<OpenRow>('vc_share_open', { p_id: s.id, p_token: s.token, p_after: s.after || 0 }, await signedIn())
  return { events: await openEvents(s.id, s.key, row.events), after: row.events.at(-1)?.id ?? s.after }
}

/** Events for a share this device made or received, by its stored reference. */
export async function eventsFor(ref: Pick<ShareRef, 'id' | 'secret'>, after = 0): Promise<{ events: ShareEvent[]; after: number }> {
  const { key, token } = await shareKeys(unb64u(ref.secret), ref.id)
  return pollShare({ id: ref.id, key, token, after })
}

export async function postEvent(s: Pick<OpenShare, 'id' | 'key' | 'token'>, body: ShareEventBody): Promise<number> {
  return rpc<number>('vc_share_post', { p_id: s.id, p_token: s.token, p_body: await sealJson(s.key, body, aad(s.id, 'event')) }, await signedIn())
}

export async function postEventFor(ref: Pick<ShareRef, 'id' | 'secret'>, body: ShareEventBody): Promise<number> {
  const { key, token } = await shareKeys(unb64u(ref.secret), ref.id)
  return postEvent({ id: ref.id, key, token }, body)
}

export async function fetchShareFile(s: Pick<OpenShare, 'id' | 'key'>, f: ShareFile): Promise<Blob> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.path}`)
  if (!res.ok) throw new ShareError('A file could not be downloaded. Try again.')
  const bytes = await openBytes(s.key, new Uint8Array(await res.arrayBuffer()), aad(s.id, 'file'))
  return new Blob([bytes as BlobPart], { type: f.type })
}

// ─── Making a share (signed in) ────────────────────────────────────

interface Input { name: string; blob: Blob; w?: number; h?: number }

async function create(kind: 'review' | 'delivery', meta: { client: string; job: string; label: string; notes: string; workspaceId?: string | null }, files: Input[], onProgress?: (done: number, total: number) => void): Promise<ShareRef> {
  const acc = await import('./account')
  if (!acc.isSignedIn() || acc.useAccount.getState().status !== 'ready') throw new ShareError('Sign in to your account on this device to send links.', 'signed_out')
  const total = files.reduce((n, f) => n + f.blob.size, 0)
  const big = files.find(f => f.blob.size > MAX_FILE_BYTES - 64)
  if (big) throw new ShareError(`${big.name} is over 50 MB, the most one file in a link can be.`, 'too_big')
  if (total > MAX_SHARE_BYTES) throw new ShareError('These files are over 500 MB together, the most one link can carry. Send fewer at once.', 'too_big')
  const id = b64u(randomBytes(16)), secretBytes = randomBytes(16), secret = b64u(secretBytes)
  const { key, tokenHash } = await shareKeys(secretBytes, id)
  const list: ShareFile[] = files.map(f => ({ name: f.name, path: `${id}/${b64u(randomBytes(16))}`, type: f.blob.type || 'application/octet-stream', size: f.blob.size, ...(f.w ? { w: f.w, h: f.h } : {}) }))
  const manifest = { v: 1, kind, client: meta.client, job: meta.job, label: meta.label, notes: meta.notes, at: Date.now(), ...(kind === 'review' ? { images: list } : { files: list }) } as Manifest
  const expires = new Date(Date.now() + SHARE_DAYS * 86400_000).toISOString()
  await acc.accountRest('vc_shares', '', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
    id, kind, token_hash: tokenHash, manifest: await sealJson(key, manifest, aad(id, 'manifest')), expires_at: expires, workspace_id: meta.workspaceId ?? null,
  }) })
  try {
    for (let i = 0; i < files.length; i++) {
      onProgress?.(i, files.length)
      const body = await sealBytes(key, new Uint8Array(await files[i].blob.arrayBuffer()), aad(id, 'file'))
      const res = await acc.accountFetch(`/storage/v1/object/${BUCKET}/${list[i].path}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: body as BodyInit })
      if (!res.ok) throw new ShareError(`Could not upload ${files[i].name}. Check your connection and try again.`, 'upload')
    }
    onProgress?.(files.length, files.length)
    await acc.accountRest('vc_shares', `id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ ready: true, bytes: total }) })
  } catch (e) { await deleteShare(id).catch(() => {}); throw e }
  import('./analytics').then(m => m.track(`share.${kind}`, { files: files.length })).catch(() => {})
  return { id, secret, url: shareUrl(id, secret), expiresAt: expires }
}

export const createReviewShare = (meta: Parameters<typeof create>[1], images: Input[], onProgress?: (d: number, t: number) => void) => create('review', meta, images, onProgress)
export const createDeliveryShare = (meta: Parameters<typeof create>[1], files: Input[], onProgress?: (d: number, t: number) => void) => create('delivery', meta, files, onProgress)

/** Stop a link: its files and comments are deleted from the server. */
export async function deleteShare(id: string) {
  const acc = await import('./account')
  const list = await acc.accountFetch(`/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: id, limit: 1000, offset: 0 }) })
  const names: { name: string }[] = list.ok ? await list.json() : []
  if (names.length) {
    const del = await acc.accountFetch(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: names.map(f => `${id}/${f.name}`) }) })
    if (!del.ok) throw new ShareError('Could not delete the files. Try again.')
  }
  await acc.accountRest('vc_shares', `id=eq.${id}`, { method: 'DELETE' })
}

/** Remove this person's expired links, or every link (before deleting the account). */
export async function deleteMyShares(all = false): Promise<number> {
  const acc = await import('./account')
  if (!acc.isSignedIn()) return 0
  const rows = await acc.accountRest<{ id: string }[]>('vc_shares', `select=id${all ? '' : `&expires_at=lt.${new Date().toISOString()}`}`)
  for (const r of rows ?? []) await deleteShare(r.id).catch(() => {})
  return rows?.length ?? 0
}

// Automated tests make a delivery link without rendering a whole design; the same public API the app uses.
if (typeof window !== 'undefined') (window as any).__vcShare = { createDeliveryShare, deleteShare }
