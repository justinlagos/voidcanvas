import { idb, isPrivate, restoreStored, saveProject, storeDesign, whenSaved, type ProjectSummary, type StoredProject } from './io'
import { useEditor } from './store'
import { useUi } from './ui-store'

// Version history and crash recovery. Versions are full copies of a design kept on this device:
// saved by hand, every few minutes while you work, before risky operations and on export.

export interface VersionSummary {
  id: string; docId: string; at: number
  /** How it was made: "Saved by you", "Automatic", "Exported", "Sent for review"… */
  label: string
  auto: boolean
  thumb: string; width: number; height: number
  /** A name the designer gave it, such as "Direction A" or "Client revision 2". */
  name?: string
  /** Approved by a client (or pinned by hand): never removed to make room. */
  keep?: boolean
  /** Fingerprint of the design (see `fingerprint`), to tell whether the design changed since. */
  fp?: string
}
interface StoredVersion { id: string; project: StoredProject }

const KEEP = 30

/** Save the open design as a version. Returns the version id, or null when there is nothing to save. */
export async function saveVersion(label: string, auto = false, opts: { name?: string } = {}): Promise<string | null> {
  const { doc, layers, groups, swatches } = useEditor.getState()
  if (!doc || isPrivate()) return null
  const { stored, summary } = await storeDesign(doc, layers, groups, swatches)
  const id = await putVersion(stored, summary.thumb, label, auto, opts)
  lastVersionAt = Date.now()
  return id
}

/**
 * Save a design that is not open (Studio making a review version). The newest version is reused when the
 * design has not changed since it, so sending the same design twice does not store it twice.
 */
export async function saveVersionOf(docId: string, label: string, opts: { name?: string; keep?: boolean } = {}): Promise<string | null> {
  if (isPrivate()) return null
  await whenSaved()
  const stored = await idb.get<StoredProject>('projects', docId).catch(() => undefined)
  if (!stored) return null
  const fp = await fingerprint(stored)
  const last = (await listVersions(docId))[0]
  if (last && last.fp === fp) {
    await idb.put('versionIndex', { ...last, ...(opts.name && !last.name ? { name: opts.name } : {}), ...(opts.keep ? { keep: true } : {}) })
    return last.id
  }
  const summary = await idb.get<ProjectSummary>('index', docId).catch(() => undefined)
  return putVersion(stored, summary?.thumb ?? '', label, false, opts, fp)
}

async function putVersion(stored: StoredProject, thumb: string, label: string, auto: boolean, opts: { name?: string; keep?: boolean }, fp?: string): Promise<string> {
  const docId = stored.id
  const id = `${docId}:${Date.now()}`
  await idb.put('versions', { id, project: stored } as StoredVersion)
  const v: VersionSummary = { id, docId, at: Date.now(), label, auto, thumb, width: stored.doc.width, height: stored.doc.height, fp: fp ?? await fingerprint(stored).catch(() => undefined) }
  if (opts.name?.trim()) v.name = opts.name.trim()
  if (opts.keep) v.keep = true
  await idb.put('versionIndex', v)
  await prune(docId)
  return id
}

export async function listVersions(docId: string): Promise<VersionSummary[]> {
  return (await idb.all<VersionSummary>('versionIndex')).filter(v => v.docId === docId).sort((a, b) => b.at - a.at)
}
export const getVersionSummary = (id: string) => idb.get<VersionSummary>('versionIndex', id)
/** The stored design of a version, for rendering it (Studio delivery, compare). */
export async function versionProject(id: string): Promise<StoredProject | null> {
  return (await idb.get<StoredVersion>('versions', id).catch(() => undefined))?.project ?? null
}

/** Give a version a name, or clear it with an empty string. */
export async function renameVersion(id: string, name: string) {
  const v = await getVersionSummary(id); if (!v) return
  const next = { ...v }; if (name.trim()) next.name = name.trim(); else delete next.name
  await idb.put('versionIndex', next)
}
/** Keep a version for good (an approved one), or let it go again. */
export async function keepVersion(id: string, keep: boolean) {
  const v = await getVersionSummary(id); if (!v) return
  await idb.put('versionIndex', { ...v, keep })
}

/**
 * Which versions to remove so at most `keep` remain. Automatic unnamed versions go first, then unnamed ones
 * saved by hand, oldest first. Named and kept (approved) versions are never removed, even past the limit.
 */
export function versionsToDrop(all: VersionSummary[], keep = KEEP): VersionSummary[] {
  if (all.length <= keep) return []
  const old = all.slice().sort((a, b) => a.at - b.at)
  const loose = (v: VersionSummary) => !v.name && !v.keep
  return [...old.filter(v => loose(v) && v.auto), ...old.filter(v => loose(v) && !v.auto)].slice(0, all.length - keep)
}

async function prune(docId: string) {
  for (const v of versionsToDrop(await listVersions(docId))) await deleteVersion(v.id)
}

/**
 * A short fingerprint of a stored design. The same design gives the same fingerprint, even after it was
 * closed and opened again (unchanged layers keep their PNG bytes); any change to a layer, the boards or the
 * pixels gives a different one.
 */
export async function fingerprint(p: StoredProject): Promise<string> {
  const layers = p.layers.map(l => { const { rev, ...rest } = l; return rest })
  const parts: BlobPart[] = [JSON.stringify({ doc: p.doc, layers, groups: p.groups ?? [] })]
  for (const k of Object.keys(p.blobs).sort()) { parts.push('\u0000' + k + '\u0000'); parts.push(p.blobs[k]) }
  const buf = await new Blob(parts).arrayBuffer()
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
  return Array.from(h.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('')
}

export async function deleteVersion(id: string) { await idb.del('versions', id); await idb.del('versionIndex', id) }

/** Restore a version into the open design. The current state is kept as a version first, so nothing is lost. */
export async function restoreVersion(id: string, asCopy = false) {
  const v = await idb.get<StoredVersion>('versions', id); if (!v) return false
  const ed = useEditor.getState()
  if (!asCopy) await saveVersion('Before restoring an older version', true)
  const { doc, layers } = await restoreStored(v.project)
  const d = asCopy ? { ...doc, id: 'd' + Date.now().toString(36), name: doc.name + ' (restored)' } : doc
  if (d.frames?.length) ed.loadFramed(d, layers, v.project.swatches, v.project.groups ?? [])
  else ed.loadProject(d, layers, v.project.swatches, v.project.groups ?? [])
  useEditor.setState({ dirty: true })
  await saveProject().catch(() => {})
  return true
}

// ─── Automatic versions ────────────────────────────────────────────

let lastVersionAt = Date.now()
let editsSince = 0
export function noteEdit() { editsSince++ }

export function startAutoVersions() {
  const t = setInterval(() => {
    const every = useUi.getState().versionEveryMin
    if (!every || editsSince < 3) return
    if (Date.now() - lastVersionAt < every * 60_000) return
    editsSince = 0
    saveVersion('Automatic', true).catch(() => {})
  }, 30_000)
  return () => clearInterval(t)
}

// ─── Session recovery ──────────────────────────────────────────────
// Each tab keeps a small marker in localStorage with the designs it has open, and holds a Web Lock for
// as long as it lives. A marker left behind by a tab whose lock is gone means that tab crashed or was
// killed (phones do this to background tabs), so the next visit offers to reopen its designs. Another
// tab that is simply still open holds its lock, so it is never mistaken for a crash.

const SESSIONS = 'vc-sessions'
export interface SessionMarker { open: { id: string; name: string }[]; active: string | null; clean: boolean; at: number }
const TAB = typeof window !== 'undefined' ? Math.random().toString(36).slice(2) : 'server'
const lockName = (tab: string) => 'vc-tab-' + tab
let lockHeld = false

function readAll(): Record<string, SessionMarker> { try { return JSON.parse(localStorage.getItem(SESSIONS) || '{}') } catch { return {} } }
function writeAll(all: Record<string, SessionMarker>) { try { localStorage.setItem(SESSIONS, JSON.stringify(all)) } catch { /* ignore */ } }

export function writeSession(open: { id: string; name: string }[], active: string | null) {
  if (!lockHeld && typeof navigator !== 'undefined' && (navigator as any).locks) {
    lockHeld = true
    ;(navigator as any).locks.request(lockName(TAB), () => new Promise(() => { /* held until the tab goes */ })).catch(() => {})
  }
  const all = readAll()
  if (!open.length) delete all[TAB]
  else all[TAB] = { open, active, clean: false, at: Date.now() }
  writeAll(all)
}
export function markSessionClean() { const all = readAll(); if (all[TAB]) { delete all[TAB]; writeAll(all) } }

/** Designs left open by tabs that are gone without closing. Resolves after checking which tabs are still alive. */
export async function readCrashedSession(): Promise<SessionMarker | null> {
  try { localStorage.removeItem('vc-session') } catch { /* the old single marker */ }
  const all = readAll()
  const others = Object.entries(all).filter(([k, m]) => k !== TAB && !m.clean && m.open.length)
  if (!others.length) return null
  const locks = (navigator as any).locks
  if (!locks?.query) return null
  const held = new Set(((await locks.query()).held ?? []).map((l: { name: string }) => l.name))
  const dead = others.filter(([k]) => !held.has(lockName(k)))
  if (!dead.length) return null
  const seen = new Set<string>(); const open: SessionMarker['open'] = []
  for (const [, m] of dead.sort((a, b) => b[1].at - a[1].at)) for (const t of m.open) if (!seen.has(t.id)) { seen.add(t.id); open.push(t) }
  const newest = dead[0][1]
  return { open, active: newest.active, clean: false, at: newest.at }
}
/** Forget markers of tabs that are gone (after the designer reopened or dismissed them). */
export async function clearSession() {
  const all = readAll(); const locks = (navigator as any).locks
  const held = locks?.query ? new Set(((await locks.query()).held ?? []).map((l: { name: string }) => l.name)) : null
  for (const k of Object.keys(all)) if (k !== TAB && (!held || !held.has(lockName(k)))) delete all[k]
  writeAll(all)
}
