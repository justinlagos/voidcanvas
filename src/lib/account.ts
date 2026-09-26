// ─── Optional account ──────────────────────────────────────────────
// Sign in with an emailed code. The account holds keys and encrypted data only; nothing readable.
// Talks to Supabase Auth and the database over plain fetch, so no client library ships to everyone.
// States:
//   off          private session, or storage blocked: accounts are not offered
//   signed-out   no session on this device
//   needs-setup  signed in for the first time: make the recovery key
//   locked       signed in, the account has keys, but this device does not have them yet
//   ready        signed in with the account key on this device
// Design: docs/accounts-and-keys.md.

import { create } from 'zustand'
import { SUPABASE_KEY, SUPABASE_URL } from './analytics'
import {
  approvePairing, checkAccountKey, createAccountKeys, finishPairing, formatRecovery, newRecoveryKey, parsePairingCode,
  openIdentity, startPairing, unlockWithRecovery, VaultError, type KeysRecord, type PairingRow, type PairingStart,
} from './vault'
export { formatRecovery }

export type AccountStatus = 'loading' | 'off' | 'signed-out' | 'needs-setup' | 'locked' | 'ready'
export interface Device { id: string; name: string; platform: string; created_at: string; last_seen: string }

interface Session { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string } }
interface LocalKeys { id: 'self'; userId: string; accountKey: Uint8Array; deviceId: string }

const SESSION_KEY = 'vc-account'
const DEVICE_KEY = 'vc-account-device'

export class AccountError extends Error { constructor(message: string, public code?: string) { super(message) } }

// ─── Session ───────────────────────────────────────────────────────

let session: Session | null = null
function readSession(): Session | null { try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null } catch { return null } }
function writeSession(s: Session | null) { session = s; try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ } }

const toSession = (r: any): Session => ({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Date.now() + (r.expires_in ?? 3600) * 1000, user: { id: r.user.id, email: r.user.email } })

async function authPost(path: string, body: unknown, bearer?: string, method = 'POST') {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method, headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AccountError(authMessage(res.status, data))
  return data
}

function authMessage(status: number, data: any): string {
  const m = String(data?.msg || data?.error_description || data?.message || '')
  const code = String(data?.error_code || '')
  if (code === 'email_address_invalid') return 'That email address cannot receive mail. Check it and try again.'
  if (code === 'email_exists' || code === 'user_already_exists') return 'Another account already uses that email address.'
  if (code === 'otp_expired') return 'That code is wrong or has expired. Check the latest email, or send a new code.'
  if (code.startsWith('over_') && code.includes('rate_limit')) return 'Too many tries. Wait a minute, then try again.'
  if (status === 429 || /rate limit|security purposes/i.test(m)) return 'Too many tries. Wait a minute, then try again.'
  if (/expired|invalid/i.test(m)) return 'That code is wrong or has expired. Check the latest email, or send a new code.'
  if (/already.*registered|exists/i.test(m)) return 'Another account already uses that email address.'
  if (/email/i.test(m) && /valid/i.test(m)) return 'Check the email address.'
  if (/sending|smtp|not authorized/i.test(m)) return 'The email could not be sent. Try again later.'
  return m || 'Could not reach Voidcanvas. Check your connection and try again.'
}

let refreshing: Promise<void> | null = null
async function freshToken(): Promise<string> {
  if (!session) throw new AccountError('Not signed in.')
  if (session.expires_at - Date.now() > 60_000) return session.access_token
  refreshing ??= (async () => {
    try { writeSession(toSession(await authPost('token?grant_type=refresh_token', { refresh_token: session!.refresh_token }))) }
    catch (e) { if (e instanceof AccountError && !/connection/i.test(e.message)) { writeSession(null); useAccount.setState({ status: 'signed-out', email: null }) } throw e }
    finally { refreshing = null }
  })()
  await refreshing
  return session!.access_token
}

async function rest<T = any>(table: string, query = '', init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const token = await freshToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.prefer ? { Prefer: init.prefer } : {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const code = String(err?.message ?? '')
    if (code === 'reauth_needed') throw new AccountError('For your safety, confirm it is you with a new sign-in code first.', code)
    if (code === 'sole_owner') throw new AccountError('You are the only owner of a team with other members. Make someone else an owner, or remove the members, first.', code)
    throw new AccountError(res.status === 401 ? 'Your sign-in has expired. Sign in again.' : 'Could not reach Voidcanvas. Check your connection and try again.', code || String(res.status))
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ─── Local keys (IndexedDB, via the same database as designs) ──────

const idb = () => import('@/editor/io').then(m => m.idb)
const loadLocal = async () => (await idb()).get<LocalKeys>('account', 'self').catch(() => undefined)
const saveLocal = async (k: LocalKeys) => (await idb()).put('account', k)
const clearLocal = async () => (await idb()).del('account', 'self').catch(() => {})

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
    return id
  } catch { return crypto.randomUUID() }
}

export function deviceName(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Device'
  if (process.env.NEXT_PUBLIC_DESKTOP) return `Voidcanvas app on ${os}`
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${br} on ${os}`
}
const platform = () => (process.env.NEXT_PUBLIC_DESKTOP ? 'desktop' : /Mobi|Android|iPhone|iPad/.test(typeof navigator === 'undefined' ? '' : navigator.userAgent) ? 'mobile' : 'web')

// ─── The store ─────────────────────────────────────────────────────

interface AccountState {
  status: AccountStatus
  email: string | null
  userId: string | null
  /** Pending first-time setup: the recovery key is shown until confirmed, then forgotten. */
  setup: { recovery: string; accountKey: Uint8Array; record: KeysRecord } | null
  /** Pending pairing on this (new) device. */
  pairing: { code: string; url: string; expiresAt: number } | null
  /** Pending key replacement (lost device): the new recovery key is shown until confirmed. */
  rotation: { recovery: string; accountKey: Uint8Array; record: KeysRecord; oldVersion: number } | null
}

export const useAccount = create<AccountState>(() => ({ status: 'loading', email: null, userId: null, setup: null, pairing: null, rotation: null }))
const set = useAccount.setState

let accountKey: Uint8Array | null = null
let keysRecord: KeysRecord | null = null
let identity: CryptoKey | null = null
/** This person's identity key (for team keys), once the device is unlocked. */
export async function currentIdentity(): Promise<{ privateKey: CryptoKey; publicKey: JsonWebKey } | null> {
  if (!accountKey) return null
  keysRecord ??= await getRecord()
  if (!keysRecord) return null
  identity ??= await openIdentity(session!.user.id, keysRecord, accountKey)
  return { privateKey: identity, publicKey: keysRecord.public_key }
}
/** The account key, when this device has it. For encrypting the person's own data. */
export const currentAccountKey = () => accountKey
export const currentUserId = () => useAccount.getState().userId

let started = false
/** Work out where this device stands. Safe to call more than once. */
export async function initAccount(force = false): Promise<void> {
  if (started && !force) return
  started = true
  const { isPrivate, initPrivateFromSession } = await import('@/editor/io')
  initPrivateFromSession()
  if (isPrivate() || typeof indexedDB === 'undefined') { set({ status: 'off' }); return }
  session = readSession()
  if (!session) { set({ status: 'signed-out', email: null, userId: null }); return }
  set({ email: session.user.email, userId: session.user.id })
  try { await afterSignIn() } catch { set({ status: accountKey ? 'ready' : 'locked' }) }
}

async function getRecord(): Promise<KeysRecord | null> {
  const rows = await rest<KeysRecord[]>('vc_keys', 'select=public_key,wrapped_identity,recovery_wrapped_key,key_version')
  return rows?.[0] ?? null
}

async function afterSignIn() {
  const userId = session!.user.id
  const record = await getRecord()
  if (!record) { set({ status: 'needs-setup' }); return }
  const local = await loadLocal()
  if (local?.userId === userId && (await checkAccountKey(userId, record, local.accountKey))) { await becomeReady(local.accountKey); return }
  accountKey = null
  set({ status: 'locked' })
}

async function becomeReady(key: Uint8Array) {
  accountKey = key; identity = null; keysRecord = null
  await saveLocal({ id: 'self', userId: session!.user.id, accountKey: key, deviceId: deviceId() })
  await registerDevice().catch(() => {})
  set({ status: 'ready', setup: null, pairing: null })
  import('./settings-sync').then(m => m.startSettingsSync()).catch(() => {})
  import('./teams').then(m => m.loadTeams()).catch(() => {})
}

// ─── Signing in ────────────────────────────────────────────────────

export async function sendCode(email: string) {
  await authPost('otp', { email: email.trim(), create_user: true })
}

export async function verifyCode(email: string, code: string) {
  writeSession(toSession(await authPost('verify', { type: 'email', email: email.trim(), token: code.replace(/\s/g, '') })))
  set({ email: session!.user.email, userId: session!.user.id })
  await afterSignIn()
  import('./analytics').then(m => m.track('account.signin')).catch(() => {})
}

/** For automated tests only: a test account with a password. */
export async function signInWithPassword(email: string, password: string) {
  writeSession(toSession(await authPost('token?grant_type=password', { email, password })))
  set({ email: session!.user.email, userId: session!.user.id })
  await afterSignIn()
}

export async function signOut() {
  const token = session?.access_token
  if (session) await rest('vc_devices', `id=eq.${deviceId()}`, { method: 'DELETE' }).catch(() => {})
  if (token) await authPost('logout', {}, token).catch(() => {})
  import('./settings-sync').then(m => m.stopSettingsSync()).catch(() => {})
  writeSession(null); accountKey = null; keysRecord = null; identity = null; await clearLocal(); import('./teams').then(m => m.clearTeams()).catch(() => {})
  set({ status: 'signed-out', email: null, userId: null, setup: null, pairing: null })
}

// ─── First device: recovery key ────────────────────────────────────

export async function beginSetup() {
  const { accountKey: key, recoverySecret, record } = await createAccountKeys(session!.user.id)
  set({ setup: { recovery: formatRecovery(recoverySecret), accountKey: key, record } })
}

/** After the person has kept the recovery key and typed its last group back. */
export async function finishSetup(lastGroup: string) {
  const s = useAccount.getState().setup; if (!s) throw new AccountError('Start again.')
  if (lastGroup.trim().toUpperCase() !== s.recovery.split('-').pop()) throw new AccountError('That does not match the last group of your recovery key.')
  await rest('vc_keys', '', { method: 'POST', body: JSON.stringify(s.record), prefer: 'return=minimal' })
  await becomeReady(s.accountKey)
  import('./analytics').then(m => m.track('account.setup')).catch(() => {})
}

// ─── New device: recovery key or pairing ───────────────────────────

export async function unlockWithRecoveryKey(text: string) {
  const record = await getRecord(); if (!record) throw new AccountError('This account has no keys yet.')
  try { await becomeReady(await unlockWithRecovery(session!.user.id, record, text)) } catch (e) {
    throw new AccountError(e instanceof VaultError ? e.message : 'Could not unlock.')
  }
}

let pairingState: PairingStart | null = null
let pairingTimer: ReturnType<typeof setInterval> | null = null

export async function startDevicePairing(origin = 'https://voidcanvas.netlify.app') {
  cancelDevicePairing()
  const start = await startPairing()
  await rest('vc_pairings', '', { method: 'POST', body: JSON.stringify({ ...start.row, new_device: deviceName() }), prefer: 'return=minimal' })
  pairingState = start
  set({ pairing: { code: start.code, url: `${origin}/pair#${start.code}`, expiresAt: Date.now() + 10 * 60_000 } })
  pairingTimer = setInterval(async () => {
    if (!pairingState) return
    if (Date.now() > (useAccount.getState().pairing?.expiresAt ?? 0)) { cancelDevicePairing(); return }
    try {
      const rows = await rest<PairingRow[]>('vc_pairings', `id=eq.${pairingState.id}&select=*`)
      const row = rows?.[0]
      if (!row?.payload) return
      const key = await finishPairing(pairingState, row)
      await rest('vc_pairings', `id=eq.${pairingState.id}`, { method: 'DELETE' }).catch(() => {})
      cancelDevicePairing(false)
      await becomeReady(key)
    } catch { /* keep waiting; a bad reply is ignored */ }
  }, 2000)
}

export function cancelDevicePairing(clear = true) {
  if (pairingTimer) clearInterval(pairingTimer)
  if (clear && pairingState) rest('vc_pairings', `id=eq.${pairingState.id}`, { method: 'DELETE' }).catch(() => {})
  pairingTimer = null; pairingState = null
  set({ pairing: null })
}

/** On a device that is ready: look up a code shown on the new device. */
export async function lookUpPairing(code: string): Promise<{ device: string; ageSeconds: number }> {
  const { id } = parsePairingCode(code)
  const rows = await rest<(PairingRow & { created_at: string })[]>('vc_pairings', `id=eq.${id}&select=*`)
  const row = rows?.[0]
  if (!row) throw new AccountError('No request with that code. It may have expired, or the new device is signed in to a different account.')
  return { device: row.new_device || 'New device', ageSeconds: Math.round((Date.now() - Date.parse(row.created_at)) / 1000) }
}

export async function approveDevice(code: string) {
  if (!accountKey) throw new AccountError('This device is not unlocked.')
  const { id } = parsePairingCode(code)
  const rows = await rest<PairingRow[]>('vc_pairings', `id=eq.${id}&select=*`)
  const row = rows?.[0]; if (!row) throw new AccountError('That request has expired. Start again on the new device.')
  let reply
  try { reply = await approvePairing(code, row, accountKey) } catch (e) { throw new AccountError(e instanceof VaultError ? e.message : 'Could not approve.') }
  await rest('vc_pairings', `id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(reply), prefer: 'return=minimal' })
  import('./analytics').then(m => m.track('account.pair')).catch(() => {})
}

// ─── Recovery key replacement, devices ─────────────────────────────

export async function makeNewRecoveryKey(): Promise<string> {
  if (!accountKey) throw new AccountError('This device is not unlocked.')
  const { recoverySecret, recovery_wrapped_key } = await newRecoveryKey(session!.user.id, accountKey)
  await rest('vc_keys', `user_id=eq.${session!.user.id}`, { method: 'PATCH', body: JSON.stringify({ recovery_wrapped_key }), prefer: 'return=minimal' })
  return formatRecovery(recoverySecret)
}

async function registerDevice() {
  await rest('vc_devices', 'on_conflict=id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ id: deviceId(), name: deviceName(), platform: platform(), last_seen: new Date().toISOString() }),
  })
}

export const thisDeviceId = () => deviceId()
export const listDevices = () => rest<Device[]>('vc_devices', 'select=id,name,platform,created_at,last_seen&order=last_seen.desc')
export const forgetDevice = (id: string) => rest('vc_devices', `id=eq.${id}`, { method: 'DELETE' })

// ─── Confirming it is you ──────────────────────────────────────────
// Deleting the account needs a sign-in from the last 10 minutes (checked again by the server).

/** Seconds since this session last proved it was the person (email code or password), from the token's amr claim. */
export function secondsSinceSignIn(): number {
  try {
    const payload = JSON.parse(atob(session!.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const t = Math.max(...(payload.amr ?? []).map((a: any) => Number(a.timestamp) || 0))
    return t > 0 ? Date.now() / 1000 - t : Infinity
  } catch { return Infinity }
}
export const needsFreshSignIn = () => secondsSinceSignIn() > 540

export async function sendConfirmCode() {
  if (!session) throw new AccountError('Not signed in.')
  await authPost('otp', { email: session.user.email, create_user: false })
}

/** Replace the session with a fresh one from an emailed code. Keys on this device are unchanged. */
export async function confirmWithCode(code: string) {
  if (!session) throw new AccountError('Not signed in.')
  writeSession(toSession(await authPost('verify', { type: 'email', email: session.user.email, token: code.replace(/\s/g, '') })))
}

// ─── Deleting the account ──────────────────────────────────────────

/** Delete the account and everything it stores on the server. Designs on devices are not touched. */
export async function deleteAccount() {
  await freshToken()
  if (needsFreshSignIn()) throw new AccountError('For your safety, confirm it is you with a new sign-in code first.', 'reauth_needed')
  await import('./teams').then(m => m.deleteSoloWorkspaceFiles()).catch(() => {})
  await import('./share').then(m => m.deleteMyShares(true)).catch(() => {})
  await rest('rpc/vc_delete_account', '', { method: 'POST', body: '{}' })
  import('./analytics').then(m => m.track('account.delete')).catch(() => {})
  import('./settings-sync').then(m => m.stopSettingsSync()).catch(() => {})
  writeSession(null); accountKey = null; keysRecord = null; identity = null; await clearLocal(); import('./teams').then(m => m.clearTeams()).catch(() => {})
  set({ status: 'signed-out', email: null, userId: null, setup: null, pairing: null, rotation: null })
}

// ─── Locking out a lost device ─────────────────────────────────────
// A new account key, identity key and recovery key; everything the account stores is sealed again with them;
// every other session is signed out. The lost device's copy of the old key opens nothing on the server any more.
// The person's other devices sign in again and are approved from this one.

export async function beginRotation() {
  if (!accountKey) throw new AccountError('This device is not unlocked.')
  const old = await getRecord(); if (!old) throw new AccountError('This account has no keys yet.')
  const { accountKey: key, recoverySecret, record } = await createAccountKeys(session!.user.id)
  set({ rotation: { recovery: formatRecovery(recoverySecret), accountKey: key, record: { ...record, key_version: (old.key_version ?? 1) + 1 }, oldVersion: old.key_version ?? 1 } })
}

export function cancelRotation() { set({ rotation: null }) }

export async function finishRotation(lastGroup: string) {
  const r = useAccount.getState().rotation; if (!r) throw new AccountError('Start again.')
  if (lastGroup.trim().toUpperCase() !== r.recovery.split('-').pop()) throw new AccountError('That does not match the last group of your new recovery key.')
  const uid = session!.user.id
  const oldIdentity = await currentIdentity()
  // Only replace the keys we started from, so two devices cannot rotate over each other.
  const rows = await rest<KeysRecord[]>('vc_keys', `user_id=eq.${uid}&key_version=eq.${r.oldVersion}`, { method: 'PATCH', body: JSON.stringify(r.record), prefer: 'return=representation' })
  if (!rows?.length) { set({ rotation: null }); throw new AccountError('Your keys changed on another device. Close this and try again.') }
  // Team keys held for this person are sealed to the old identity: seal them again for the new one.
  accountKey = r.accountKey; keysRecord = r.record; identity = null
  if (oldIdentity) await import('./teams').then(m => m.resealMemberships(oldIdentity.privateKey, r.record.public_key)).catch(() => {})
  await saveLocal({ id: 'self', userId: uid, accountKey: r.accountKey, deviceId: deviceId() })
  await authPost('logout?scope=others', {}, await freshToken()).catch(() => {})
  await rest('vc_devices', `id=neq.${deviceId()}`, { method: 'DELETE' }).catch(() => {})
  await import('./settings-sync').then(m => m.pushSettingsNow()).catch(() => {})
  set({ rotation: null, status: 'ready' })
  import('./analytics').then(m => m.track('account.rotate')).catch(() => {})
}

// ─── Changing the email address ────────────────────────────────────
// Supabase sends a code to the new address, and one to the current address too when "Secure email change" is on.

export async function requestEmailChange(newEmail: string) {
  if (!session) throw new AccountError('Not signed in.')
  if (newEmail.trim().toLowerCase() === session.user.email.toLowerCase()) throw new AccountError('That is already your email address.')
  await authPost('user', { email: newEmail.trim() }, await freshToken(), 'PUT')
}

/** Enter the code from the new address, and from the current address if one arrived there too. */
export async function confirmEmailChange(newEmail: string, codeNew: string, codeCurrent?: string) {
  if (!session) throw new AccountError('Not signed in.')
  const current = session.user.email
  let last: any = null
  if (codeCurrent?.trim()) last = await authPost('verify', { type: 'email_change', email: current, token: codeCurrent.replace(/\s/g, '') })
  last = await authPost('verify', { type: 'email_change', email: newEmail.trim(), token: codeNew.replace(/\s/g, '') })
  if (last?.access_token) writeSession(toSession(last))
  const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${await freshToken()}` } }).then(r => r.json())
  if (String(me?.email).toLowerCase() !== newEmail.trim().toLowerCase()) {
    throw new AccountError(me?.new_email ? 'One more code is needed: check the inbox of your current address too.' : 'The change did not go through. Request a new code.')
  }
  writeSession({ ...session!, user: { ...session!.user, email: me.email } })
  set({ email: me.email })
}

// ─── Encrypted rows for other modules (settings sync) ──────────────

export const accountRest = rest
/** Authorised fetch to another Supabase service (Storage). */
export async function accountFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await freshToken()
  return fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> ?? {}) } })
}
export const isSignedIn = () => !!session

// Automated tests sign in with a password; the same public API anyone can call.
if (typeof window !== 'undefined') (window as any).__vcAccount = { signInWithPassword, confirmEmailChange }
