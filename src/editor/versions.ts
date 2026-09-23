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
// A small marker in localStorage records the open designs. It is marked clean when the tab closes normally;
// if the next visit finds it unclean, the browser or tab crashed and we offer to reopen the work.

const SESSION = 'vc-session'
export interface SessionMarker { open: { id: string; name: string }[]; active: string | null; clean: boolean; at: number }

export function writeSession(open: { id: string; name: string }[], active: string | null) {
  try { localStorage.setItem(SESSION, JSON.stringify({ open, active, clean: false, at: Date.now() } as SessionMarker)) } catch { /* ignore */ }
}
export function markSessionClean() {
  try { const raw = localStorage.getItem(SESSION); if (!raw) return; const m = JSON.parse(raw) as SessionMarker; m.clean = true; localStorage.setItem(SESSION, JSON.stringify(m)) } catch { /* ignore */ }
}
export function readCrashedSession(): SessionMarker | null {
  try { const raw = localStorage.getItem(SESSION); if (!raw) return null; const m = JSON.parse(raw) as SessionMarker; return !m.clean && m.open.length ? m : null } catch { return null }
}
export function clearSession() { try { localStorage.removeItem(SESSION) } catch { /* ignore */ } }

/** Read once when the app loads, before this session writes its own marker. */
export const crashedAtStart: SessionMarker | null = typeof window !== 'undefined' ? readCrashedSession() : null
