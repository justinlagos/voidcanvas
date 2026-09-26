// Step 1 of plans/desktop-and-sync: the .void v3 format, Save to disk with linked files, and protected storage.
// The system file windows are replaced with an in-memory stand-in, since headless Chromium cannot show them.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = "") => { const l = `${c ? "PASS" : "FAIL"} ${n} ${i}`; console.log(l); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
await c.addInitScript(() => {
  const files = (window.__disk = { files: {}, writes: 0, picked: null })
  const handle = name => ({
    kind: 'file', name,
    queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    getFile: async () => new File([files.files[name] ?? new Uint8Array()], name),
    createWritable: async () => { const parts = []; return { write: async b => parts.push(new Uint8Array(await b.arrayBuffer())), close: async () => { const n = parts.reduce((a, p) => a + p.length, 0), u = new Uint8Array(n); let o = 0; for (const p of parts) { u.set(p, o); o += p.length } files.files[name] = u; files.writes++ } } },
  })
  window.showSaveFilePicker = async o => handle(o.suggestedName)
  window.showOpenFilePicker = async () => [handle(files.picked)]
})
const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
const toast = async () => (await p.waitForTimeout(700), p.evaluate(() => document.body.innerText))
const layers = () => p.evaluate(() => window.__voidEditor.getState().layers.map(l => l.type + ':' + (l.text ?? l.name)))

await p.goto(`${BASE}/editor`); await p.waitForTimeout(800)
await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(2500)
await p.keyboard.press('t'); await p.mouse.click(600, 450); await p.waitForTimeout(300); await p.keyboard.type('Keep me'); await p.keyboard.press('Escape'); await p.waitForTimeout(2600)
const before = await layers()
ok('setup: photo and text layer', before.length === 2 && before.some(l => l.includes('Keep me')), before.join(','))

// Protected storage is requested after the first autosave.
const asked = await p.evaluate(() => localStorage.getItem('vc-persist-asked'))
ok('storage: protection requested after first save', !!asked)

// Save to disk
await p.keyboard.press('Control+Shift+S'); let text = await toast()
const saved = await p.evaluate(() => Object.entries(window.__disk.files).map(([n, u]) => [n, u.length, u[0], u[1]]))
ok('save to disk: writes a .void file', saved.length === 1 && /\.void$/.test(saved[0][0]) && saved[0][2] === 0x50 && saved[0][3] === 0x4b, JSON.stringify(saved))
ok('save to disk: says the file is linked', /Ctrl\+S now updates this file/.test(text))

// Ctrl+S updates the linked file
await p.keyboard.press('t'); await p.mouse.click(600, 650); await p.waitForTimeout(300); await p.keyboard.type('Second'); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
const w0 = await p.evaluate(() => window.__disk.writes)
await p.keyboard.press('Control+s'); text = await toast()
ok('ctrl+s: writes the linked file too', (await p.evaluate(() => window.__disk.writes)) === w0 + 1)
ok('ctrl+s: says both places', /Saved to this device and to .+\.void/.test(text))

// Real handles are kept in IndexedDB across reloads; the stand-in here cannot be stored, so that part is checked by hand.
const name = saved[0][0]

// Open the saved file through File, Open (system file window)
await p.evaluate(n => { window.__disk.picked = n }, name)
await p.keyboard.press('Control+o'); await p.waitForTimeout(2500)
const reopened = await layers()
ok('open: .void v3 reopens with every layer', reopened.length === 3 && reopened.some(l => l.includes('Second')), reopened.join(','))
const w1 = await p.evaluate(() => window.__disk.writes)
await p.keyboard.press('Control+s'); await toast()
ok('open: a .void opened from disk stays linked', (await p.evaluate(() => window.__disk.writes)) === w1 + 1)

// Download .void and .void.png, then open them with the plain file input (Safari/Firefox path)
await p.keyboard.press('Control+k'); await p.waitForTimeout(200); await p.keyboard.type('Download project file'); await p.waitForTimeout(300)
await p.screenshot({ path: OUT('palette.png') })
const [dl] = await Promise.all([p.waitForEvent('download'), p.keyboard.press('Enter')])
const voidPath = OUT('roundtrip.void'); await dl.saveAs(voidPath)
const head = fs.readFileSync(voidPath).subarray(0, 4)
ok('download: .void is a ZIP', head[0] === 0x50 && head[1] === 0x4b)

await p.keyboard.press('Control+k'); await p.waitForTimeout(200); await p.keyboard.type('Download editable picture'); await p.waitForTimeout(300)
const [dl2] = await Promise.all([p.waitForEvent('download'), p.keyboard.press('Enter')])
const pngPath = OUT('roundtrip.void.png'); await dl2.saveAs(pngPath)
ok('download: .void.png is a PNG', fs.readFileSync(pngPath)[1] === 0x50 && fs.readFileSync(pngPath).includes(Buffer.from('voId')))

// Legacy v2 file (JSON, base64 inline)
const px = fs.readFileSync(FIX.logo).toString('base64')
const v2 = { format: 'voidcanvas', version: 2, doc: { id: 'old', name: 'Old file', width: 600, height: 300, background: '#ffffff', channelMeta: [] }, layers: [{ id: 'A', type: 'raster', name: 'Logo', visible: true, locked: false, opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, maskEnabled: true, groupId: null, hasMask: false }], groups: [], swatches: [], blobs: { A: px } }
fs.writeFileSync(OUT('old.void'), JSON.stringify(v2))

const c2 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c2.newPage(); q.on('pageerror', e => errors.push(e.message))
for (const [label, file, expect] of [['.void', voidPath, 3], ['.void.png', pngPath, 3], ['version 2 .void', OUT('old.void'), 1]]) {
  await q.goto(`${BASE}/editor`); await q.waitForTimeout(800)
  await (await q.$('input[type=file]')).setInputFiles(file); await q.waitForTimeout(2500)
  const got = await q.evaluate(() => window.__voidEditor.getState().layers.length)
  ok(`file input: ${label} opens`, got === expect, String(got))
}

// Privacy panel shows the storage status
await q.goto(`${BASE}/editor`); await q.waitForTimeout(800)
await q.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'privacy' }))); await q.waitForTimeout(600)
ok('privacy: storage status shown', /Storage on this device/.test(await q.evaluate(() => document.body.innerText)))
await q.screenshot({ path: OUT('privacy_storage.png') })

await b.close(); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
