// The desktop app's bridge (desktop/preload.js). Undefined in a browser.

export interface LibraryFile { path: string; name: string; size: number; modified: number; preview: string | null }

export interface DesktopBridge {
  info(): Promise<{ version: string; platform: string; library: string }>
  openDialog(): Promise<string[]>
  saveDialog(name: string): Promise<string | null>
  read(file: string): Promise<{ name: string; bytes: ArrayBuffer }>
  write(file: string, bytes: ArrayBuffer | Uint8Array): Promise<boolean>
  exists(file: string): Promise<boolean>
  uniqueInLibrary(name: string): Promise<string>
  reveal(file?: string): Promise<void>
  library: { list(): Promise<{ dir: string; files: LibraryFile[] }>; choose(): Promise<string | null>; onChange(cb: () => void): () => void }
  pathForFile(file: File): string | null
  grantDrop(file: string): Promise<boolean>
  takePending(): Promise<string[]>
  onOpenFiles(cb: (files: string[]) => void): () => void
  onMenu(cb: (cmd: string) => void): () => void
  nativeEdit(cmd: 'undo' | 'redo' | 'cut' | 'copy' | 'selectAll'): void
  onFlush(cb: () => Promise<void> | void): () => void
  onUpdate(cb: (u: { state: 'ready'; version: string }) => void): () => void
}

export const desktop: DesktopBridge | undefined = typeof window !== 'undefined' ? (window as any).voidDesktop : undefined
export const isDesktop = () => !!desktop

export const baseName = (file: string) => file.split(/[\\/]/).pop() || file
