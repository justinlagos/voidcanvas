// Teams and account management against the real Supabase project. Three password test users (sign-in by code
// cannot be automated): VC_OWNER, VC_MEMBER, VC_SOLO (emails), VC_TEST_PASSWORD. None should have keys yet.
// Phase 1 runs everything it can. Email change needs a code the test cannot receive, so phase 1 stops at a
// file (e2e/.out/teams-phase.json); after the test codes are planted by SQL, run with PHASE=2 to finish.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'

const BASE = process.env.BASE || 'http://localhost:3123'
const { VC_OWNER, VC_MEMBER, VC_SOLO, VC_TEST_PASSWORD: PW } = process.env
if (!VC_OWNER || !VC_MEMBER || !VC_SOLO || !PW) { console.log('SKIP teams: set VC_OWNER, VC_MEMBER, VC_SOLO, VC_TEST_PASSWORD'); process.exit(0) }
const SUPA = 'https://fpmyuqjiwckcjaufwwit.supabase.co', KEY = 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv'
const ok = (n, c, i = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const PHASE_FILE = OUT('teams-phase.json')

async function device(name, path = '/editor') {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const p = await c.newPage(); p.on('pageerror', e => errors.push(`${name}: ${e.message}`)); p.on('dialog', d => d.accept())
  await p.goto(`${BASE}${path}`); await p.waitForTimeout(1000)
  return p
}
const openAccount = async p => { await p.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'account' }))); await p.waitForTimeout(800) }
const text = p => p.evaluate(() => document.querySelector('[role=dialog]')?.innerText ?? document.body.innerText)
const signIn = async (p, email) => { await p.evaluate(([e, pw]) => window.__vcAccount.signInWithPassword(e, pw), [email, PW]); await p.waitForTimeout(1500) }
async function setup(p) {
  await p.click('button:has-text("Make my recovery key")'); await p.waitForTimeout(800)
  const rec = (await p.textContent('[data-recovery]')).trim()
  await p.fill('input.font-mono', rec.split('-').pop()); await p.click('button:has-text("Finish")'); await p.waitForTimeout(2500)
  return rec
}
const token = p => p.evaluate(() => JSON.parse(localStorage.getItem('vc-account')).access_token)
const api = (p, path) => p.evaluate(async ([u, k, path]) => { const t = JSON.parse(localStorage.getItem('vc-account')).access_token; const r = await fetch(`${u}/rest/v1/${path}`, { headers: { apikey: k, Authorization: `Bearer ${t}` } }); return r.json() }, [SUPA, KEY, path])
const idbAll = (p, store) => p.evaluate(s => new Promise(res => { const q = indexedDB.open('voidcanvas'); q.onsuccess = () => { const t = q.result.transaction(s).objectStore(s).getAll(); t.onsuccess = () => res(t.result.map(x => ({ id: x.id, name: x.name, workspaceId: x.workspaceId ?? null, logos: (x.logos ?? []).map(l => ({ size: l.blob?.size ?? l.blob?.__vcBlob?.byteLength ?? 0, type: l.blob?.type })) }))) } }), store)

if (process.env.PHASE !== '2') {
  // ── Owner and member set up accounts; owner makes a team and invites the member.
  const O = await device('owner'); await openAccount(O); await signIn(O, VC_OWNER); await setup(O)
  ok('owner ready', /Settings sync is on/.test(await text(O)))
  await O.fill('input[aria-label="New team name"]', 'Studio North'); await O.click('button:has-text("Create a team")'); await O.waitForTimeout(3000)
  ok('team created', /Studio North[\s\S]*Owner/.test(await text(O)))
  const wsName = await api(O, 'vc_workspaces?select=name_sealed,key_version')
  ok('team name is sealed on the server', wsName.length === 1 && wsName[0].name_sealed.startsWith('v1.') && !wsName[0].name_sealed.includes('North'))
  await O.fill('input[aria-label="Email to invite"]', VC_MEMBER); await O.click('button:has-text("Make invite link")'); await O.waitForTimeout(2500)
  const invite = (await O.textContent('[data-invite-link]')).trim()
  ok('invite link has an id and a secret after #', /\/join#[A-Z2-7]{10}\.[A-Z2-7]{26}$/.test(invite), invite.replace(/#.*/, '#…'))
  ok('owner sees the waiting invite', /waiting/.test(await text(O)))

  // Someone else with the link cannot use it.
  const S = await device('solo'); await openAccount(S); await signIn(S, VC_SOLO); await setup(S)
  await S.goto(`${BASE}/join${invite.slice(invite.indexOf('#'))}`); await S.waitForTimeout(4000)
  ok('an invite cannot be used from another email address', /different email address/.test(await S.evaluate(() => document.body.innerText)))

  const M = await device('member', `/join${invite.slice(invite.indexOf('#'))}`)
  await M.waitForTimeout(500)
  ok('join page asks to sign in', /Send a sign-in code/.test(await M.evaluate(() => document.body.innerText)))
  await signIn(M, VC_MEMBER); await setup(M); await M.waitForTimeout(3000)
  { const mt = await M.evaluate(() => document.body.innerText); ok('member joined from the link', /You joined Studio North as editor/.test(mt), /You joined/.test(mt) ? '' : mt.slice(mt.indexOf('Teams'), mt.indexOf('Teams') + 900).replace(/\n+/g, ' | ')) }
  const used = await S.evaluate(async ([u, k, id]) => { const t = JSON.parse(localStorage.getItem('vc-account')).access_token; const r = await fetch(`${u}/rest/v1/rpc/vc_accept_invite`, { method: 'POST', headers: { apikey: k, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: id, p_public_key: {} }) }); return (await r.json()).message }, [SUPA, KEY, invite.split('#')[1].split('.')[0]])
  ok('a used invite stays used', used === 'invite_used' || used === 'invite_other_email', used)

  // ── Owner shares a brand with a logo from Studio.
  await O.goto(`${BASE}/studio`); await O.waitForTimeout(2500)
  await O.click('button:has-text("Client brands")'); await O.waitForTimeout(800)
  await O.click('button:has-text("New brand")'); await O.waitForTimeout(800)
  await O.fill('input[value="New brand"]', 'Harbour Coffee'); await O.waitForTimeout(700)
  await (await O.$('input[type=file][accept="image/*,.svg"]')).setInputFiles(FIX.logo); await O.waitForTimeout(1500)
  await O.selectOption('select[aria-label="Shared with"]', { label: 'Studio North' }); await O.waitForTimeout(5000)
  ok('owner sees the brand synced', /Synced/.test(await O.evaluate(() => document.body.innerText)))
  const items = await api(O, 'vc_items?select=kind,ciphertext,key_version')
  ok('the shared brand is ciphertext on the server', items.length === 1 && items[0].kind === 'brand' && !items[0].ciphertext.includes('Harbour'))

  // ── Member receives it, logo included.
  await M.goto(`${BASE}/studio`); await M.waitForTimeout(6000)
  let mb = await idbAll(M, 'brands')
  const logoSize = fs.statSync(FIX.logo).size
  ok('member receives the brand', mb.some(x => x.name === 'Harbour Coffee'), JSON.stringify(mb.map(x => x.name)))
  ok('the logo arrives intact', mb.find(x => x.name === 'Harbour Coffee')?.logos?.[0]?.size === logoSize, `${mb[0]?.logos?.[0]?.size} vs ${logoSize}`)

  // ── Member edits it; owner gets the change.
  await M.click('button:has-text("Client brands")'); await M.waitForTimeout(800)
  await M.click('button:has-text("Harbour Coffee")'); await M.waitForTimeout(600)
  await M.fill('input[value="Harbour Coffee"]', 'Harbour Coffee Co'); await M.waitForTimeout(6000)
  await O.reload(); await O.waitForTimeout(6000)
  const ob = await idbAll(O, 'brands')
  ok('owner receives the member\'s edit', ob.some(x => x.name === 'Harbour Coffee Co'), JSON.stringify(ob.map(x => x.name)))

  // ── The owner cannot delete their account while others depend on the team.
  await O.goto(`${BASE}/editor`); await O.waitForTimeout(1500); await openAccount(O)
  await O.click('button:has-text("Delete…")'); await O.waitForTimeout(500)
  await O.fill('input[aria-label="Type DELETE"]', 'DELETE'); await O.click('button:has-text("Delete my account")'); await O.waitForTimeout(2000)
  ok('sole owner cannot delete their account', /only owner of a team/.test(await text(O)))
  await O.click('button:has-text("Cancel")')

  // ── Owner removes the member: key replaced, member locked out.
  await O.click('button:has-text("Studio North")'); await O.waitForTimeout(1500)
  await O.click(`li:has-text("${VC_MEMBER}") button:has-text("Remove")`); await O.waitForTimeout(4000)
  const after = await api(O, 'vc_workspaces?select=key_version')
  ok('removing a member replaces the team key', after[0]?.key_version === 2, JSON.stringify(after))
  const mItems = await api(M, 'vc_items?select=id')
  const mWs = await api(M, 'vc_workspaces?select=id')
  ok('the removed member can no longer read team items', Array.isArray(mItems) && mItems.length === 0 && mWs.length === 0)
  const keysForM = await api(M, 'vc_member_keys?select=key_version')
  ok('the removed member holds no team keys', Array.isArray(keysForM) && keysForM.length === 0)

  // ── Solo user: two devices, then "Lost a device?".
  const S2 = await device('solo-2'); await openAccount(S2); await signIn(S2, VC_SOLO)
  await S.goto(`${BASE}/editor`); await S.waitForTimeout(1500); await openAccount(S)
  await S.click('button:has-text("Replace my keys")'); await S.waitForTimeout(1500)
  const newRec = (await S.textContent('[data-recovery]')).trim()
  await S.fill('[data-rotation-confirm]', newRec.split('-').pop()); await S.click('button:has-text("Finish")'); await S.waitForTimeout(4000)
  ok('keys replaced', /new keys, and every other device is signed out/.test(await text(S)))
  const keysAfter = await api(S, 'vc_keys?select=key_version')
  ok('key version went up', keysAfter[0]?.key_version === 2, JSON.stringify(keysAfter))
  await S.click('button:has-text("Sync now")'); await S.waitForTimeout(2000)
  ok('settings still sync with the new key', /saved to your account|up to date|now in use/.test(await text(S)))
  // The other device's session was revoked: it can no longer refresh.
  const refresh = await S2.evaluate(async ([u, k]) => { const s = JSON.parse(localStorage.getItem('vc-account')); const r = await fetch(`${u}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: k, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) }); return r.status }, [SUPA, KEY])
  ok('the other device is signed out', refresh >= 400, String(refresh))

  // ── Email change request: the test domain cannot receive mail, so only the refusal path shows here.
  await S.click('[role=dialog] button:text-is("Change")'); await S.fill('input[aria-label="New email address"]', 'e2e-solo-new@voidcanvas.test'); await S.click('button:has-text("Send codes")')
  let t = ''
  for (let i = 0; i < 20 && !/We sent a code|could not be sent|cannot receive mail|Too many tries/.test(t); i++) { await S.waitForTimeout(500); t = await text(S) }
  ok('email change request gives a readable answer', /We sent a code|could not be sent|cannot receive mail|Too many tries/.test(t), (t.match(/We sent a code|could not be sent|cannot receive mail|Too many tries/) ?? [t.slice(-900).replace(/\n+/g, ' | ')])[0])

  // Owner deletes the team: its files go too (checked by SQL after the run: no objects left in vc-team).
  await O.click('button:has-text("Delete team")'); await O.waitForTimeout(3000)
  ok('owner deleted the team', (await api(O, 'vc_workspaces?select=id')).length === 0)
  fs.writeFileSync(PHASE_FILE, JSON.stringify({ recovery: newRec }))
  await O.screenshot({ path: OUT('teams_owner.png'), fullPage: true })
  console.log('PHASE 1 DONE')
} else {
  // ── Phase 2: codes planted by SQL; confirm the email change, then delete the account.
  const saved = JSON.parse(fs.readFileSync(PHASE_FILE, 'utf8'))
  const S = await device('solo')
  await openAccount(S); await signIn(S, VC_SOLO)
  await S.click('button:has-text("Use my recovery key")'); await S.fill('textarea', saved.recovery); await S.click('button:has-text("Unlock")'); await S.waitForTimeout(3000)
  ok('solo unlocks with the replacement recovery key', /Settings sync is on/.test(await text(S)))
  const r = await S.evaluate(async () => { try { await window.__vcAccount.confirmEmailChange('e2e-solo-new@voidcanvas.test', '246810', '135791'); return 'ok' } catch (e) { return e.message } })
  ok('email change confirmed with the codes', r === 'ok', r)
  await S.reload(); await S.waitForTimeout(1500); await openAccount(S); await S.waitForTimeout(1500)
  ok('the account shows the new address', /e2e-solo-new@voidcanvas.test/.test(await text(S)))
  await S.click('button:has-text("Delete…")'); await S.waitForTimeout(500)
  await S.fill('input[aria-label="Type DELETE"]', 'DELETE'); await S.click('button:has-text("Delete my account")'); await S.waitForTimeout(3000)
  ok('account deleted, back to sign in', /Send a sign-in code/.test(await text(S)))
  const keyLeft = await S.evaluate(() => new Promise(res => { const q = indexedDB.open('voidcanvas'); q.onsuccess = () => { const t = q.result.transaction('account').objectStore('account').getAll(); t.onsuccess = () => res(t.result.length) } }))
  ok('no key left on the device', keyLeft === 0)
}

await b.close()
if (errors.length) { console.log('ERRORS', errors.slice(0, 5)); process.exitCode = 1 } else console.log('no page errors')
