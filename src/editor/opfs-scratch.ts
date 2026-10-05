export interface ScratchEstimate { usage: number; quota: number; persisted: boolean | null }

const rootName = 'voidcanvas-scratch'

async function rootDir(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null
  const origin = await navigator.storage.getDirectory()
  return origin.getDirectoryHandle(rootName, { create: true })
}

async function nested(root: FileSystemDirectoryHandle, parts: string[], create = true) {
  let dir = root
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create })
  return dir
}

/** Local, origin-private scratch space for tiles/history. Failure always falls back to RAM in callers. */
export class ScratchStore {
  constructor(public projectId: string) {}

  private async project(create = true) {
    const root = await rootDir(); if (!root) return null
    return nested(root, ['projects', this.projectId], create)
  }

  async write(bucket: 'tiles' | 'history' | 'composites' | 'previews', key: string, data: Blob | ArrayBuffer | Uint8Array) {
    const p = await this.project(true); if (!p) return false
    const dir = await p.getDirectoryHandle(bucket, { create: true })
    const file = await dir.getFileHandle(encodeURIComponent(key), { create: true })
    const writer = await file.createWritable()
    if (data instanceof Blob || data instanceof ArrayBuffer) await writer.write(data)
    else {
      const copy = new Uint8Array(data.byteLength); copy.set(data)
      await writer.write(copy.buffer)
    }
    await writer.close(); return true
  }

  async read(bucket: 'tiles' | 'history' | 'composites' | 'previews', key: string): Promise<ArrayBuffer | null> {
    try {
      const p = await this.project(false); if (!p) return null
      const dir = await p.getDirectoryHandle(bucket, { create: false })
      const handle = await dir.getFileHandle(encodeURIComponent(key), { create: false })
      return (await handle.getFile()).arrayBuffer()
    } catch { return null }
  }

  async remove(bucket: 'tiles' | 'history' | 'composites' | 'previews', key: string) {
    try {
      const p = await this.project(false); if (!p) return false
      const dir = await p.getDirectoryHandle(bucket, { create: false })
      await dir.removeEntry(encodeURIComponent(key)); return true
    } catch { return false }
  }

  async clearProject() {
    try {
      const root = await rootDir(); if (!root) return false
      const projects = await root.getDirectoryHandle('projects', { create: false })
      await projects.removeEntry(this.projectId, { recursive: true }); return true
    } catch { return false }
  }
}

export async function scratchEstimate(): Promise<ScratchEstimate> {
  if (typeof navigator === 'undefined' || !navigator.storage) return { usage: 0, quota: 0, persisted: null }
  const est = await navigator.storage.estimate().catch(() => ({ usage: 0, quota: 0 }))
  const persisted = navigator.storage.persisted ? await navigator.storage.persisted().catch(() => null) : null
  return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted }
}

/** Ask the browser to protect local project/scratch data from routine eviction when supported. */
export async function requestPersistentScratch() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  return navigator.storage.persist().catch(() => false)
}
