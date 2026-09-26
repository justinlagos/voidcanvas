'use client'

// A review or delivery link: copy it, see when it stops working, or stop it now.

import { useEffect, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { useAccount } from '@/lib/account'
import { Modal } from '@/editor/components/ui'
import { AccountPanel } from '@/components/account/AccountPanel'
import type { ShareLink } from '../jobs'
import { Btn, INPUT, fmtDate } from '../ui'

export function useCanShare() {
  const status = useAccount(s => s.status)
  useEffect(() => { import('@/lib/account').then(m => m.initAccount()).catch(() => {}) }, [])
  return status === 'ready'
}

export function SignInToShare({ what }: { what: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-void-300 leading-relaxed">Links need a Voidcanvas account on this device. The {what} is encrypted before it leaves here, and only people with the link can open it. Your client does not need an account.</p>
      <Btn primary onClick={() => setOpen(true)}>Sign in or make an account</Btn>
      {open && <Modal title="Account" onClose={() => setOpen(false)}><AccountPanel /></Modal>}
    </div>
  )
}

export function LinkBox({ link, onStop, what }: { link: ShareLink; onStop: () => Promise<void>; what: string }) {
  const [copied, setCopied] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const expired = Date.parse(link.expiresAt) < Date.now()
  const copy = async () => { try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* select instead */ } }
  const stop = async () => {
    if (!confirm(`Stop this link? Anyone who has it will no longer be able to open the ${what}, and its comments are deleted from the server.`)) return
    setBusy(true); setError(null)
    try { await onStop() } catch (e) { setError((e as Error).message || 'Could not stop the link.') } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input readOnly value={link.url} aria-label="Link" onFocus={e => e.currentTarget.select()} className={`${INPUT} flex-1 min-w-0 font-mono text-[11.5px]`} />
        <Btn onClick={copy} disabled={expired}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</Btn>
      </div>
      <p className="text-[11.5px] text-void-500 flex items-center gap-1.5"><Link2 size={12} />{expired ? `Stopped working on ${fmtDate(Date.parse(link.expiresAt))}.` : `Works until ${fmtDate(Date.parse(link.expiresAt))}. Send it any way you like: WhatsApp, email, a message.`}</p>
      <div className="flex items-center gap-2">
        <Btn subtle onClick={stop} disabled={busy}>{busy ? 'Stopping…' : 'Stop this link'}</Btn>
        {error && <span role="alert" className="text-[11.5px] text-rose-400">{error}</span>}
      </div>
    </div>
  )
}
