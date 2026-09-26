// Desktop app: offline app serving, opening files from the OS, the Voidcanvas folder, Ctrl+S to real files,
// saving on quit, and the file-access guard. Needs `npm run build:desktop` first. On Linux run under xvfb-run.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'

const out = []; const ok = (n, c, i = '') => { const l = `${c ? 'PASS' : 'FAIL'} ${n} ${i}`; console.log(l); out.push(l); if (!c) process.exitCode = 1 }
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-desktop-'))
let lib = ''
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DOCUMENTS_DIR: path.join(home, 'Documents') }
fs.mkdirSync(path.join(home, 'Documents'), { recursive: true })
const executablePath = path.resolve('desktop/node_modules/electron/dist/electron')
const launch = (args = []) => electron.launch({ executablePath, args: [path.resolve('desktop'), ...args], env })
const errors = []

// 1. First launch with a photo passed on the command line, as the OS does for "Open with".
let app = await launch([FIX.logo])
let p = await app.firstWindow(); p.on('pageerror', e => errors.push(e.message))
await p.waitForLoadState('domcontentloaded'); await p.waitForTimeout(3500)
ok('serves the app offline from app://', p.url().startsWith('app://voidcanvas/editor'), p.url())
ok('bridge is exposed', await p.evaluate(() => !!window.voidDesktop))
lib = (await p.evaluate(() => window.voidDesktop.info())).library
ok('no service worker', await p.evaluate(async () => { try { return !(await navigator.serviceWorker?.getRegistration?.()) } catch { return true } }))
const opened = await p.evaluate(() => window.__voidEditor.getState().layers.length)
ok('opens a file passed at launch', opened === 1, String(opened))

// 2. Ctrl+S on a design with no file: saved into the Voidcanvas folder.
await p.keyboard.press('t'); await p.mouse.click(600, 450); await p.waitForTimeout(300); await p.keyboard.type('Desktop'); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
await p.keyboard.press('Control+s'); await p.waitForTimeout(1500)
let files = fs.existsSync(lib) ? fs.readdirSync(lib).filter(f => f.endsWith('.void')) : []
ok('Ctrl+S writes the design into the Voidcanvas folder', files.length === 1, files.join(','))
const saved = files[0] && path.join(lib, files[0])
ok('the file is a .void ZIP', !!saved && fs.readFileSync(saved).subarray(0, 2).toString() === 'PK')
ok('says where it saved', /Saved to .+\.void/.test(await p.evaluate(() => document.body.innerText)))

// 3. Keeps saving to the same file.
const size1 = fs.statSync(saved).size
await p.keyboard.press('t'); await p.mouse.click(600, 600); await p.waitForTimeout(300); await p.keyboard.type('More text here'); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
await p.keyboard.press('Control+s'); await p.waitForTimeout(1500)
ok('Ctrl+S updates the same file', fs.readdirSync(lib).filter(f => f.endsWith('.void')).length === 1 && fs.statSync(saved).size !== size1)

// 4. The page cannot touch files it was not given.
const outside = path.join(home, 'secret.txt'); fs.writeFileSync(outside, 'x')
const denied = await p.evaluate(async f => { try { await window.voidDesktop.write(f, new Uint8Array([1])); return false } catch { return true } }, outside)
ok('guard: cannot write outside chosen files and the folder', denied && fs.readFileSync(outside, 'utf8') === 'x')
const deniedRead = await p.evaluate(async f => { try { await window.voidDesktop.read(f); return false } catch { return true } }, outside)
ok('guard: cannot read outside chosen files and the folder', deniedRead)

// 5. Saving on quit: change the design, close the window, check the file.
await p.keyboard.press('t'); await p.mouse.click(500, 300); await p.waitForTimeout(300); await p.keyboard.type('Before quit'); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
const mtime = fs.statSync(saved).mtimeMs
await app.close(); await new Promise(r => setTimeout(r, 1000))
ok('saves the file on quit', fs.statSync(saved).mtimeMs > mtime)

// 6. Second launch: the folder lists the file with its preview; opening it keeps the link.
app = await launch(); p = await app.firstWindow(); p.on('pageerror', e => errors.push(e.message))
await p.waitForTimeout(3000)
// The start screen shows when no design is open; close any restored design first.
const listed = await p.evaluate(() => document.body.innerText.includes('Your Voidcanvas folder'))
ok('start screen shows the Voidcanvas folder', listed)
ok('folder card has a preview', await p.evaluate(() => Array.from(document.querySelectorAll('section img')).some(i => i.getAttribute('src')?.startsWith('data:image/png'))))
await p.click(`button[title="${saved}"]`); await p.waitForTimeout(2500)
const reopened = await p.evaluate(() => window.__voidEditor.getState().layers.map(l => l.text ?? l.name))
ok('reopens from the folder with every layer, including the one saved on quit', reopened.includes('Before quit') && reopened.length === 4, reopened.join(','))
const m2 = fs.statSync(saved).mtimeMs
ok('built-in fonts work offline (no missing-fonts dialog)', !(await p.$('text=Some fonts are missing')))
if (await p.$('button:has-text("Keep as is")')) await p.click('button:has-text("Keep as is")')
await p.keyboard.press('Control+s'); await p.waitForTimeout(1500)
ok('a design opened from the folder stays linked', fs.statSync(saved).mtimeMs > m2 && fs.readdirSync(lib).filter(f => f.endsWith('.void')).length === 1, JSON.stringify([fs.statSync(saved).mtimeMs - m2, fs.readdirSync(lib), await p.evaluate(() => document.body.innerText.match(/Saved[^\n]*|Could[^\n]*|could[^\n]*/g))]))

// 7. Opening a .void while running (second instance / Finder double-click).
const copy = path.join(home, 'Copy.void'); fs.copyFileSync(saved, copy)
await app.evaluate(({ BrowserWindow }, f) => BrowserWindow.getAllWindows()[0].webContents.send('vc:open-files', [f]), copy)
await p.waitForTimeout(2500)
ok('opens a file sent while running', (await p.evaluate(() => window.__voidEditor.getState().layers.length)) === 4)

// 8. Offline pages.
await p.evaluate(() => { location.href = 'app://voidcanvas/learn' }); await p.waitForTimeout(2000)
ok('Learn works offline', /Learn/i.test(await p.evaluate(() => document.body.innerText)))
await p.screenshot({ path: OUT('desktop_learn.png') })
await p.evaluate(() => { location.href = 'app://voidcanvas/editor' }); await p.waitForTimeout(2000)
await p.screenshot({ path: OUT('desktop_editor.png') })

await app.close()
fs.rmSync(home, { recursive: true, force: true })
if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
