// ─── Keys and end-to-end encryption ────────────────────────────────
// Everything here runs on the device, with the browser's own Web Crypto. The server only ever stores
// what these functions produce: sealed (encrypted and authenticated) text it cannot read.
// Full design: docs/accounts-and-keys.md.
//
//   account key    32 random bytes. Encrypts everything that belongs to the person (settings now;
//                  workspace keys and files later). Kept on each of their devices.
//   identity key   ECDH P-256 key pair. The public half is stored openly so teams can share keys with
//                  this person later; the private half is sealed with the account key.
//   recovery key   32 random bytes shown once, as 52 letters and digits. Seals a copy of the account key
//                  on the server, for when every device is lost. Voidcanvas never sees it.
//
// Sealed text looks like "v1.<iv>.<ciphertext>" (base64url). AES-256-GCM, with additional data that binds
// each value to what it is ("identity", "settings", the user id), so values cannot be swapped around.

const subtle = () => globalThis.crypto.subtle
const enc = new TextEncoder()
const dec = new TextDecoder()

export class VaultError extends Error {}

// ─── Encoding ──────────────────────────────────────────────────────

export function b64u(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function unb64u(s: string): Uint8Array {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(t + '==='.slice((t.length + 3) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]; bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}
export function unbase32(s: string): Uint8Array {
  let bits = 0, value = 0
  const out: number[] = []
  for (let i = 0; i < s.length; i++) {
    const v = B32.indexOf(s[i]); if (v < 0) throw new VaultError('Unexpected character')
    value = (value << 5) | v; bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return new Uint8Array(out)
}
/** Tidy typed codes: upper case, no spaces or dashes, and the look-alikes base32 leaves out. */
export function normaliseCode(s: string): string {
  return s.toUpperCase().replace(/[\s\-_.]/g, '').replace(/0/g, 'O').replace(/1/g, 'I').replace(/8/g, 'B')
}

export const randomBytes = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n))

// ─── Sealing ───────────────────────────────────────────────────────

const aesKey = (raw: Uint8Array, usages: KeyUsage[] = ['encrypt', 'decrypt']) =>
  subtle().importKey('raw', raw as BufferSource, 'AES-GCM', false, usages)

async function hkdf(secret: Uint8Array, salt: string, info: string): Promise<Uint8Array> {
  const k = await subtle().importKey('raw', secret as BufferSource, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode(salt), info: enc.encode(info) }, k, 256))
}

export async function seal(keyRaw: Uint8Array, data: Uint8Array, aad: string): Promise<string> {
  const iv = randomBytes(12)
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, await aesKey(keyRaw, ['encrypt']), data as BufferSource))
  return `v1.${b64u(iv)}.${b64u(ct)}`
}

export async function open(keyRaw: Uint8Array, sealed: string, aad: string): Promise<Uint8Array> {
  const [v, iv, ct] = sealed.split('.')
  if (v !== 'v1' || !iv || !ct) throw new VaultError('Unknown sealed format')
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: unb64u(iv) as BufferSource, additionalData: enc.encode(aad) }, await aesKey(keyRaw, ['decrypt']), unb64u(ct) as BufferSource))
  } catch { throw new VaultError('Could not decrypt') }
}

export const sealJson = (keyRaw: Uint8Array, value: unknown, aad: string) => seal(keyRaw, enc.encode(JSON.stringify(value)), aad)
export const openJson = async <T>(keyRaw: Uint8Array, sealed: string, aad: string): Promise<T> => JSON.parse(dec.decode(await open(keyRaw, sealed, aad)))

// ─── Recovery key ──────────────────────────────────────────────────

/** 32 bytes as 52 base32 characters in groups of four: ABCD-EFGH-… */
export function formatRecovery(secret: Uint8Array): string {
  return base32(secret).match(/.{1,4}/g)!.join('-')
}

export function parseRecovery(text: string): Uint8Array {
  const s = normaliseCode(text)
  if (s.length !== 52) throw new VaultError('A recovery key has 52 letters and numbers.')
  const bytes = unbase32(s)
  if (bytes.length !== 32) throw new VaultError('That is not a recovery key.')
  return bytes
}

const recoveryWrapKey = (secret: Uint8Array, userId: string) => hkdf(secret, 'voidcanvas-recovery-v1', userId)

// ─── Account setup and unlocking ───────────────────────────────────

export interface KeysRecord { public_key: JsonWebKey; wrapped_identity: string; recovery_wrapped_key: string; key_version: number }

/** Canonical public JWK: only the fields that define the key, in a fixed order. */
export const publicJwk = (j: JsonWebKey): JsonWebKey => ({ crv: j.crv, kty: j.kty, x: j.x, y: j.y })

/** First device: make the account key, identity key and recovery key. The record goes to the server. */
export async function createAccountKeys(userId: string): Promise<{ accountKey: Uint8Array; recoverySecret: Uint8Array; record: KeysRecord }> {
  const accountKey = randomBytes(32)
  const recoverySecret = randomBytes(32)
  const pair = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
  const priv = await subtle().exportKey('jwk', pair.privateKey)
  const pub = await subtle().exportKey('jwk', pair.publicKey)
  const record: KeysRecord = {
    public_key: publicJwk(pub),
    wrapped_identity: await sealJson(accountKey, priv, `identity:${userId}`),
    recovery_wrapped_key: await seal(await recoveryWrapKey(recoverySecret, userId), accountKey, `recovery:${userId}`),
    key_version: 1,
  }
  return { accountKey, recoverySecret, record }
}

/** New device, no other device to hand: unlock the account key with the recovery key. */
export async function unlockWithRecovery(userId: string, record: KeysRecord, recoveryText: string): Promise<Uint8Array> {
  const secret = parseRecovery(recoveryText)
  try { return await open(await recoveryWrapKey(secret, userId), record.recovery_wrapped_key, `recovery:${userId}`) } catch {
    throw new VaultError('That recovery key does not match this account.')
  }
}

/** Replace the recovery key. The old one stops working as soon as the new record is saved. */
export async function newRecoveryKey(userId: string, accountKey: Uint8Array): Promise<{ recoverySecret: Uint8Array; recovery_wrapped_key: string }> {
  const recoverySecret = randomBytes(32)
  return { recoverySecret, recovery_wrapped_key: await seal(await recoveryWrapKey(recoverySecret, userId), accountKey, `recovery:${userId}`) }
}

/** Check an account key really belongs to this record (it can open the identity key). */
export async function checkAccountKey(userId: string, record: KeysRecord, accountKey: Uint8Array): Promise<boolean> {
  try { await open(accountKey, record.wrapped_identity, `identity:${userId}`); return true } catch { return false }
}

// ─── Pairing a new device ──────────────────────────────────────────
// The new device makes a one-time key pair and a pairing code (an id and a secret). It stores its public
// key on the server with a MAC made from the secret. The code travels only on screen: typed or scanned.
// An existing device reads the row, checks the MAC (so the server cannot swap keys), and seals the
// account key to the new device with ECDH. The new device checks the reply's MAC and opens it.

export interface PairingStart { id: string; secret: Uint8Array; code: string; privateKey: CryptoKey; row: { id: string; new_pub: JsonWebKey; new_mac: string } }
export interface PairingRow { id: string; new_pub: JsonWebKey; new_mac: string; new_device?: string | null; old_pub?: JsonWebKey | null; payload?: string | null; payload_mac?: string | null }

async function hmac(secret: Uint8Array, msg: string): Promise<string> {
  const k = await subtle().importKey('raw', secret as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64u(new Uint8Array(await subtle().sign('HMAC', k, enc.encode(msg))))
}
async function hmacOk(secret: Uint8Array, msg: string, mac: string): Promise<boolean> {
  const k = await subtle().importKey('raw', secret as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  try { return await subtle().verify('HMAC', k, unb64u(mac) as BufferSource, enc.encode(msg)) } catch { return false }
}
const jwkText = (j: JsonWebKey) => JSON.stringify(publicJwk(j))

/** The code shown on the new device: 10-character id, then 16-character secret, in groups of four and two. */
export function formatPairingCode(id: string, secret: Uint8Array): string {
  return `${id}${base32(secret)}`.match(/.{1,4}/g)!.join('-')
}
export function parsePairingCode(text: string): { id: string; secret: Uint8Array } {
  const s = normaliseCode(text)
  if (s.length !== 26) throw new VaultError('A pairing code has 26 letters and numbers.')
  return { id: s.slice(0, 10), secret: unbase32(s.slice(10)) }
}

export async function startPairing(): Promise<PairingStart> {
  const id = base32(randomBytes(7)).slice(0, 10)
  const secret = randomBytes(10)
  const pair = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
  const pub = publicJwk(await subtle().exportKey('jwk', pair.publicKey))
  const new_mac = await hmac(secret, `new|${id}|${jwkText(pub)}`)
  return { id, secret, code: formatPairingCode(id, secret), privateKey: pair.privateKey, row: { id, new_pub: pub, new_mac } }
}

async function pairingKey(own: CryptoKey, peer: JsonWebKey, secret: Uint8Array, id: string): Promise<Uint8Array> {
  const peerKey = await subtle().importKey('jwk', publicJwk(peer), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: peerKey }, own, 256))
  return hkdf(shared, b64u(secret), `voidcanvas-pair-v1|${id}`)
}

/** Existing device: check the new device's row and seal the account key to it. */
export async function approvePairing(code: string, row: PairingRow, accountKey: Uint8Array): Promise<{ old_pub: JsonWebKey; payload: string; payload_mac: string }> {
  const { id, secret } = parsePairingCode(code)
  if (row.id !== id) throw new VaultError('That code is for a different request.')
  if (!(await hmacOk(secret, `new|${id}|${jwkText(row.new_pub)}`, row.new_mac))) throw new VaultError('This request could not be verified. Start again on the new device.')
  const pair = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
  const old_pub = publicJwk(await subtle().exportKey('jwk', pair.publicKey))
  const payload = await seal(await pairingKey(pair.privateKey, row.new_pub, secret, id), accountKey, `pair:${id}`)
  const payload_mac = await hmac(secret, `old|${id}|${jwkText(old_pub)}|${payload}`)
  return { old_pub, payload, payload_mac }
}

/** New device: open the reply. Returns the account key. */
export async function finishPairing(start: PairingStart, row: PairingRow): Promise<Uint8Array> {
  if (!row.old_pub || !row.payload || !row.payload_mac) throw new VaultError('Not approved yet.')
  if (!(await hmacOk(start.secret, `old|${start.id}|${jwkText(row.old_pub)}|${row.payload}`, row.payload_mac))) throw new VaultError('The reply could not be verified. Start again.')
  return open(await pairingKey(start.privateKey, row.old_pub, start.secret, start.id), row.payload, `pair:${start.id}`)
}

// ─── Identity key, sealed boxes, files ─────────────────────────────
// A sealed box puts data where only the holder of an identity key can open it: a one-time ECDH key pair with
// the recipient's public key, HKDF, then AES-GCM. Used to hand workspace keys to team members.

/** Open this person's identity private key with their account key. */
export async function openIdentity(userId: string, record: KeysRecord, accountKey: Uint8Array): Promise<CryptoKey> {
  const jwk = await openJson<JsonWebKey>(accountKey, record.wrapped_identity, `identity:${userId}`)
  return subtle().importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
}

async function boxKey(own: CryptoKey, peer: JsonWebKey, aad: string): Promise<Uint8Array> {
  const peerKey = await subtle().importKey('jwk', publicJwk(peer), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: peerKey }, own, 256))
  return hkdf(shared, 'voidcanvas-box-v1', aad)
}

export async function sealTo(recipient: JsonWebKey, data: Uint8Array, aad: string): Promise<string> {
  const eph = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
  const ephPub = publicJwk(await subtle().exportKey('jwk', eph.publicKey))
  const sealed = await seal(await boxKey(eph.privateKey, recipient, aad), data, aad)
  return `b1.${b64u(new TextEncoder().encode(JSON.stringify(ephPub)))}.${sealed}`
}

export async function openFrom(identity: CryptoKey, box: string, aad: string): Promise<Uint8Array> {
  const [v, pub, ...rest] = box.split('.')
  if (v !== 'b1' || !pub || !rest.length) throw new VaultError('Unknown box format')
  const ephPub = JSON.parse(dec.decode(unb64u(pub))) as JsonWebKey
  return open(await boxKey(identity, ephPub, aad), rest.join('.'), aad)
}

/** Binary sealing for files: 12-byte IV then ciphertext. */
export async function sealBytes(keyRaw: Uint8Array, data: Uint8Array, aad: string): Promise<Uint8Array> {
  const iv = randomBytes(12)
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, await aesKey(keyRaw, ['encrypt']), data as BufferSource))
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12)
  return out
}
export async function openBytes(keyRaw: Uint8Array, data: Uint8Array, aad: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12) as BufferSource, additionalData: enc.encode(aad) }, await aesKey(keyRaw, ['decrypt']), data.subarray(12) as BufferSource))
  } catch { throw new VaultError('Could not decrypt') }
}

/** A file's name on the server: a keyed hash, so the server cannot tell which file it is. */
export async function fileId(keyRaw: Uint8Array, data: Uint8Array): Promise<string> {
  const k = await subtle().importKey('raw', keyRaw as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64u(new Uint8Array(await subtle().sign('HMAC', k, data as BufferSource))).slice(0, 43)
}

/** Invite links carry a secret; the workspace keys travel sealed with a key made from it. */
export const inviteKey = (secret: Uint8Array, id: string) => hkdf(secret, 'voidcanvas-invite-v1', id)
