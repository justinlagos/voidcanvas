import { describe, expect, it } from 'vitest'
import {
  approvePairing, base32, checkAccountKey, createAccountKeys, finishPairing, formatRecovery, newRecoveryKey, normaliseCode,
  open, openJson, parsePairingCode, parseRecovery, randomBytes, seal, sealJson, startPairing, unbase32, unlockWithRecovery, VaultError,
} from '../vault'

const USER = '6f1c2b8e-0000-4000-8000-000000000001'

describe('encoding', () => {
  it('base32 round-trips', () => {
    for (const n of [1, 5, 10, 32]) { const b = randomBytes(n); expect(unbase32(base32(b))).toEqual(b) }
  })
  it('tidies typed codes', () => {
    expect(normaliseCode(' ab-cd 01 8 ')).toBe('ABCDOIB')
  })
})

describe('sealing', () => {
  it('opens what it sealed, and nothing else', async () => {
    const k = randomBytes(32)
    const s = await seal(k, new Uint8Array([1, 2, 3]), 'a')
    expect(s.startsWith('v1.')).toBe(true)
    expect(await open(k, s, 'a')).toEqual(new Uint8Array([1, 2, 3]))
    await expect(open(k, s, 'b')).rejects.toBeInstanceOf(VaultError) // wrong purpose
    await expect(open(randomBytes(32), s, 'a')).rejects.toBeInstanceOf(VaultError) // wrong key
    const [v, iv, ct] = s.split('.')
    const flipped = `${v}.${iv}.${ct.slice(0, -2)}${ct.slice(-2) === 'AA' ? 'AB' : 'AA'}`
    await expect(open(k, flipped, 'a')).rejects.toBeInstanceOf(VaultError) // tampered
  })
  it('seals JSON', async () => {
    const k = randomBytes(32)
    expect(await openJson(k, await sealJson(k, { a: 1 }, 'settings'), 'settings')).toEqual({ a: 1 })
  })
})

describe('account keys and recovery', () => {
  it('sets up an account and unlocks it on a new device with the recovery key', async () => {
    const { accountKey, recoverySecret, record } = await createAccountKeys(USER)
    expect(record.public_key).toEqual({ crv: 'P-256', kty: 'EC', x: expect.any(String), y: expect.any(String) })
    expect(JSON.stringify(record)).not.toContain(formatRecovery(recoverySecret).slice(0, 8)) // server never sees the recovery key
    const text = formatRecovery(recoverySecret)
    expect(text).toMatch(/^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/)
    // Typed sloppily: lower case, spaces instead of dashes.
    const unlocked = await unlockWithRecovery(USER, record, text.toLowerCase().replace(/-/g, ' '))
    expect(unlocked).toEqual(accountKey)
    expect(await checkAccountKey(USER, record, unlocked)).toBe(true)
  })

  it('refuses a wrong recovery key, or one used against another account', async () => {
    const { record, recoverySecret } = await createAccountKeys(USER)
    await expect(unlockWithRecovery(USER, record, formatRecovery(randomBytes(32)))).rejects.toThrow(/does not match/)
    await expect(unlockWithRecovery('someone-else', record, formatRecovery(recoverySecret))).rejects.toThrow(/does not match/)
    expect(() => parseRecovery('ABCD')).toThrow(/52/)
  })

  it('a new recovery key replaces the old one', async () => {
    const { accountKey, recoverySecret, record } = await createAccountKeys(USER)
    const fresh = await newRecoveryKey(USER, accountKey)
    const updated = { ...record, recovery_wrapped_key: fresh.recovery_wrapped_key }
    expect(await unlockWithRecovery(USER, updated, formatRecovery(fresh.recoverySecret))).toEqual(accountKey)
    await expect(unlockWithRecovery(USER, updated, formatRecovery(recoverySecret))).rejects.toThrow()
  })
})

describe('pairing', () => {
  it('hands the account key to a new device through the server without the server reading it', async () => {
    const { accountKey } = await createAccountKeys(USER)
    const start = await startPairing()
    expect(start.code).toMatch(/^([A-Z2-7]{4}-){6}[A-Z2-7]{2}$/)
    expect(parsePairingCode(start.code).id).toBe(start.id)
    const server: any = { ...start.row } // what the server stores
    Object.assign(server, await approvePairing(start.code.toLowerCase(), server, accountKey))
    expect(JSON.stringify(server)).not.toContain(Buffer.from(accountKey).toString('base64url'))
    expect(await finishPairing(start, server)).toEqual(accountKey)
  })

  it('detects a server that swaps in its own key', async () => {
    const { accountKey } = await createAccountKeys(USER)
    const start = await startPairing()
    const evil = await startPairing()
    const row = { ...start.row, new_pub: evil.row.new_pub } // MAC no longer matches
    await expect(approvePairing(start.code, row, accountKey)).rejects.toThrow(/could not be verified/)
  })

  it('detects a tampered reply and a wrong code', async () => {
    const { accountKey } = await createAccountKeys(USER)
    const start = await startPairing()
    const reply = await approvePairing(start.code, start.row, accountKey)
    const other = await startPairing()
    const swapped = await approvePairing(other.code, other.row, randomBytes(32))
    await expect(finishPairing(start, { ...start.row, ...reply, old_pub: swapped.old_pub })).rejects.toThrow(/could not be verified/)
    await expect(approvePairing(other.code, start.row, accountKey)).rejects.toThrow(/different request/)
  })
})

describe('sealed boxes and files', () => {
  it('seals to an identity key that only its holder can open', async () => {
    const { openIdentity, sealTo, openFrom } = await import('../vault')
    const a = await createAccountKeys(USER)
    const b = await createAccountKeys('other-user')
    const id = await openIdentity(USER, a.record, a.accountKey)
    const secret = randomBytes(32)
    const box = await sealTo(a.record.public_key, secret, 'wskey:w1:1')
    expect(await openFrom(id, box, 'wskey:w1:1')).toEqual(secret)
    await expect(openFrom(await openIdentity('other-user', b.record, b.accountKey), box, 'wskey:w1:1')).rejects.toThrow()
    await expect(openFrom(id, box, 'wskey:w1:2')).rejects.toThrow()
  })
  it('seals files and names them without revealing the content', async () => {
    const { sealBytes, openBytes, fileId } = await import('../vault')
    const k = randomBytes(32), k2 = randomBytes(32), data = randomBytes(1000)
    expect(await openBytes(k, await sealBytes(k, data, 'file:w'), 'file:w')).toEqual(data)
    expect(await fileId(k, data)).toBe(await fileId(k, data))
    expect(await fileId(k, data)).not.toBe(await fileId(k2, data))
    expect((await fileId(k, data)).length).toBe(43)
  })
})
