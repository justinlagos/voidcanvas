// ─── Files on disk ─────────────────────────────────────────────────
// Save a design as a real file and keep it linked, so Ctrl+S updates that file as well as the copy
// kept by the app. Three ways to reach the disk:
//   - Desktop app: native dialogs and file paths (desktop/preload.js). Every saved design gets a file,
//     in the Voidcanvas folder unless the person chose somewhere else.
//   - Chromium browsers: the File System Access API, with file handles.
//   - Everything else: Save to disk downloads a .void file.
//
// A link is remembered per design, on this device only. In a private session it lasts until the tab closes,
// and the desktop app writes nothing to the Voidcanvas folder on its own.

import { baseName, desktop } from '@/lib/desktop'
import { buildVoidFile, buildVoidPng, downloadBlob, idb, importFiles, isPrivate, openVoidBytes, saveProject } from './io'
import { useEditor } from './store'
import { VOID_MIME } from './voidfile'

type Handle = FileSystemFileHandle & {
  queryPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>
}
type Target = { handle: Handle; path?: undefined; name: string } | { path: string; handle?: undefined; name: string }
interface StoredLink { id: string; handle?: Handle; path?: string; name: string }

const mem = new Map<string, Target>()

const hasPickers = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window
export const canUseDisk = () => !!desktop || hasPickers()

const isVoidPng = (name: string) => /\.void\.png$/i.test(name)
const isVoid = (name: string) => /\.void$/i.test(name) || isVoidPng(name)
const notify = (m: string) => useEditor.getState().notify(m)

async function getLink(docId: string): Promise<Target | null> {
  if (mem.has(docId)) return mem.get(docId)!
  if (isPrivate()) return null
  try {
    const r = await idb.get<StoredLink>('handles', docId)
    const t: Target | null = r?.path && desktop ? { path: r.path, name: r.name } : r?.handle ? { handle: r.handle, name: r.name } : null
    if (t) mem.set(docId, t)
    return t
  } catch { return null }
}

async function setLink(docId: string, t: Target) {
  mem.set(docId, t)
  if (!isPrivate()) await idb.put('handles', { id: docId, name: t.name, ...(t.path ? { path: t.path } : { handle: t.handle }) } as StoredLink).catch(() => {})
}

/** The file the design is linked to, if any: its name, and its full path in the desktop app. */
export async function linkedFile(docId: string): Promise<{ name: string; path?: string } | null> {
  const t = await getLink(docId)
  return t ? { name: t.name, path: t.path } : null
}

export async function unlinkFile(docId: string) { mem.delete(docId); await idb.del('handles', docId).catch(() => {}) }

async function canWrite(t: Target): Promise<boolean> {
  if (t.path) return true
  const o = { mode: 'readwrite' as const }
  try {
    if ((await t.handle!.queryPermission?.(o)) === 'granted') return true
    return (await t.handle!.requestPermission?.(o)) === 'granted'
  } catch { return false }
}

async function write(t: Target, blob: Blob) {
  if (t.path) { await desktop!.write(t.path, await blob.arrayBuffer()); return }
  const w = await t.handle!.createWritable()
  await w.write(blob)
  await w.close()
}

const fileFor = (name: string) => (isVoidPng(name) ? buildVoidPng() : buildVoidFile())
const aborted = (e: unknown) => (e as DOMException)?.name === 'AbortError'

/** Save to disk…: choose where, write the file, and link the design to it. Downloads where the browser cannot. */
export async function saveToDiskAs(): Promise<boolean> {
  const doc = useEditor.getState().doc; if (!doc) return false
  import('@/lib/analytics').then(m => m.track('export', { format: 'void', disk: canUseDisk() })).catch(() => {})
  const f = await buildVoidFile(); if (!f) return false

  let t: Target
  if (desktop) {
    const p = await desktop.saveDialog(f.name); if (!p) return false
    t = { path: p, name: baseName(p) }
  } else if (hasPickers()) {
    try {
      const h: Handle = await (window as any).showSaveFilePicker({
        suggestedName: f.name, id: 'voidcanvas-designs',
        types: [{ description: 'Voidcanvas design', accept: { [VOID_MIME]: ['.void'] } }],
      })
      t = { handle: h, name: h.name }
    } catch (e) { if (!aborted(e)) notify('Could not open the save window.'); return false }
  } else {
    downloadBlob(f.blob, f.name)
    notify(`Downloaded ${f.name}. Open it any time with File, Open.`)
    return true
  }

  try { await write(t, isVoidPng(t.name) ? (await buildVoidPng())!.blob : f.blob) } catch { notify(`Could not write ${t.name}. Check the folder is not read-only.`); return false }
  await setLink(doc.id, t)
  notify(`Saved to ${t.name}. Ctrl+S now updates this file too.`)
  return true
}

/**
 * Write the design to its linked file. In the desktop app, a design with no file yet gets one in the
 * Voidcanvas folder (except in a private session). Returns the file name, or null when nothing was written.
 */
export async function saveLinked(opts: { quiet?: boolean } = {}): Promise<string | null> {
  const doc = useEditor.getState().doc; if (!doc) return null
  let t = await getLink(doc.id)
  if (!t && desktop && !isPrivate()) {
    const f = await buildVoidFile(); if (!f) return null
    try {
      const p = await desktop.uniqueInLibrary(f.name)
      t = { path: p, name: baseName(p) }
      await write(t, f.blob)
      await setLink(doc.id, t)
      return t.name
    } catch { if (!opts.quiet) notify('Saved in the app, but the Voidcanvas folder could not be written. Choose another folder on the start screen.'); return null }
  }
  if (!t) return null
  if (!(await canWrite(t))) { if (!opts.quiet) notify(`Saved in this browser. Allow access to update ${t.name}, or use Save to disk.`); return null }
  const f = await fileFor(t.name); if (!f) return null
  try { await write(t, f.blob); return t.name } catch {
    if (!opts.quiet) notify(`Saved, but ${t.name} could not be updated. It may have been moved or deleted. Use Save to disk to choose a new place.`)
    await unlinkFile(doc.id)
    return null
  }
}

/** Open… with the system file window. A .void opened this way stays linked. Returns false where there is no file window, so the caller can fall back. */
export async function openFromDisk(): Promise<boolean> {
  if (desktop) { await openPaths(await desktop.openDialog()); return true }
  if (!hasPickers()) return false
  let hs: Handle[]
  try {
    hs = await (window as any).showOpenFilePicker({
      multiple: true, id: 'voidcanvas-designs',
      types: [{
        description: 'Designs and images',
        accept: {
          [VOID_MIME]: ['.void'],
          'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp'],
          'image/vnd.adobe.photoshop': ['.psd'],
          'application/pdf': ['.pdf'],
        },
      }],
    })
  } catch (e) { if (aborted(e)) return true; return false }
  const voidHandle = hs.find(h => isVoid(h.name))
  if (voidHandle) { await openLinked(voidHandle); return true }
  importFiles(await Promise.all(hs.map(h => h.getFile())))
  return true
}

/** Open a .void from a handle and link the new design to it. Also used for files dropped onto the app. */
export async function openLinked(h: Handle): Promise<string | null> {
  const file = await h.getFile()
  import('@/lib/analytics').then(m => m.track('doc.import', { kind: 'void', count: 1 })).catch(() => {})
  const id = await openVoidBytes(new Uint8Array(await file.arrayBuffer()))
  if (id) await setLink(id, { handle: h, name: h.name })
  return id
}

/** Desktop: open files by path (from the file window, the operating system, or the Voidcanvas folder). */
export async function openPaths(paths: string[]): Promise<void> {
  if (!desktop || !paths.length) return
  const others: File[] = []
  for (const p of paths) {
    try {
      const { name, bytes } = await desktop.read(p)
      if (isVoid(name)) {
        import('@/lib/analytics').then(m => m.track('doc.import', { kind: 'void', count: 1 })).catch(() => {})
        const id = await openVoidBytes(new Uint8Array(bytes))
        if (id) await setLink(id, { path: p, name })
      } else others.push(new File([bytes], name, { type: mimeFor(name) }))
    } catch { notify(`Could not open ${baseName(p)}. It may have been moved or deleted.`) }
  }
  if (others.length) importFiles(others)
}

/** Files dropped onto the app. In the desktop app a dropped .void stays linked to its file. */
export async function openDropped(files: File[]): Promise<void> {
  const others: File[] = []
  for (const f of files) {
    if (!isVoid(f.name)) { others.push(f); continue }
    const id = await openVoidBytes(new Uint8Array(await f.arrayBuffer()))
    const p = desktop?.pathForFile(f)
    if (id && p && (await desktop!.grantDrop(p))) await setLink(id, { path: p, name: f.name })
  }
  if (others.length) importFiles(others)
}

const mimeFor = (name: string) => {
  const ext = name.toLowerCase().split('.').pop() || ''
  return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp', pdf: 'application/pdf', psd: 'image/vnd.adobe.photoshop' } as Record<string, string>)[ext] ?? ''
}

/** Save (Ctrl+S): the copy kept by the app, then the linked file if there is one. */
export async function saveNow(): Promise<void> {
  try { await saveProject() } catch (e) { notify((e as Error).message || 'Could not save.'); return }
  const name = await saveLinked()
  notify(name ? (desktop ? `Saved to ${name}.` : `Saved to this device and to ${name}.`) : 'Saved to this device.')
}

/** Desktop, before quitting or every so often: save without messages. */
export async function saveQuietly(): Promise<void> {
  if (!useEditor.getState().doc || isPrivate()) return
  await saveProject().catch(() => {})
  await saveLinked({ quiet: true }).catch(() => {})
}
