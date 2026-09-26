// ─── Teams ─────────────────────────────────────────────────────────
// Shared workspaces for studios and agencies. Each workspace has its own key; every member holds it sealed
// to their identity key. Names, shared brands, jobs and files are sealed with the workspace key before they
// leave the device. Removing someone replaces the key, so anything written afterwards is closed to them.
// Design: docs/teams.md.

import { create } from 'zustand'
import { accountFetch, accountRest, currentIdentity, currentUserId, AccountError } from './account'
import {
  base32, b64u, inviteKey, normaliseCode, openFrom, openJson, randomBytes, sealJson, sealTo, seal, open, unb64u, unbase32, VaultError,
} from './vault'

export type Role = 'owner' | 'editor' | 'reviewer'
export interface Workspace { id: string; name: string; role: Role; keyVersion: number }
export interface Member { user_id: string; email: string; role: Role; public_key: JsonWebKey | null; created_at: string }
export interface Invite { id: string; email: string; role: Role; created_at: string; expires_at: string; accepted_at: string | null }

interface TeamsState { workspaces: Workspace[]; loaded: boolean }
export const useTeams = create<TeamsState>(() => ({ workspaces: [], loaded: false }))

/** Workspace keys by version, opened on this device. */
const keys = new Map<string, Map<number, Uint8Array>>()
export const workspaceKey = (ws: string, version?: number) => {
  const m = keys.get(ws); if (!m) return null
  return m.get(version ?? Math.max(...Array.from(m.keys()))) ?? null
}
export const latestVersion = (ws: string) => { const m = keys.get(ws); return m && m.size ? Math.max(...Array.from(m.keys())) : 0 }

const nameAad = (ws: string) => `name:${ws}`
const keyAad = (ws: string, v: number) => `wskey:${ws}:${v}`

export function clearTeams() {
  keys.clear(); useTeams.setState({ workspaces: [], loaded: false })
  try { localStorage.removeItem('vc-team-pulled') } catch { /* ignore */ }
  import('./team-sync').then(m => m.stopTeamSync()).catch(() => {})
}

// ─── Loading ───────────────────────────────────────────────────────

export async function loadTeams(): Promise<Workspace[]> {
  const me = currentUserId(); const id = await currentIdentity()
  if (!me || !id) { clearTeams(); return [] }
  const mine = await accountRest<{ workspace_id: string; role: Role }[]>('vc_members', `user_id=eq.${me}&select=workspace_id,role`)
  if (!mine.length) { keys.clear(); useTeams.setState({ workspaces: [], loaded: true }); return [] }
  const ids = mine.map(m => m.workspace_id).join(',')
  const [wss, rows] = await Promise.all([
    accountRest<{ id: string; name_sealed: string; key_version: number }[]>('vc_workspaces', `id=in.(${ids})&select=id,name_sealed,key_version`),
    accountRest<{ workspace_id: string; key_version: number; sealed: string }[]>('vc_member_keys', `user_id=eq.${me}&select=workspace_id,key_version,sealed`),
  ])
  keys.clear()
  for (const r of rows) {
    try {
      const k = await openFrom(id.privateKey, r.sealed, keyAad(r.workspace_id, r.key_version))
      if (!keys.has(r.workspace_id)) keys.set(r.workspace_id, new Map())
      keys.get(r.workspace_id)!.set(r.key_version, k)
    } catch { /* a key sealed to an older identity; resealMemberships fixes these */ }
  }
  const out: Workspace[] = []
  for (const w of wss) {
    const role = mine.find(m => m.workspace_id === w.id)!.role
    let name = 'Team'
    const k = workspaceKey(w.id, w.key_version) ?? workspaceKey(w.id)
    if (k) { try { name = new TextDecoder().decode(await open(k, w.name_sealed, nameAad(w.id))) } catch { name = 'Team (locked)' } }
    out.push({ id: w.id, name, role, keyVersion: w.key_version })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  useTeams.setState({ workspaces: out, loaded: true })
  return out
}

// ─── Creating and inviting ─────────────────────────────────────────

export async function createWorkspace(name: string): Promise<string> {
  const id = await currentIdentity(); if (!id) throw new AccountError('Unlock this device first.')
  const me = currentUserId()!
  const ws = crypto.randomUUID()
  const k = randomBytes(32)
  await accountRest('rpc/vc_create_workspace', '', { method: 'POST', body: JSON.stringify({ p_id: ws, p_name_sealed: await seal(k, new TextEncoder().encode(name.trim() || 'Team'), nameAad(ws)), p_public_key: id.publicKey }) })
  await accountRest('vc_member_keys', '', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({ workspace_id: ws, user_id: me, key_version: 1, sealed: await sealTo(id.publicKey, k, keyAad(ws, 1)) }) })
  await loadTeams()
  import('./analytics').then(m => m.track('team.create')).catch(() => {})
  return ws
}

/** Make an invite link for one email address. The link carries a secret; the server never sees it. */
export async function createInvite(ws: string, email: string, role: Exclude<Role, 'owner'>, origin = 'https://voidcanvas.netlify.app'): Promise<string> {
  const w = useTeams.getState().workspaces.find(x => x.id === ws); if (!w) throw new AccountError('Team not found.')
  const all = keys.get(ws); if (!all?.size) throw new AccountError('This device does not have the team key.')
  const id = base32(randomBytes(7)).slice(0, 10)
  const secret = randomBytes(16)
  const payload = { name: w.name, keys: Object.fromEntries(Array.from(all, ([v, k]) => [v, b64u(k)])) }
  const sealed_payload = await sealJson(await inviteKey(secret, id), payload, `invite:${id}`)
  await accountRest('vc_invites', '', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({ id, workspace_id: ws, email: email.trim().toLowerCase(), role, sealed_payload }) })
  import('./analytics').then(m => m.track('team.invite', { role })).catch(() => {})
  return `${origin}/join#${id}.${base32(secret)}`
}

export function parseInviteLink(text: string): { id: string; secret: Uint8Array } {
  const frag = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text
  const [rawId, rawSecret] = frag.split('.')
  const id = normaliseCode(rawId ?? ''), s = normaliseCode(rawSecret ?? '')
  if (id.length !== 10 || s.length !== 26) throw new VaultError('That invite link is incomplete. Copy the whole link.')
  return { id, secret: unbase32(s) }
}

const INVITE_ERRORS: Record<string, string> = {
  invite_not_found: 'That invite has expired or was withdrawn. Ask for a new one.',
  invite_used: 'That invite has already been used.',
  invite_other_email: 'That invite is for a different email address. Sign in with the address it was sent to.',
}

export async function acceptInvite(link: string): Promise<{ workspaceId: string; name: string; role: Role }> {
  const id = await currentIdentity(); if (!id) throw new AccountError('Unlock this device first.')
  const me = currentUserId()!
  const { id: inviteId, secret } = parseInviteLink(link)
  let rows: { workspace_id: string; role: Role; sealed_payload: string }[]
  try {
    rows = await accountRest('rpc/vc_accept_invite', '', { method: 'POST', body: JSON.stringify({ p_id: inviteId, p_public_key: id.publicKey }) })
  } catch (e) { throw new AccountError(INVITE_ERRORS[(e as AccountError).code ?? ''] ?? (e as Error).message) }
  const row = rows[0]
  let payload: { name: string; keys: Record<string, string> }
  try { payload = await openJson(await inviteKey(secret, inviteId), row.sealed_payload, `invite:${inviteId}`) } catch { throw new AccountError('That invite link is damaged. Ask for a new one.') }
  for (const [v, k] of Object.entries(payload.keys)) {
    await accountRest('vc_member_keys', 'on_conflict=workspace_id,user_id,key_version', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ workspace_id: row.workspace_id, user_id: me, key_version: Number(v), sealed: await sealTo(id.publicKey, unb64u(k), keyAad(row.workspace_id, Number(v))) }),
    })
  }
  await loadTeams()
  import('./analytics').then(m => m.track('team.join', { role: row.role })).catch(() => {})
  return { workspaceId: row.workspace_id, name: payload.name, role: row.role }
}

export const listMembers = (ws: string) => accountRest<Member[]>('vc_members', `workspace_id=eq.${ws}&select=user_id,email,role,public_key,created_at&order=created_at`)
export const listInvites = (ws: string) => accountRest<Invite[]>('vc_invites', `workspace_id=eq.${ws}&accepted_at=is.null&select=id,email,role,created_at,expires_at,accepted_at&order=created_at.desc`)
export const withdrawInvite = (id: string) => accountRest('vc_invites', `id=eq.${id}`, { method: 'DELETE' })

export async function setRole(ws: string, userId: string, role: Role) {
  await accountRest('vc_members', `workspace_id=eq.${ws}&user_id=eq.${userId}`, { method: 'PATCH', body: JSON.stringify({ role }), prefer: 'return=minimal' })
}

/** Remove someone, then replace the workspace key so what is written from now on is closed to them. */
export async function removeMember(ws: string, userId: string) {
  await accountRest('vc_members', `workspace_id=eq.${ws}&user_id=eq.${userId}`, { method: 'DELETE' })
  await rotateWorkspaceKey(ws)
  import('./analytics').then(m => m.track('team.remove')).catch(() => {})
}

export async function leaveWorkspace(ws: string) {
  await accountRest('vc_members', `workspace_id=eq.${ws}&user_id=eq.${currentUserId()}`, { method: 'DELETE' })
  keys.delete(ws)
  await loadTeams()
}

/** Remove a team's sealed files from Storage (owners only). Database rows go with the workspace; files do not. */
export async function deleteWorkspaceFiles(ws: string) {
  for (;;) {
    const res = await accountFetch('/storage/v1/object/list/vc-team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: ws, limit: 500, offset: 0 }) })
    const list = res.ok ? ((await res.json()) as { name: string }[]) : []
    if (!list.length) return
    const del = await accountFetch('/storage/v1/object/vc-team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: list.map(f => `${ws}/${f.name}`) }) })
    if (!del.ok || list.length < 500) return
  }
}

/** Before deleting an account: clear files of teams where this person is the only member (those teams go too). */
export async function deleteSoloWorkspaceFiles() {
  const me = currentUserId(); if (!me) return
  const mine = await accountRest<{ workspace_id: string; role: Role }[]>('vc_members', `user_id=eq.${me}&role=eq.owner&select=workspace_id,role`)
  for (const m of mine) {
    const members = await accountRest<{ user_id: string }[]>('vc_members', `workspace_id=eq.${m.workspace_id}&select=user_id`)
    if (members.length === 1) await deleteWorkspaceFiles(m.workspace_id).catch(() => {})
  }
}

export async function deleteWorkspace(ws: string) {
  await deleteWorkspaceFiles(ws).catch(() => {})
  await accountRest('vc_workspaces', `id=eq.${ws}`, { method: 'DELETE' })
  keys.delete(ws)
  await loadTeams()
}

export async function renameWorkspace(ws: string, name: string) {
  const w = useTeams.getState().workspaces.find(x => x.id === ws); if (!w) return
  const k = workspaceKey(ws, w.keyVersion); if (!k) throw new AccountError('This device does not have the team key.')
  await accountRest('vc_workspaces', `id=eq.${ws}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ name_sealed: await seal(k, new TextEncoder().encode(name.trim() || 'Team'), nameAad(ws)) }) })
  await loadTeams()
}

/** New workspace key version, sealed to every current member. Owners only. */
export async function rotateWorkspaceKey(ws: string) {
  const w = useTeams.getState().workspaces.find(x => x.id === ws); if (!w) throw new AccountError('Team not found.')
  const next = w.keyVersion + 1
  const k = randomBytes(32)
  const updated = await accountRest<unknown[]>('vc_workspaces', `id=eq.${ws}&key_version=eq.${w.keyVersion}`, {
    method: 'PATCH', prefer: 'return=representation',
    body: JSON.stringify({ key_version: next, name_sealed: await seal(k, new TextEncoder().encode(w.name), nameAad(ws)) }),
  })
  if (!updated.length) throw new AccountError('The team key changed on another device. Try again.')
  const members = await listMembers(ws)
  for (const m of members) {
    if (!m.public_key) continue
    await accountRest('vc_member_keys', '', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({ workspace_id: ws, user_id: m.user_id, key_version: next, sealed: await sealTo(m.public_key, k, keyAad(ws, next)) }) })
  }
  await loadTeams()
}

/** After this person's identity key is replaced: seal their workspace keys again for the new one. */
export async function resealMemberships(oldIdentity: CryptoKey, newPublic: JsonWebKey) {
  const me = currentUserId(); if (!me) return
  const rows = await accountRest<{ workspace_id: string; key_version: number; sealed: string }[]>('vc_member_keys', `user_id=eq.${me}&select=workspace_id,key_version,sealed`)
  for (const r of rows) {
    try {
      const k = await openFrom(oldIdentity, r.sealed, keyAad(r.workspace_id, r.key_version))
      await accountRest('vc_member_keys', `workspace_id=eq.${r.workspace_id}&user_id=eq.${me}&key_version=eq.${r.key_version}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ sealed: await sealTo(newPublic, k, keyAad(r.workspace_id, r.key_version)) }) })
    } catch { /* not openable: leave it */ }
  }
  await accountRest('vc_members', `user_id=eq.${me}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ public_key: newPublic }) }).catch(() => {})
  await loadTeams()
}

export const canEdit = (ws: string | null | undefined) => {
  if (!ws) return true
  const r = useTeams.getState().workspaces.find(w => w.id === ws)?.role
  return r === 'owner' || r === 'editor'
}

