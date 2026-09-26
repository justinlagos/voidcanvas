// ─── Files on disk ─────────────────────────────────────────────────
// Save a design as a real file and keep it linked, so Ctrl+S updates that file as well as the copy
// in this browser. Uses the File System Access API (Chrome, Edge, Opera, Arc and other Chromium
// browsers on desktop). Everywhere else, Save to disk downloads a .void file instead.
//
// A link is remembered per design, on this device only. In a private session it lasts until the tab closes.

import { buildVoidFile, buildVoidPng, downloadBlob, idb, importFiles, isPrivate, openVoidBytes, saveProject } from './io'
import { useEditor } from './store'
import { VOID_MIME } from './voidfile'

type Handle = FileSystemFileHandle & {
  queryPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>
}
interface StoredHandle { id: string; handle: Handle; name: string }

const mem = new Map<string, Handle>()

export const canUseDisk = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window

const isVoidPng = (name: string) => /\.void\.png$/i.test(name)
const isVoid = (name: string) => /\.void$/i.test(name) || isVoidPng(name)

async function getHandle(docId: string): Promise<Handle | null> {
  if (mem.has(docId)) return mem.get(docId)!
  if (isPrivate()) return null
  try { const r = await idb.get<StoredHandle>('handles', docId); if (r?.handle) { mem.set(docId, r.handle); return r.handle } } catch { /* ignore */ }
  return null
}

async function setHandle(docId: string, h: Handle) {
  mem.set(docId, h)
  if (!isPrivate()) await idb.put('handles', { id: docId, handle: h, name: h.name } as StoredHandle).catch(() => {})
}

/** The file the open design is linked to, if any. */
export async function linkedFile(docId: string): Promise<string | null> { return (await getHandle(docId))?.name ?? null }

export async function unlinkFile(docId: string) { mem.delete(docId); await idb.del('handles', docId).catch(() => {}) }

async function canWrite(h: Handle): Promise<boolean> {
  const o = { mode: 'readwrite' as const }
  try {
    if ((await h.queryPermission?.(o)) === 'granted') return true
    return (await h.requestPermission?.(o)) === 'granted'
  } catch { return false }
}

async function write(h: Handle, blob: Blob) {
  const w = await h.createWritable()
  await w.write(blob)
  await w.close()
}

const fileFor = (name: string) => (isVoidPng(name) ? buildVoidPng() : buildVoidFile())

const aborted = (e: unknown) => (e as DOMException)?.name === 'AbortError'

/** Save to disk…: choose where, write the file, and link the design to it. Downloads where the browser cannot. */
export async function saveToDiskAs(): Promise<boolean> {
  const ed = useEditor.getState()
  const doc = ed.doc; if (!doc) return false
  import('@/lib/analytics').then(m => m.track('export', { format: 'void', disk: canUseDisk() })).catch(() => {})
  const f = await buildVoidFile(); if (!f) return false
  if (!canUseDisk()) {
    downloadBlob(f.blob, f.name)
    ed.notify(`Downloaded ${f.name}. Open it any time with File, Open.`)
    return true
  }
  let h: Handle
  try {
    h = await (window as any).showSaveFilePicker({
      suggestedName: f.name, id: 'voidcanvas-designs',
      types: [{ description: 'Voidcanvas design', accept: { [VOID_MIME]: ['.void'] } }],
    })
  } catch (e) { if (aborted(e)) return false; ed.notify('Could not open the save window.'); return false }
  try {
    await write(h, isVoidPng(h.name) ? (await buildVoidPng())!.blob : f.blob)
  } catch { ed.notify(`Could not write ${h.name}. Check the folder is not read-only.`); return false }
  await setHandle(doc.id, h)
  ed.notify(`Saved to ${h.name}. Ctrl+S now updates this file too.`)
  return true
}

/** Called by Save (Ctrl+S). If the design is linked to a file, write it. Returns the file name, or null. */
export async function saveLinked(): Promise<string | null> {
  const doc = useEditor.getState().doc; if (!doc) return null
  const h = await getHandle(doc.id); if (!h) return null
  if (!(await canWrite(h))) { useEditor.getState().notify(`Saved in this browser. Allow access to update ${h.name}, or use Save to disk.`); return null }
  const f = await fileFor(h.name); if (!f) return null
  try { await write(h, f.blob); return h.name } catch {
    useEditor.getState().notify(`Saved in this browser, but ${h.name} could not be updated. It may have been moved or deleted. Use Save to disk to choose a new place.`)
    await unlinkFile(doc.id)
    return null
  }
}

/** Open… with the system file window. A .void opened this way stays linked. Returns false where the browser has no file window, so the caller can fall back. */
export async function openFromDisk(): Promise<boolean> {
  if (!canUseDisk()) return false
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
  if (id) await setHandle(id, h)
  return id
}

/** Save (Ctrl+S): the copy in this browser, then the linked file if there is one. */
export async function saveNow(): Promise<void> {
  try { await saveProject() } catch (e) { useEditor.getState().notify((e as Error).message || 'Could not save.'); return }
  const name = await saveLinked()
  useEditor.getState().notify(name ? `Saved to this device and to ${name}.` : 'Saved to this device.')
}
