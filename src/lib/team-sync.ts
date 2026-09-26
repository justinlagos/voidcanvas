// Sync for shared brands and Studio jobs. A shared item is sealed with its team's key as one JSON document;
// every file inside it (logos, references, versions) is sealed separately and stored under a keyed hash, so a
// file is uploaded once however many times it is used, and the server cannot tell which file it is.
// Latest change wins. If an item changed here and in the team at the same time, the team's version is kept
// next to yours as "(their version)", on this device only.

import { accountFetch, accountRest } from './account'
import { canEdit, latestVersion, loadTeams, useTeams, workspaceKey } from './teams'
import { fileId, openBytes, openJson, sealBytes, sealJson } from './vault'

type Kind = 'brand' | 'job'
const STORE: Record<Kind, 'brands' | 'jobs'> = { brand: 'brands', job: 'jobs' }
const BUCKET = 'vc-team'
const LAST_KEY = 'vc-team-pulled'

interface Row { id: string; kind: Kind; ciphertext: string; key_version: number; deleted: boolean; updated_at: string; updated_by: string | null }
interface FileRef { __vcFile: string; v: number; type: string; name?: string }

const idb = () => import('@/editor/io').then(m => m.idb)
const jobs = () => import('@/studio/jobs').then(m => m.useJobs)
const itemAad = (ws: string, kind: Kind, id: string) => `item:${ws}:${kind}:${id}`
const fileAad = (ws: string) => `file:${ws}`

function lastPulled(): Record<string, string> { try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}') } catch { return {} } }
function setLastPulled(ws: string, at: string) { try { localStorage.setItem(LAST_KEY, JSON.stringify({ ...lastPulled(), [ws]: at })) } catch { /* ignore */ } }

// ─── Files ─────────────────────────────────────────────────────────

async function putFile(ws: string, v: number, blob: Blob): Promise<FileRef> {
  const k = workspaceKey(ws, v)!
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const id = await fileId(k, bytes)
  const db = await idb()
  if (!(await db.get('teamfiles', `${ws}/${id}`).catch(() => undefined))) {
    const res = await accountFetch(`/storage/v1/object/${BUCKET}/${ws}/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: (await sealBytes(k, bytes, fileAad(ws))) as BodyInit,
    })
    if (!res.ok && res.status !== 409 && !/exists|Duplicate/i.test(await res.text().catch(() => ''))) throw new Error('Could not upload a file')
    await db.put('teamfiles', { id: `${ws}/${id}`, blob }).catch(() => {})
  }
  return { __vcFile: id, v, type: blob.type, ...(typeof File !== 'undefined' && blob instanceof File ? { name: blob.name } : {}) }
}

async function getFile(ws: string, ref: FileRef): Promise<Blob> {
  const db = await idb()
  const cached = await db.get<{ blob: Blob }>('teamfiles', `${ws}/${ref.__vcFile}`).catch(() => undefined)
  const wrap = (b: Blob) => (ref.name && typeof File !== 'undefined' ? new File([b], ref.name, { type: ref.type }) : new Blob([b], { type: ref.type }))
  if (cached?.blob) return wrap(cached.blob)
  const res = await accountFetch(`/storage/v1/object/authenticated/${BUCKET}/${ws}/${ref.__vcFile}`)
  if (!res.ok) throw new Error('Could not download a file')
  const k = workspaceKey(ws, ref.v); if (!k) throw new Error('Missing team key')
  const blob = new Blob([(await openBytes(k, new Uint8Array(await res.arrayBuffer()), fileAad(ws))) as BlobPart], { type: ref.type })
  await db.put('teamfiles', { id: `${ws}/${ref.__vcFile}`, blob }).catch(() => {})
  return wrap(blob)
}

async function deflate(v: any, ws: string, ver: number): Promise<any> {
  if (typeof Blob !== 'undefined' && v instanceof Blob) return putFile(ws, ver, v)
  if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await deflate(x, ws, ver)); return out }
  if (v && typeof v === 'object') { const o: any = {}; for (const k of Object.keys(v)) o[k] = await deflate(v[k], ws, ver); return o }
  return v
}
async function inflate(v: any, ws: string): Promise<any> {
  if (v && typeof v === 'object' && typeof v.__vcFile === 'string') return getFile(ws, v as FileRef)
  if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await inflate(x, ws)); return out }
  if (v && typeof v === 'object') { const o: any = {}; for (const k of Object.keys(v)) o[k] = await inflate(v[k], ws); return o }
  return v
}

// ─── Push ──────────────────────────────────────────────────────────

const pending = (r: any) => !!r.workspaceId && (!r.pushedAt || r.updatedAt > r.pushedAt)

async function pushItem(kind: Kind, rec: any) {
  const ws = rec.workspaceId as string
  if (!canEdit(ws)) return
  const v = latestVersion(ws); const k = workspaceKey(ws, v); if (!k) return
  const { syncedAt, pushedAt, ...plain } = rec
  void syncedAt; void pushedAt
  const manifest = await deflate(plain, ws, v)
  const rows = await accountRest<{ updated_at: string }[]>('vc_items', 'on_conflict=workspace_id,kind,id&select=updated_at', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({ id: rec.id, workspace_id: ws, kind, ciphertext: await sealJson(k, manifest, itemAad(ws, kind, rec.id)), key_version: v, deleted: false }),
  })
  await writeLocal(kind, { ...rec, syncedAt: rows[0]?.updated_at ?? null, pushedAt: Math.max(Date.now(), rec.updatedAt + 1) }, false)
}

/** Tell the team an item is gone (deleted, or no longer shared). Keeps nothing readable on the server. */
export async function removeShared(kind: Kind, id: string, ws: string) {
  if (!canEdit(ws)) return
  const v = latestVersion(ws); const k = workspaceKey(ws, v); if (!k) return
  await accountRest('vc_items', 'on_conflict=workspace_id,kind,id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ id, workspace_id: ws, kind, ciphertext: await sealJson(k, {}, itemAad(ws, kind, id)), key_version: v, deleted: true }),
  })
}

async function writeLocal(kind: Kind, rec: any, reload = true) {
  const db = await idb()
  await db.put(STORE[kind], rec)
  const store = await jobs()
  if (!reload) {
    // Update in memory without touching updatedAt, so the change is not treated as a new edit.
    if (kind === 'brand') store.setState(s => ({ brands: s.brands.map(b => (b.id === rec.id ? { ...b, syncedAt: rec.syncedAt, pushedAt: rec.pushedAt } : b)) }))
    else store.setState(s => ({ jobs: (s.jobs ?? []).map(j => (j.id === rec.id ? { ...j, syncedAt: rec.syncedAt, pushedAt: rec.pushedAt } : j)) }))
  }
}

let pushing = false
export async function pushPending() {
  if (pushing) return
  pushing = true
  try {
    const s = (await jobs()).getState()
    for (const b of s.brands) if (pending(b)) await pushItem('brand', b).catch(() => {})
    for (const j of s.jobs ?? []) if (pending(j)) await pushItem('job', j).catch(() => {})
  } finally { pushing = false }
}

// ─── Pull ──────────────────────────────────────────────────────────

export async function pullWorkspace(ws: string): Promise<number> {
  const since = lastPulled()[ws] ?? '1970-01-01T00:00:00Z'
  const rows = await accountRest<Row[]>('vc_items', `workspace_id=eq.${ws}&updated_at=gt.${encodeURIComponent(since)}&select=id,kind,ciphertext,key_version,deleted,updated_at,updated_by&order=updated_at.asc&limit=100`)
  const db = await idb()
  const editor = canEdit(ws)
  let changed = 0
  for (const row of rows) {
    const local = await db.get<any>(STORE[row.kind], row.id).catch(() => undefined)
    if (local?.syncedAt === row.updated_at) { setLastPulled(ws, row.updated_at); continue }
    if (row.deleted) {
      if (local && local.workspaceId === ws) { await db.del(STORE[row.kind], row.id); changed++ }
      setLastPulled(ws, row.updated_at); continue
    }
    const k = workspaceKey(ws, row.key_version)
    if (!k) { setLastPulled(ws, row.updated_at); continue }
    let rec: any
    try { rec = await inflate(await openJson(k, row.ciphertext, itemAad(ws, row.kind, row.id)), ws) } catch { setLastPulled(ws, row.updated_at); continue }
    const now = Date.now()
    if (editor && local && local.workspaceId === ws && pending(local)) {
      // Changed here and in the team: keep theirs beside ours.
      const id = `${row.id}-theirs-${now.toString(36)}`
      await db.put(STORE[row.kind], { ...rec, id, name: `${rec.name ?? 'Untitled'} (their version)`, workspaceId: null, syncedAt: null, pushedAt: undefined, updatedAt: now })
    } else {
      await db.put(STORE[row.kind], { ...rec, workspaceId: ws, syncedAt: row.updated_at, pushedAt: Math.max(now, (rec.updatedAt ?? 0) + 1) })
    }
    changed++
    setLastPulled(ws, row.updated_at)
  }
  if (rows.length === 100) changed += await pullWorkspace(ws)
  return changed
}

export async function pullAll(): Promise<number> {
  let n = 0
  for (const w of useTeams.getState().workspaces) n += await pullWorkspace(w.id).catch(() => 0)
  if (n) await (await jobs()).getState().load()
  return n
}

/** Share an item with a team, move it to another, or stop sharing (null). */
export async function setShared(kind: Kind, rec: any, ws: string | null) {
  const before = rec.workspaceId as string | null | undefined
  if (before && before !== ws) await removeShared(kind, rec.id, before)
  const next = { ...rec, workspaceId: ws, syncedAt: null, pushedAt: undefined, updatedAt: Date.now() }
  await writeLocal(kind, next, true)
  await (await jobs()).getState().load()
  if (ws) await pushItem(kind, next)
}

// ─── Running ───────────────────────────────────────────────────────

let running = false
const offs: (() => void)[] = []

export async function startTeamSync() {
  if (running) return
  running = true
  await loadTeams().catch(() => {})
  const store = await jobs()
  let t: ReturnType<typeof setTimeout> | null = null
  offs.push(store.subscribe(() => { if (t) clearTimeout(t); t = setTimeout(() => pushPending().catch(() => {}), 1500) }))
  const tick = () => pullAll().then(() => pushPending()).catch(() => {})
  tick()
  const i = setInterval(tick, 20_000); offs.push(() => clearInterval(i))
  const vis = () => { if (document.visibilityState === 'visible') tick() }
  document.addEventListener('visibilitychange', vis); offs.push(() => document.removeEventListener('visibilitychange', vis))
}

export function stopTeamSync() { offs.splice(0).forEach(f => f()); running = false }

/** Start team sync whenever this device's account is ready (Studio calls this once). */
export function syncWhenReady(): () => void {
  let stop = () => {}
  import('./account').then(({ initAccount, useAccount }) => {
    const go = (s: string) => { if (s === 'ready') startTeamSync().catch(() => {}); else stopTeamSync() }
    initAccount().then(() => go(useAccount.getState().status)).catch(() => {})
    stop = useAccount.subscribe((s, p) => { if (s.status !== p.status) go(s.status) })
  }).catch(() => {})
  return () => { stop(); stopTeamSync() }
}
