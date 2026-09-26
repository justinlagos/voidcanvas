'use client'

// "Only me" or a team, for a Studio brand or job. Sharing seals the item with the team's key and syncs it.

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useAccount } from '@/lib/account'
import { useTeams } from '@/lib/teams'
import { Modal, focusRing } from '@/editor/components/ui'
import { AccountPanel } from './AccountPanel'

export function ShareControl({ kind, item }: { kind: 'brand' | 'job'; item: { id: string; workspaceId?: string | null; syncedAt?: string | null; updatedAt: number; pushedAt?: number } }) {
  const status = useAccount(s => s.status)
  const workspaces = useTeams(s => s.workspaces)
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [account, setAccount] = useState(false)
  useEffect(() => { import('@/lib/account').then(m => m.initAccount()).catch(() => {}) }, [])
  const current = workspaces.find(w => w.id === item.workspaceId)
  const writable = workspaces.filter(w => w.role !== 'reviewer')
  const synced = !!item.workspaceId && !!item.syncedAt && (!item.pushedAt || item.updatedAt <= item.pushedAt)

  const change = async (ws: string) => {
    setBusy(true); setError(null)
    try {
      const { useJobs } = await import('@/studio/jobs')
      const s = useJobs.getState()
      const rec = kind === 'brand' ? s.brands.find(b => b.id === item.id) : s.jobs?.find(j => j.id === item.id)
      if (!rec) return
      await (await import('@/lib/team-sync')).setShared(kind, rec, ws || null)
    } catch (e) { setError((e as Error).message || 'Could not change sharing.') } finally { setBusy(false) }
  }

  if (status !== 'ready' || (!writable.length && !current)) {
    return (
      <>
        <button onClick={() => setAccount(true)} className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] text-void-300 hover:text-white hover:bg-void-800 ${focusRing}`}><Users size={14} />Share with a team</button>
        {account && <Modal title="Account and teams" onClose={() => setAccount(false)}><AccountPanel /></Modal>}
      </>
    )
  }
  if (current && current.role === 'reviewer') {
    return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-void-400"><Users size={14} />{current.name}, view only</span>
  }
  return (
    <span className="inline-flex items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-[12.5px] text-void-300">
        <Users size={14} />
        <select aria-label="Shared with" value={item.workspaceId ?? ''} disabled={busy} onChange={e => change(e.target.value)} className={`h-8 px-2 rounded-lg bg-void-900 border border-void-800 text-[12.5px] ${focusRing}`}>
          <option value="">Only me</option>
          {writable.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>
      {item.workspaceId && <span className={`text-[11.5px] ${synced ? 'text-emerald-400' : 'text-void-500'}`}>{busy ? 'Sharing…' : synced ? 'Synced' : 'Waiting to sync'}</span>}
      {error && <span role="alert" className="text-[11.5px] text-rose-400">{error}</span>}
    </span>
  )
}
