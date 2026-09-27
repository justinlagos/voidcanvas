// Research mode in Studio (Working Designer Study), against the real study API: a joined test participant opens
// Studio through their study link, runs a real job (brief with 3 formats, key visual in the Editor, build formats,
// deliver the package) and answers the three closing questions. Server state is checked through the study API.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { OUT } from './fixtures.mjs'

const BASE = process.env.BASE || 'http://localhost:3123'
const TOKEN = process.env.STUDY_TOKEN
if (!TOKEN) { console.log('SKIP research-studio: set STUDY_TOKEN'); process.exit(0) }
const API = 'https://fpmyuqjiwckcjaufwwit.supabase.co/functions/v1/research', KEY = 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv'
const SHOTS = process.env.SHOTS || OUT('research')
fs.mkdirSync(SHOTS, { recursive: true })
const ok = (n, c, i = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }

const b = await chromium.launch(); const errors = []
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept())

// The study API, called from the page (same network path as the app).
const view = () => p.evaluate(async ([u, k, t]) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: k }, body: JSON.stringify({ action: 'get', token: t }) }); return (await r.json()).view }, [API, KEY, TOKEN])
async function waitView(test, ms = 20000) {
  const end = Date.now() + ms; let v = null
  while (Date.now() < end) { v = await view().catch(() => null); if (v && test(v)) return v; await p.waitForTimeout(1000) }
  return v
}
const editorReady = async (cond = 'true') => { await p.waitForURL(/\/editor/, { timeout: 30000 }); await p.waitForFunction(`!!window.__voidEditor?.getState().doc && (${cond})`, null, { timeout: 30000 }) }
const backToStudio = async () => {
  await p.click('button:has-text("Back to the job in Studio")')
  await p.waitForURL(/\/studio/, { timeout: 30000 }); await p.waitForSelector('nav[aria-label="Job steps"]', { timeout: 20000 })
}
const tab = async name => { await p.click(`nav[aria-label="Job steps"] button:has-text("${name}")`); await p.waitForTimeout(1500) }

// 1. Study link: pill and remembered token.
await p.goto(`${BASE}/studio?study=${TOKEN}`); await p.waitForTimeout(1500)
ok('1 study pill visible', await p.isVisible('text=Study mode: timing on, designs never recorded.'))
ok('1 localStorage vc-study is the token', (await p.evaluate(() => localStorage.getItem('vc-study'))) === TOKEN)

// A job with three formats from the brief.
await p.click('button:has-text("Start a job")'); await p.waitForTimeout(800)
await p.fill('input[aria-label="Client"]', 'Study Test Client')
await p.click('textarea[aria-label="Brief"]')
await p.keyboard.type('Poster for Lagos Nights at The Wings Tower. Friday 12 July, 9pm. Need an IG post, a story and an A3 poster.')
await p.waitForTimeout(800)
await p.click('button:has-text("Add all")'); await p.waitForTimeout(500)
const formats = await p.$$eval('input[aria-label="Format name"]', i => i.map(x => x.value))
ok('brief has 3 formats', formats.length >= 3, formats.join(', '))

// Key visual in the Editor: one shape and one text, autosaved, back to Studio.
await tab('Key visual')
await p.click('button:has-text("Start key visual in the Editor")')
await editorReady()
const jobId = await p.evaluate(() => window.__voidEditor.getState().doc.jobId)
ok('editor doc is tagged with the job', !!jobId, jobId)
await p.evaluate(() => { const s = window.__voidEditor.getState(); s.addShape('rect', 100, 100, 880, 600, { fill: '#e65028' }); s.addText(120, 800) })
await p.waitForFunction(() => !window.__voidEditor.getState().dirty, null, { timeout: 15000 }).catch(() => {})
await p.waitForTimeout(500)
await backToStudio()

// 2. Build the missing formats: Editor builds them, back to Studio, server has the job.
await tab('Key visual')
await p.waitForSelector('button:has-text("missing format"):not([disabled])', { timeout: 20000 })
await p.click('button:has-text("missing format")')
await editorReady('window.__voidEditor.getState().doc.frames?.length >= 3')
const boards = await p.evaluate(() => window.__voidEditor.getState().doc.frames.filter(f => f.deliverableId).length)
ok('editor built the formats as boards', boards >= 3, String(boards))
await p.waitForFunction(() => !window.__voidEditor.getState().dirty, null, { timeout: 15000 }).catch(() => {})
await p.screenshot({ path: `${SHOTS}/01-editor-formats.png` })
ok('active study job is set', (await p.evaluate(() => localStorage.getItem('vc-study-job'))) === jobId)
await backToStudio()
let v = await waitView(v => v.jobStarted && v.jobs.some(j => j.key === jobId))
ok('2 server: jobStarted and the job is recorded', !!v?.jobStarted && !!v.jobs.find(j => j.key === jobId), JSON.stringify(v?.jobs?.find(j => j.key === jobId) ?? null))

// 3. Deliver: zip downloads, closing dialog, server has the job delivered with 3+ formats.
await tab('Deliver')
await p.waitForSelector('button:has-text("Build the package"):not([disabled])', { timeout: 20000 })
const ready = await p.textContent('text=/formats ready/')
ok('deliver tab has 3 formats ready', /^3 of 3/.test(ready?.trim() ?? ''), ready)
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('button:has-text("Build the package")')])
const zipPath = `${SHOTS}/${dl.suggestedFilename()}`; await dl.saveAs(zipPath)
const zip = fs.readFileSync(zipPath)
ok('3 zip downloaded', /\.zip$/.test(dl.suggestedFilename()) && zip[0] === 0x50 && zip[1] === 0x4b && zip.length > 1000, `${dl.suggestedFilename()} ${zip.length} bytes`)
const dialog = p.locator('[role=dialog]')
await dialog.locator('h2:has-text("Three questions to finish")').waitFor({ timeout: 20000 }).catch(() => {})
ok('3 closing dialog "Three questions to finish"', await dialog.locator('h2:has-text("Three questions to finish")').isVisible())
ok('3 dialog says 3 formats', /with 3 formats/.test(await dialog.innerText()))
ok('active study job cleared', (await p.evaluate(() => localStorage.getItem('vc-study-job'))) === null)
await p.screenshot({ path: `${SHOTS}/02-closing-dialog.png` })
v = await waitView(v => v.jobs.some(j => j.key === jobId && j.delivered && j.formats >= 3))
const jd = v?.jobs?.find(j => j.key === jobId)
ok('3 server: job delivered with formats >= 3', !!jd?.delivered && jd.formats >= 3, JSON.stringify(jd ?? null))

// 4. Closing answers.
const send = dialog.locator('button:has-text("Send answers")')
ok('send is disabled until answered', await send.isDisabled())
await dialog.locator('input[aria-label="Hours"]').fill('3')
await dialog.locator('input[aria-label="Minutes"]').fill('30')
await dialog.locator('textarea').fill('Automated e2e test run, please ignore.')
await dialog.locator('input[type=radio][value="somewhat"]').check()
await p.screenshot({ path: `${SHOTS}/03-closing-filled.png` })
await send.click()
await dialog.locator('h2:has-text("Thank you")').waitFor({ timeout: 20000 }).catch(() => {})
ok('4 dialog shows "Thank you"', await dialog.locator('h2:has-text("Thank you")').isVisible())
await p.screenshot({ path: `${SHOTS}/04-thank-you.png` })
v = await waitView(v => v.jobs.some(j => j.key === jobId && j.closed))
ok('4 server: job closed', !!v?.jobs?.find(j => j.key === jobId)?.closed, JSON.stringify(v?.jobs?.find(j => j.key === jobId) ?? null))

// 5.
ok('5 no page errors', !errors.length, errors.slice(0, 3).join(' | '))
console.log(`screenshots in ${SHOTS}`)
await b.close()
