// The only bridge between the page and the computer. Keep it small: every call here is something
// the page can do to the person's files. Typed on the page side in src/lib/desktop.ts.

const { contextBridge, ipcRenderer, webUtils } = require('electron')

const on = (channel, cb) => {
  const h = (_e, ...args) => cb(...args)
  ipcRenderer.on(channel, h)
  return () => ipcRenderer.removeListener(channel, h)
}

contextBridge.exposeInMainWorld('voidDesktop', {
  info: () => ipcRenderer.invoke('vc:info'),
  openDialog: () => ipcRenderer.invoke('vc:open-dialog'),
  saveDialog: name => ipcRenderer.invoke('vc:save-dialog', name),
  read: file => ipcRenderer.invoke('vc:read', file),
  write: (file, bytes) => ipcRenderer.invoke('vc:write', file, bytes),
  exists: file => ipcRenderer.invoke('vc:exists', file),
  uniqueInLibrary: name => ipcRenderer.invoke('vc:unique-in-library', name),
  reveal: file => ipcRenderer.invoke('vc:reveal', file),
  library: {
    list: () => ipcRenderer.invoke('vc:library-list'),
    choose: () => ipcRenderer.invoke('vc:library-choose'),
    onChange: cb => on('vc:library-changed', cb),
  },
  grantDrop: file => ipcRenderer.invoke('vc:grant-drop', file),
  pathForFile: file => { try { return webUtils.getPathForFile(file) || null } catch { return null } },
  takePending: () => ipcRenderer.invoke('vc:take-pending'),
  onOpenFiles: cb => on('vc:open-files', cb),
  onMenu: cb => on('vc:menu', cb),
  nativeEdit: cmd => ipcRenderer.send('vc:native-edit', cmd),
  onFlush: cb => on('vc:flush', async () => { try { await cb() } finally { ipcRenderer.send('vc:flushed') } }),
  onUpdate: cb => on('vc:update', cb),
})
