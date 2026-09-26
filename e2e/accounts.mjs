// Accounts, keys and settings sync against the real Supabase project, with three browser contexts as three devices.
// Needs a test user with a password (email OTP cannot be automated):
//   VC_TEST_EMAIL=... VC_TEST_PASSWORD=... node e2e/accounts.mjs
// The user should have no keys yet. Delete the user afterwards; its rows go with it.
import { chromium } from 'playwright'
import { OUT } from './fixtures.mjs'

const BASE = process.env.BASE || 'http://localhost:3123'
const EMAIL = process.env.VC_TEST_EMAIL, PASSWORD = process.env.VC_TEST_PASSWORD
if (!EMAIL || !PASSWORD) { console.log('SKIP accounts: set VC_TEST_EMAIL and VC_TEST_PASSWORD'); process.exit(0) }
const ok = (n, c, i = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []

async function device(name) {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const p = await c.newPage(); p.on('pageerror', e => errors.push(`${name}: ${e.message}`))
  await p.goto(`${BASE}/editor`); await p.waitForTimeout(1000)
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'account' }))); await p.waitForTimeout(800)
  return p
}
const text = p => p.evaluate(() => document.querySelector('[role=dialog]')?.innerText ?? '')
const signIn = async p => { await p.evaluate(([e, pw]) => window.__vcAccount.signInWithPassword(e, pw), [EMAIL, PASSWORD]); await p.waitForTimeout(1500) }

// Device A: first sign-in, recovery key.
const A = await device('A')
ok('signed out: offers email sign-in', /Send a sign-in code/.test(await text(A)))
await signIn(A)
ok('first sign-in asks for a recovery key', /recovery key/i.test(await text(A)))
await A.click('button:has-text("Make my recovery key")'); await A.waitForTimeout(800)
const recovery = (await A.textContent('[data-recovery]')).trim()
ok('recovery key is 13 groups of 4', /^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/.test(recovery), recovery.slice(0, 9) + '…')
await A.fill('input.font-mono', 'ZZZZ'); await A.click('button:has-text("Finish")'); await A.waitForTimeout(500)
ok('wrong confirmation is refused', /does not match/.test(await text(A)))
await A.fill('input.font-mono', recovery.split('-').pop()); await A.click('button:has-text("Finish")'); await A.waitForTimeout(2500)
ok('device A is ready with sync on', /Settings sync is on/.test(await text(A)))

// Settings from A go to the account.
await A.evaluate(() => localStorage.setItem('vc-recent-colours', JSON.stringify(['#ff0066', '#00aa88'])))
await A.click('button:has-text("Sync now")'); await A.waitForTimeout(2000)
ok('A saves its settings', /saved to your account|up to date/.test(await text(A)))

// Nothing readable without a session.
const anon = await A.evaluate(async () => {
  const { SUPABASE_URL, SUPABASE_KEY } = { SUPABASE_URL: 'https://fpmyuqjiwckcjaufwwit.supabase.co', SUPABASE_KEY: 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv' }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/vc_keys?select=*`, { headers: { apikey: SUPABASE_KEY } })
  return { status: r.status, body: await r.text() }
})
ok('keys are not readable without signing in', anon.status === 401 || anon.body === '[]', `${anon.status} ${anon.body.slice(0, 60)}`)
const stored = await A.evaluate(async () => {
  const s = JSON.parse(localStorage.getItem('vc-account'))
  const r = await fetch('https://fpmyuqjiwckcjaufwwit.supabase.co/rest/v1/vc_settings?select=ciphertext', { headers: { apikey: 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv', Authorization: `Bearer ${s.access_token}` } })
  return (await r.json())[0]?.ciphertext ?? ''
})
ok('the server holds settings only as ciphertext', stored.startsWith('v1.') && !stored.includes('ff0066'))

// Device B: pairs from A.
const B = await device('B')
await signIn(B)
ok('a second device is locked until approved', /Approve from another device/.test(await text(B)))
await B.click('button:has-text("Approve from another device")'); await B.waitForTimeout(2000)
const code = (await B.textContent('[data-pair-code]')).trim()
ok('B shows a pairing code and QR', /^([A-Z2-7]{4}-){6}[A-Z2-7]{2}$/.test(code) && !!(await B.$('[aria-label="QR code"] svg')), code)
await B.screenshot({ path: OUT('account_pair.png') })
await A.fill('input[placeholder^="ABCD"]', code); await A.click('button:has-text("Look up")'); await A.waitForTimeout(1500)
ok('A sees who is asking', /asked/.test(await text(A)))
await A.click('button:has-text("Add this device")'); await A.waitForTimeout(6000)
ok('B is unlocked by A', /Settings sync is on/.test(await text(B)))
await B.waitForTimeout(2500)
const colours = await B.evaluate(() => localStorage.getItem('vc-recent-colours'))
ok('B received A\'s settings', colours === JSON.stringify(['#ff0066', '#00aa88']), colours)

// Device C: recovery key. A wrong one first.
const C = await device('C')
await signIn(C)
await C.click('button:has-text("Use my recovery key")'); await C.waitForTimeout(300)
await C.fill('textarea', 'AAAA-'.repeat(12) + 'AAAA'); await C.click('button:has-text("Unlock")'); await C.waitForTimeout(1500)
ok('a wrong recovery key is refused', /does not match/.test(await text(C)))
await C.fill('textarea', recovery.toLowerCase().replace(/-/g, ' ')); await C.click('button:has-text("Unlock")'); await C.waitForTimeout(3000)
ok('C unlocks with the recovery key', /Settings sync is on/.test(await text(C)))

// Devices list, new recovery key, sign out.
await C.waitForTimeout(1000)
await C.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'account' })))
const devices = await C.$$eval('[role=dialog] li', els => els.length)
ok('all three devices are listed', devices === 3, String(devices))
C.on('dialog', d => d.accept())
await C.click('button:has-text("Make a new recovery key")'); await C.waitForTimeout(2000)
const fresh = (await C.textContent('[data-recovery]')).trim()
ok('a new recovery key is shown', fresh !== recovery && fresh.length === recovery.length)
await B.click('button:has-text("Sign out")'); await B.waitForTimeout(2000)
ok('signing out returns to the sign-in screen', /Send a sign-in code/.test(await text(B)))
const keyLeft = await B.evaluate(() => new Promise(res => { const q = indexedDB.open('voidcanvas'); q.onsuccess = () => { const t = q.result.transaction('account').objectStore('account').getAll(); t.onsuccess = () => res(t.result.length) } }))
ok('signing out removes the key from the device', keyLeft === 0, String(keyLeft))
await signIn(B)
await B.click('button:has-text("Use my recovery key")'); await B.fill('textarea', recovery); await B.click('button:has-text("Unlock")'); await B.waitForTimeout(1500)
ok('the old recovery key no longer works', /does not match/.test(await text(B)))
await B.fill('textarea', fresh); await B.click('button:has-text("Unlock")'); await B.waitForTimeout(2500)
ok('the new recovery key works', /Settings sync is on/.test(await text(B)))
await A.screenshot({ path: OUT('account_ready.png') })

await b.close()
if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
