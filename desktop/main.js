// Voidcanvas desktop. The whole web app is bundled in ./app (a static export) and served offline from
// app://voidcanvas/. The main process adds what a browser cannot: real files, a library folder,
// file associations, and updates.

const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, shell, session } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { readPreview } = require('./zip-preview')

const SCHEME = 'app'
const HOST = 'voidcanvas'
const ORIGIN = `${SCHEME}://${HOST}`
const APP_DIR = path.join(__dirname, 'app')
const OPENABLE = /\.(void|psd|pdf|png|jpe?g|webp|gif|avif|bmp)$/i
const isMac = process.platform === 'darwin'

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
])

// ─── Settings (library folder, window size) ───────────────────────

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json')
let settings = {}
let loaded = false
function loadSettings() { try { settings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) } catch { settings = {} } loaded = true }
function saveSettings() { if (!loaded) return; try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)) } catch { /* ignore */ } }

function libraryDir() {
  const dir = settings.library || path.join(app.getPath('documents'), 'Voidcanvas')
  try { fs.mkdirSync(dir, { recursive: true }) } catch { /* reported when used */ }
  return dir
}

// ─── Serving the bundled app ──────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.xml': 'application/xml',
}

async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath).replace(/\/+$/, '') || '/index'
  const base = path.normalize(path.join(APP_DIR, p))
  if (!base.startsWith(APP_DIR)) return null
  for (const f of [base, base + '.html', path.join(base, 'index.html')]) {
    try { if ((await fsp.stat(f)).isFile()) return f } catch { /* next */ }
  }
  return null
}

function serveApp() {
  protocol.handle(SCHEME, async req => {
    const u = new URL(req.url)
    if (u.host !== HOST) return new Response('Not found', { status: 404 })
    const file = (await resolveFile(u.pathname)) ?? path.join(APP_DIR, '404.html')
    const body = await fsp.readFile(file)
    return new Response(body, { status: file.endsWith('404.html') && u.pathname !== '/404' ? 404 : 200, headers: { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' } })
  })
}

// ─── Window ───────────────────────────────────────────────────────

let win = null
let pending = []

function createWindow() {
  const b = settings.bounds ?? { width: 1440, height: 900 }
  win = new BrowserWindow({
    ...b, minWidth: 900, minHeight: 600, show: false,
    backgroundColor: '#0b0b0f', title: 'Voidcanvas',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  })
  if (settings.maximized) win.maximize()
  win.once('ready-to-show', () => win.show())
  const remember = () => { if (!win || win.isDestroyed()) return; settings.maximized = win.isMaximized(); if (!settings.maximized && !win.isMinimized()) settings.bounds = win.getBounds(); saveSettings() }
  win.on('resize', remember); win.on('move', remember)

  // Links to other sites open in the person's browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (!url.startsWith(ORIGIN)) shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) { e.preventDefault(); shell.openExternal(url) } })

  win.on('close', e => { if (!quitting) { e.preventDefault(); flushThenQuit() } })
  win.loadURL(`${ORIGIN}/editor`)
}

// Before closing, ask the page to save, then quit. Never wait longer than a few seconds.
let quitting = false
async function flushThenQuit() {
  if (quitting) return
  quitting = true
  try {
    if (win && !win.isDestroyed()) {
      await Promise.race([
        new Promise(res => { ipcMain.once('vc:flushed', res); win.webContents.send('vc:flush') }),
        new Promise(res => setTimeout(res, 4000)),
      ])
    }
  } finally { app.quit() }
}

// ─── Files from the operating system ──────────────────────────────

function queueFiles(paths) {
  const files = paths.filter(p => OPENABLE.test(p) && fs.existsSync(p))
  if (!files.length) return
  grant(...files)
  if (win && !win.isDestroyed() && win.webContents.getURL().startsWith(`${ORIGIN}/editor`) && !win.webContents.isLoading()) {
    win.webContents.send('vc:open-files', files)
  } else {
    pending.push(...files)
    if (win && !win.isDestroyed() && !win.webContents.getURL().startsWith(`${ORIGIN}/editor`)) win.loadURL(`${ORIGIN}/editor`)
  }
  if (win) { if (win.isMinimized()) win.restore(); win.focus() }
}
const argFiles = argv => argv.slice(app.isPackaged ? 1 : 2).filter(a => !a.startsWith('-'))

if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', (_e, argv) => queueFiles(argFiles(argv)))
app.on('open-file', (e, p) => { e.preventDefault(); queueFiles([p]) })

// ─── IPC: what the page may ask for ───────────────────────────────
// The page may only read and write files the person chose (in a dialog, by opening them from the
// operating system, or by saving them) and files inside the library folder. Remembered across launches.

const granted = new Set()
function grant(...files) {
  for (const f of files) if (f) granted.add(path.resolve(f))
  if (loaded) { settings.granted = Array.from(granted).slice(-500); saveSettings() }
}
function allowed(file) {
  if (typeof file !== 'string' || !file) return false
  const f = path.resolve(file)
  const lib = path.resolve(libraryDir()) + path.sep
  return granted.has(f) || (f.startsWith(lib) && !f.slice(lib.length).includes(path.sep))
}
const guard = file => { if (!allowed(file)) throw new Error('Voidcanvas does not have access to that file.') }


const toBuffer = b => Buffer.from(b instanceof ArrayBuffer ? new Uint8Array(b) : b)

async function writeAtomic(file, bytes) {
  const tmp = `${file}.${process.pid}.tmp`
  await fsp.writeFile(tmp, toBuffer(bytes))
  await fsp.rename(tmp, file)
}

async function uniquePath(dir, name) {
  const ext = path.extname(name), stem = name.slice(0, name.length - ext.length)
  for (let i = 0; ; i++) {
    const p = path.join(dir, i ? `${stem} ${i + 1}${ext}` : name)
    try { await fsp.access(p) } catch { return p }
  }
}

function registerIpc() {
  ipcMain.handle('vc:info', () => ({ version: app.getVersion(), platform: process.platform, library: libraryDir() }))
  ipcMain.handle('vc:take-pending', () => { const f = pending; pending = []; return f })

  ipcMain.handle('vc:open-dialog', async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'], defaultPath: libraryDir(),
      filters: [{ name: 'Designs and images', extensions: ['void', 'psd', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp'] }],
    })
    if (r.canceled) return []
    grant(...r.filePaths); return r.filePaths
  })
  ipcMain.handle('vc:save-dialog', async (_e, name) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(libraryDir(), name), filters: [{ name: 'Voidcanvas design', extensions: ['void'] }] })
    if (r.canceled || !r.filePath) return null
    grant(r.filePath); return r.filePath
  })
  ipcMain.handle('vc:read', async (_e, file) => {
    guard(file)
    const buf = await fsp.readFile(file)
    return { name: path.basename(file), bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
  })
  ipcMain.handle('vc:write', async (_e, file, bytes) => { guard(file); await writeAtomic(file, bytes); return true })
  ipcMain.handle('vc:exists', async (_e, file) => { if (!allowed(file)) return false; try { await fsp.access(file); return true } catch { return false } })
  // A .void dragged onto the window: allow saving back to it. Only existing .void files qualify.
  ipcMain.handle('vc:grant-drop', async (_e, file) => {
    if (typeof file !== 'string' || !/\.void$/i.test(file)) return false
    try { if (!(await fsp.stat(file)).isFile()) return false } catch { return false }
    grant(file); return true
  })
  ipcMain.handle('vc:unique-in-library', (_e, name) => uniquePath(libraryDir(), name))
  ipcMain.handle('vc:reveal', (_e, file) => { if (file && allowed(file)) shell.showItemInFolder(file); else shell.openPath(libraryDir()) })

  ipcMain.handle('vc:library-list', async () => {
    const dir = libraryDir()
    let names = []
    try { names = await fsp.readdir(dir) } catch { return { dir, files: [] } }
    const files = []
    for (const n of names) {
      if (!/\.void$/i.test(n) || n.startsWith('.')) continue
      const p = path.join(dir, n)
      try {
        const st = await fsp.stat(p)
        files.push({ path: p, name: n.replace(/\.void$/i, ''), size: st.size, modified: st.mtimeMs, preview: await readPreview(p).catch(() => null) })
      } catch { /* skip */ }
    }
    files.sort((a, b) => b.modified - a.modified)
    return { dir, files }
  })
  ipcMain.handle('vc:library-choose', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], defaultPath: libraryDir(), title: 'Choose your Voidcanvas folder' })
    if (r.canceled || !r.filePaths[0]) return null
    settings.library = r.filePaths[0]; saveSettings(); watchLibrary(); win?.webContents.send('vc:library-changed')
    return settings.library
  })

  // Editing commands that must reach text fields natively (macOS menu).
  ipcMain.on('vc:native-edit', (_e, cmd) => { if (win && ['undo', 'redo', 'cut', 'copy', 'selectAll'].includes(cmd)) win.webContents[cmd]() })
}

// Tell the page when files in the library folder change (for example, synced in by Dropbox).
let watcher = null
function watchLibrary() {
  try { watcher?.close() } catch { /* ignore */ }
  let t = null
  try {
    watcher = fs.watch(libraryDir(), () => { clearTimeout(t); t = setTimeout(() => win?.webContents.send('vc:library-changed'), 400) })
  } catch { watcher = null }
}

// ─── Menu ─────────────────────────────────────────────────────────
// Windows and Linux: no native menu; the app has its own. macOS needs one, and its editing items are routed
// through the page so the canvas keeps its own shortcuts while text fields still copy and paste.

function buildMenu() {
  if (!isMac) { Menu.setApplicationMenu(null); return }
  const page = cmd => () => win?.webContents.send('vc:menu', cmd)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { label: 'File', submenu: [
      { label: 'Open…', accelerator: 'Cmd+O', registerAccelerator: false, click: page('open') },
      { label: 'Save', accelerator: 'Cmd+S', registerAccelerator: false, click: page('save') },
      { label: 'Save to Disk…', accelerator: 'Shift+Cmd+S', registerAccelerator: false, click: page('saveDisk') },
      { type: 'separator' },
      { label: 'Show Voidcanvas Folder', click: () => shell.openPath(libraryDir()) },
      { type: 'separator' },
      { role: 'close' },
    ] },
    { label: 'Edit', submenu: [
      { label: 'Undo', accelerator: 'Cmd+Z', click: page('undo') },
      { label: 'Redo', accelerator: 'Shift+Cmd+Z', click: page('redo') },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Cmd+X', click: page('cut') },
      { label: 'Copy', accelerator: 'Cmd+C', click: page('copy') },
      { role: 'paste' },
      { label: 'Select All', accelerator: 'Cmd+A', click: page('selectAll') },
    ] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }, { role: 'reload' }])] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [
      { label: 'Learn Voidcanvas', click: () => win?.loadURL(`${ORIGIN}/learn`) },
      { label: 'Report a Bug', click: () => win?.loadURL(`${ORIGIN}/report-a-bug`) },
      { label: 'Check for Updates', click: () => checkForUpdates(true) },
    ] },
  ]))
}

// ─── Updates ──────────────────────────────────────────────────────
// From GitHub Releases. Downloads quietly and installs when Voidcanvas quits. macOS updates need a signed build.

let updater = null
function checkForUpdates(manual = false) {
  if (!app.isPackaged) { if (manual) dialog.showMessageBox(win, { message: 'Updates are checked in the installed app only.' }); return }
  try {
    if (!updater) {
      updater = require('electron-updater').autoUpdater
      updater.autoDownload = true
      updater.on('update-downloaded', info => win?.webContents.send('vc:update', { state: 'ready', version: info.version }))
      updater.on('update-not-available', () => { if (manual) dialog.showMessageBox(win, { message: `You have the latest version (${app.getVersion()}).` }) })
      updater.on('error', () => { if (manual) dialog.showMessageBox(win, { message: 'Could not check for updates. Try again later.' }) })
    }
    updater.checkForUpdates().catch(() => {})
  } catch { /* updater unavailable */ }
}

// ─── Start ────────────────────────────────────────────────────────

app.whenReady().then(() => {
  loadSettings()
  // Allow what the editor uses; refuse everything else.
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'local-fonts', 'fileSystem'].includes(perm)))
  serveApp(); registerIpc(); buildMenu()
  for (const f of settings.granted ?? []) granted.add(f)
  grant()
  const launch = argFiles(process.argv).filter(p => OPENABLE.test(p)); grant(...launch); pending.push(...launch)
  createWindow(); watchLibrary()
  setTimeout(() => checkForUpdates(false), 8000)
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) { quitting = false; createWindow() } })
})
app.on('before-quit', e => { if (!quitting) { e.preventDefault(); flushThenQuit() } })
app.on('window-all-closed', () => app.quit())
