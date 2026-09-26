// Studio Share against the real Supabase project: a designer (password test user VC_SOLO, no keys yet) sends a
// review link; a client with no account comments, asks for changes and approves; the designer replies; a
// delivery link downloads byte for byte; stopping a link closes it. Checks that the server holds only ciphertext.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'

const BASE = process.env.BASE || 'http://localhost:3123'
const { VC_SOLO, VC_TEST_PASSWORD: PW } = process.env
if (!VC_SOLO || !PW) { console.log('SKIP share: set VC_SOLO, VC_TEST_PASSWORD'); process.exit(0) }
const SUPA = 'https://fpmyuqjiwckcjaufwwit.supabase.co', KEY = 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv'
const ok = (n, c, i = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
async function device(name, path, viewport = { width: 1280, height: 900 }) {
  const c = await b.newContext({ viewport, acceptDownloads: true })
  const p = await c.newPage(); p.on('pageerror', e => errors.push(`${name}: ${e.message}`)); p.on('dialog', d => d.accept())
  await p.goto(`${BASE}${path}`); await p.waitForTimeout(1000)
  return p
}
const body = p => p.evaluate(() => document.body.innerText)
const api = (p, path) => p.evaluate(async ([u, k, path]) => { const t = JSON.parse(localStorage.getItem('vc-account')).access_token; const r = await fetch(`${u}/rest/v1/${path}`, { headers: { apikey: k, Authorization: `Bearer ${t}` } }); return r.json() }, [SUPA, KEY, path])

// ── Designer: account, a job, a version from an image.
const D = await device('designer', '/editor')
await D.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'account' }))); await D.waitForTimeout(800)
await D.evaluate(([e, pw]) => window.__vcAccount.signInWithPassword(e, pw), [VC_SOLO, PW]); await D.waitForTimeout(1500)
await D.click('button:has-text("Make my recovery key")'); await D.waitForTimeout(800)
const rec = (await D.textContent('[data-recovery]')).trim()
await D.fill('input.font-mono', rec.split('-').pop()); await D.click('button:has-text("Finish")'); await D.waitForTimeout(2500)
await D.goto(`${BASE}/studio`); await D.waitForTimeout(1500)
await D.click('button:has-text("Start a job")'); await D.waitForTimeout(800)
await D.fill('input[aria-label="Client"]', 'Harbour Coffee'); await D.fill('input[aria-label="Job name"]', 'Autumn menu board')
await D.click('button:has-text("Review")'); await D.waitForTimeout(600)
await (await D.$('input[type=file][accept="image/*"][multiple]')).setInputFiles([FIX.land, FIX.portrait]); await D.waitForTimeout(2500)
await D.click('button:has-text("Send a review link")'); await D.waitForTimeout(600)
await D.click('button:has-text("Make a link for 2 images")'); await D.waitForTimeout(8000)
const link = await D.inputValue('input[aria-label="Link"]')
ok('review link has an id and a secret after #', /\/s#[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}$/.test(link), link.replace(/\..*$/, '.…'))
const shareId = link.split('#')[1].split('.')[0]
const rows = await api(D, `vc_shares?select=kind,manifest,ready,bytes&id=eq.${shareId}`)
ok('the share is ready and its manifest is sealed', rows[0]?.ready === true && rows[0].manifest.startsWith('v1.') && !rows[0].manifest.includes('Harbour') && !rows[0].manifest.includes('Autumn'))
const listed = await D.evaluate(async ([u, k, id]) => { const r = await fetch(`${u}/storage/v1/object/list/vc-share`, { method: 'POST', headers: { apikey: k, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: id, limit: 100 }) }); return r.ok ? (await r.json()).length : r.status }, [SUPA, KEY, shareId])
ok('nobody without an account can list shared files', listed === 0 || listed >= 400, String(listed))
const mine = await D.evaluate(async ([u, k, id]) => { const t = JSON.parse(localStorage.getItem('vc-account')).access_token; const r = await fetch(`${u}/storage/v1/object/list/vc-share`, { method: 'POST', headers: { apikey: k, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: id, limit: 100 }) }); const l = await r.json(); const f = await fetch(`${u}/storage/v1/object/public/vc-share/${id}/${l[0].name}`); const a = new Uint8Array(await f.arrayBuffer()); return { n: l.length, jpeg: a[0] === 0xff && a[1] === 0xd8, png: a[1] === 0x50 && a[2] === 0x4e } }, [SUPA, KEY, shareId])
ok('files on the server are ciphertext', mine.n === 2 && !mine.jpeg && !mine.png, JSON.stringify(mine))
const wrong = await D.evaluate(async ([u, k, id]) => { const r = await fetch(`${u}/rest/v1/rpc/vc_share_open`, { method: 'POST', headers: { apikey: k, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: id, p_token: 'guess' }) }); return (await r.json()).message }, [SUPA, KEY, shareId])
ok('a wrong token is refused', wrong === 'not_found', wrong)

// ── Client, on a phone, no account.
const C = await device('client', `/s#${link.split('#')[1]}`, { width: 390, height: 844 })
await C.waitForTimeout(4000)
ok('client sees the job and version', /Autumn menu board[\s\S]*v1/.test(await body(C)))
ok('client sees the images', await C.evaluate(() => [...document.querySelectorAll('img')].some(i => i.naturalWidth > 100)))
const broken = await device('stranger', `/s#${shareId}.${'A'.repeat(22)}`)
await broken.waitForTimeout(3000)
ok('a link with the wrong secret does not open', /cannot be opened|expired/.test(await body(broken)))
await C.fill('input[placeholder^="So the designer"]', 'Ada Obi'); await C.click('h1')
const surf = await C.$('[data-testid=pin-surface]'); const box = await surf.boundingBox()
await C.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4); await C.waitForTimeout(300)
await C.fill('textarea[placeholder="What should change here?"]', 'Make the price bigger'); await C.click('button:has-text("Post comment")'); await C.waitForTimeout(2500)
await C.screenshot({ path: OUT('share-client-phone.png'), fullPage: true })
ok('client comment appears', /Ada Obi[\s\S]*Make the price bigger/.test(await body(C)))
await C.click('button:has-text("Ask for changes")'); await C.fill('textarea[placeholder^="What needs to change"]', 'Warmer photo please'); await C.click('button:has-text("Send")'); await C.waitForTimeout(2500)
ok('client sees their request for changes', /asked for changes/.test(await body(C)))
const events = await api(D, `vc_share_events?select=body,by_team&share_id=eq.${shareId}`)
ok('comments are ciphertext on the server', events.length === 2 && events.every(e => e.body.startsWith('v1.') && !e.body.includes('price') && !e.by_team))

// ── Designer sees the comment and the request, and replies.
await D.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {}); await D.keyboard.press('Escape')
await D.waitForTimeout(22000)
let dt = await body(D)
ok('designer receives the pinned comment', /Ada Obi: Make the price bigger/.test(dt))
ok('designer sees the request for changes', /Ada Obi asked for changes/.test(dt) && /Ada Obi: Warmer photo please/.test(dt))
await D.click('.cursor-crosshair ~ div button'); await D.waitForTimeout(300)
await D.fill('textarea[placeholder="Reply to Ada Obi"]', 'Done in v2'); await D.click('button:has-text("Reply")'); await D.waitForTimeout(2500)
await C.reload(); await C.waitForTimeout(4000)
ok('client sees the designer reply', /Designer[\s\S]*Done in v2/.test(await body(C)))
const team = await api(D, `vc_share_events?select=by_team&share_id=eq.${shareId}&order=id`)
ok('the reply is marked as from the team by the server', team.at(-1)?.by_team === true)
await C.click('button:has-text("Approve")'); await C.waitForTimeout(2000)
await D.waitForTimeout(22000)
ok('designer sees the approval', /Ada Obi approved this version/.test(await body(D)) && (await D.inputValue('select[aria-label="Version status"]')) === 'approved')

// ── Delivery link through the same API the Deliver tab uses.
const logo = fs.readFileSync(FIX.logo)
const del = await D.evaluate(async bytes => { const f = new Blob([new Uint8Array(bytes)], { type: 'image/png' }); return (await window.__vcShare.createDeliveryShare({ client: 'Harbour Coffee', job: 'Autumn menu board', label: 'v1', notes: '' }, [{ name: 'harbour_menu_v1.png', blob: f }])).url }, [...logo])
const CD = await device('client-delivery', `/s#${del.split('#')[1]}`)
await CD.waitForTimeout(3000)
ok('delivery page lists the file', /harbour_menu_v1\.png/.test(await body(CD)))
const [dl] = await Promise.all([CD.waitForEvent('download'), CD.click('button[aria-label="Download harbour_menu_v1.png"]')])
const got = fs.readFileSync(await dl.path())
ok('delivered file downloads byte for byte', got.equals(logo), `${got.length} vs ${logo.length}`)
await CD.screenshot({ path: OUT('share-delivery.png') })
await D.evaluate(u => window.__vcShare.deleteShare(u.split('#')[1].split('.')[0]), del)

// ── Stopping the review link closes it for the client and removes its files.
await D.click('button:has-text("Review link")'); await D.waitForTimeout(500)
await D.click('button:has-text("Stop this link")'); await D.waitForTimeout(3000)
await C.reload(); await C.waitForTimeout(3000)
ok('a stopped link no longer opens', /cannot be opened/.test(await body(C)))
const left = await api(D, `vc_shares?select=id&id=eq.${shareId}`)
ok('the stopped share is gone from the server', Array.isArray(left) && left.length === 0)

ok('no page errors', !errors.length, errors.join(' | '))
await b.close()
