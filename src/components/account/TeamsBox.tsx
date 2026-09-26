'use client'

// Teams in the Account panel: create, invite by link, members and roles, leave or delete.

import { useEffect, useState } from 'react'
import { Check, Copy, Users } from 'lucide-react'
import { useAccount } from '@/lib/account'
import {
  acceptInvite, createInvite, createWorkspace, deleteWorkspace, leaveWorkspace, listInvites, listMembers, loadTeams, removeMember,
  renameWorkspace, setRole, useTeams, withdrawInvite, type Invite, type Member, type Role, type Workspace,
} from '@/lib/teams'
import { Button, focusRing } from '@/editor/components/ui'

const input = `h-9 px-3 rounded-lg bg-void-900 border border-void-700 text-[13.5px] ${focusRing}`
const note = 'text-[12.5px] text-void-400 leading-relaxed'
const box = 'rounded-xl border border-void-800 p-4'
const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', editor: 'Editor', reviewer: 'Reviewer' }

function useRun() {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try { await fn() } catch (e) { setError((e as Error).message || 'Something went wrong.') } finally { setBusy(false) } }
  return { busy, error, run }
}
const Err = ({ error }: { error: string | null }) => error ? <p role="alert" className="text-[12.5px] text-rose-400">{error}</p> : null

export function TeamsBox({ joinLink }: { joinLink?: string }) {
  const workspaces = useTeams(s => s.workspaces), loaded = useTeams(s => s.loaded)
  const [name, setName] = useState(''), [link, setLink] = useState(joinLink ?? ''), [open, setOpen] = useState<string | null>(null), [joined, setJoined] = useState<string | null>(null)
  const c = useRun(), j = useRun()
  useEffect(() => { loadTeams().catch(() => {}) }, [])
  useEffect(() => { if (joinLink) j.run(async () => { const r = await acceptInvite(joinLink); setJoined(`You joined ${r.name} as ${ROLE_LABEL[r.role].toLowerCase()}.`); setOpen(r.workspaceId) }) }, [joinLink]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`${box} space-y-3`} data-teams>
      <p className="font-medium flex items-center gap-2"><Users size={15} />Teams</p>
      <p className={note}>Share brands and Studio jobs with the people you work with. Everything is encrypted on your device with a key only the team has. Owners manage people, editors change shared work, reviewers view it.</p>
      {joined && <p className="text-emerald-400 text-[13px]">{joined}</p>}
      {!loaded ? <p className={note}>Loading…</p> : workspaces.length > 0 && (
        <ul className="space-y-2">
          {workspaces.map(w => <TeamRow key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} />)}
        </ul>
      )}
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); c.run(async () => { const id = await createWorkspace(name); setName(''); setOpen(id) }) }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Team name" aria-label="New team name" className={`${input} flex-1 min-w-[180px]`} />
        <Button type="submit" disabled={c.busy || !name.trim()}>{c.busy ? 'Creating…' : 'Create a team'}</Button>
      </form>
      <Err error={c.error} />
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); j.run(async () => { const r = await acceptInvite(link); setJoined(`You joined ${r.name} as ${ROLE_LABEL[r.role].toLowerCase()}.`); setLink(''); setOpen(r.workspaceId) }) }}>
        <input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste an invite link" aria-label="Invite link" className={`${input} flex-1 min-w-[180px] font-mono text-[12px]`} />
        <Button type="submit" disabled={j.busy || !link.includes('.')}>{j.busy ? 'Joining…' : 'Join'}</Button>
      </form>
      <Err error={j.error} />
    </div>
  )
}

function TeamRow({ w, open, onToggle }: { w: Workspace; open: boolean; onToggle: () => void }) {
  return (
    <li className="rounded-lg bg-void-900/60">
      <button onClick={onToggle} aria-expanded={open} className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-lg ${focusRing}`}>
        <span className="font-medium truncate">{w.name}</span>
        <span className="text-[12px] text-void-400">{ROLE_LABEL[w.role]}</span>
      </button>
      {open && <TeamDetail w={w} />}
    </li>
  )
}

function TeamDetail({ w }: { w: Workspace }) {
  const me = useAccount(s => s.userId)
  const owner = w.role === 'owner'
  const [members, setMembers] = useState<Member[] | null>(null), [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState(''), [role, setRoleInput] = useState<'editor' | 'reviewer'>('editor'), [made, setMade] = useState<string | null>(null), [copied, setCopied] = useState(false)
  const [rename, setRename] = useState(w.name)
  const r = useRun()
  const load = async () => { setMembers(await listMembers(w.id)); if (owner) setInvites(await listInvites(w.id)) }
  useEffect(() => { load().catch(() => setMembers([])) }, [w.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const origin = typeof location !== 'undefined' && location.protocol.startsWith('http') ? location.origin : 'https://voidcanvas.netlify.app'
  const seats = members?.filter(m => m.role !== 'reviewer').length ?? 0
  return (
    <div className="px-3 pb-3 space-y-3">
      {owner && (
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); r.run(() => renameWorkspace(w.id, rename)) }}>
          <input value={rename} onChange={e => setRename(e.target.value)} aria-label="Team name" className={`${input} flex-1`} />
          <Button type="submit" disabled={r.busy || rename.trim() === w.name}>Rename</Button>
        </form>
      )}
      <div>
        <p className="text-[12px] text-void-400 mb-1">{members ? `${members.length} member${members.length === 1 ? '' : 's'}, ${seats} with editing rights` : 'Loading members…'}</p>
        <ul className="divide-y divide-void-800">
          {members?.map(m => (
            <li key={m.user_id} className="py-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-[13px]">{m.email}{m.user_id === me && <span className="ml-1.5 text-void-500">(you)</span>}</span>
              {owner && m.user_id !== me ? (
                <span className="flex items-center gap-1.5 shrink-0">
                  <select aria-label={`Role for ${m.email}`} value={m.role} disabled={r.busy} onChange={e => r.run(async () => { await setRole(w.id, m.user_id, e.target.value as Role); await load() })} className={`${input} !h-8 !px-2 text-[12.5px]`}>
                    <option value="owner">Owner</option><option value="editor">Editor</option><option value="reviewer">Reviewer</option>
                  </select>
                  <Button disabled={r.busy} onClick={() => { if (confirm(`Remove ${m.email}? The team key is replaced, so nothing shared from now on can be opened by them.`)) r.run(async () => { await removeMember(w.id, m.user_id); await load() }) }}>Remove</Button>
                </span>
              ) : <span className="text-[12px] text-void-400 shrink-0">{ROLE_LABEL[m.role]}</span>}
            </li>
          ))}
        </ul>
      </div>
      {owner && (
        <div className="space-y-2">
          <p className="text-[12px] text-void-400">Invite someone</p>
          <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); r.run(async () => { setMade(await createInvite(w.id, email, role, origin)); setCopied(false); setEmail(''); await load() }) }}>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Their email" aria-label="Email to invite" className={`${input} flex-1 min-w-[160px]`} />
            <select value={role} onChange={e => setRoleInput(e.target.value as any)} aria-label="Role" className={`${input} !px-2`}><option value="editor">Editor</option><option value="reviewer">Reviewer (free)</option></select>
            <Button type="submit" disabled={r.busy || !email.includes('@')}>Make invite link</Button>
          </form>
          {made && (
            <div className="rounded-lg bg-void-950 p-3 space-y-2">
              <p data-invite-link className="font-mono text-[11.5px] break-all text-void-200">{made}</p>
              <div className="flex items-center gap-2"><Button onClick={() => navigator.clipboard?.writeText(made).then(() => setCopied(true)).catch(() => {})}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}</Button></div>
              <p className={note}>Send it to them yourself. It works once, only for that email address, for 7 days. The part after # never reaches Voidcanvas, so keep the link private.</p>
            </div>
          )}
          {invites.length > 0 && (
            <ul className="text-[12.5px] space-y-1">
              {invites.map(i => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-void-300">
                  <span className="truncate">{i.email}, {ROLE_LABEL[i.role].toLowerCase()}, waiting</span>
                  <button className="underline text-void-400 hover:text-white" onClick={() => r.run(async () => { await withdrawInvite(i.id); await load() })}>Withdraw</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Err error={r.error} />
      <div className="flex gap-2">
        {owner
          ? <Button disabled={r.busy} onClick={() => { if (confirm(`Delete ${w.name}? Everything shared in it is removed for every member. Copies on their devices stay.`)) r.run(() => deleteWorkspace(w.id)) }}>Delete team</Button>
          : <Button disabled={r.busy} onClick={() => { if (confirm(`Leave ${w.name}?`)) r.run(() => leaveWorkspace(w.id)) }}>Leave team</Button>}
      </div>
    </div>
  )
}
