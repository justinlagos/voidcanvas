import { idb, isPrivate, restoreStored, saveProject, storeDesign, type StoredProject } from './io'
import { useEditor } from './store'
import { useUi } from './ui-store'

// Version history and crash recovery. Versions are full copies of a design kept on this device:
// saved by hand, every few minutes while you work, before risky operations and on export.

export interface VersionSummary { id: string; docId: string; at: number; label: string; auto: boolean; thumb: string; width: number; height: number }
interface StoredVersion { id: string; project: StoredProject }

const KEEP = 30

export async function saveVersion(label: string, auto = false): Promise<boolean> {
  const { doc, layers, groups, swatches } = useEditor.getState()
  if (!doc || isPrivate()) return false
  const { stored, summary } = await storeDesign(doc, layers, groups, swatches)
  const id = `${doc.id}:${Date.now()}`
  await idb.put('versions', { id, project: stored } as StoredVersion)
  await idb.put('versionIndex', { id, docId: doc.id, at: Date.now(), label, auto, thumb: summary.thumb, width: doc.width, height: doc.height } as VersionSummary)
  await prune(doc.id)
  lastVersionAt = Date.now()
  return true
}

export async function listVersions(docId: string): Promise<VersionSummary[]> {
  return (await idb.all<VersionSummary>('versionIndex')).filter(v => v.docId === docId).sort((a, b) => b.at - a.at)
}

async function prune(docId: string) {
  const all = await listVersions(docId)
  if (all.length <= KEEP) return
  // Drop the oldest automatic versions first; versions you saved by hand go last.
  const drop = [...all.filter(v => v.auto).reverse(), ...all.filter(v => !v.auto).reverse()].slice(0, all.length - KEEP)
  for (const v of drop) await deleteVersion(v.id)
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
