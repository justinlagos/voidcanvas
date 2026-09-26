'use client'

// Account and sync, in one panel. Used by the Editor's Account dialog and the /pair page.

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, KeyRound, Laptop, Loader2, Lock, Smartphone } from 'lucide-react'
import {
  approveDevice, beginRotation, beginSetup, cancelDevicePairing, cancelRotation, confirmEmailChange, confirmWithCode, deleteAccount, finishRotation,
  finishSetup, forgetDevice, initAccount, listDevices, lookUpPairing, makeNewRecoveryKey, needsFreshSignIn, requestEmailChange, sendCode,
  sendConfirmCode, signOut, startDevicePairing, thisDeviceId, unlockWithRecoveryKey, useAccount, verifyCode, type Device,
} from '@/lib/account'
import { TeamsBox } from './TeamsBox'
import { Button, focusRing } from '@/editor/components/ui'

const input = `w-full h-10 px-3 rounded-lg bg-void-900 border border-void-700 text-[14px] ${focusRing}`
const note = 'text-[12.5px] text-void-400 leading-relaxed'
const box = 'rounded-xl border border-void-800 p-4'

function useBusy() {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message || 'Something went wrong.') } finally { setBusy(false) }
  }
  return { busy, error, setError, run }
}

const Err = ({ error }: { error: string | null }) => error ? <p role="alert" className="text-[12.5px] text-rose-400">{error}</p> : null

export function AccountPanel({ approveCode, joinLink }: { approveCode?: string; joinLink?: string }) {
  const status = useAccount(s => s.status)
  useEffect(() => { initAccount() }, [])
  return (
    <div className="p-5 space-y-5 text-[13.5px]">
      {status === 'loading' && <p className={note}><Loader2 size={14} className="inline animate-spin mr-1.5" />Checking your account…</p>}
      {status === 'off' && <p className={note}>Accounts are off in a private session. Turn the private session off in Your privacy to sign in.</p>}
      {status === 'signed-out' && <SignIn />}
      {status === 'needs-setup' && <Setup />}
      {status === 'locked' && <Unlock />}
      {status === 'ready' && <Ready approveCode={approveCode} joinLink={joinLink} />}
      {joinLink && status !== 'ready' && status !== 'loading' && <p className={note}>Sign in with the email address the invite was sent to. When this device is ready, you join the team.</p>}
    </div>
  )
}

// ─── Signed out ────────────────────────────────────────────────────

function SignIn() {
  const [email, setEmail] = useState(''), [sent, setSent] = useState(false), [code, setCode] = useState('')
  const { busy, error, run } = useBusy()
  return (
    <>
      <p className="leading-relaxed text-void-200">An account is optional. It keeps your interface settings the same on every device you sign in on. Your designs stay on your devices.</p>
      <p className={note}><Lock size={12} className="inline mr-1 -mt-0.5" />What the account stores is encrypted on your device first. Only you can open it.</p>
      {!sent ? (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await sendCode(email); setSent(true) }) }}>
          <label className="block"><span className="block text-[12px] text-void-400 mb-1">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} /></label>
          <Err error={error} />
          <Button type="submit" primary disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Send a sign-in code'}</Button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(() => verifyCode(email, code)) }}>
          <p className="text-void-200">We sent a 6-digit code to <strong>{email}</strong>. It works for an hour.</p>
          <label className="block"><span className="block text-[12px] text-void-400 mb-1">Code</span>
            <input inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={e => setCode(e.target.value)} className={`${input} tracking-[0.3em] tabular-nums`} /></label>
          <Err error={error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" primary disabled={busy || code.replace(/\s/g, '').length < 6}>{busy ? 'Checking…' : 'Sign in'}</Button>
            <Button onClick={() => run(() => sendCode(email))} disabled={busy}>Send a new code</Button>
            <Button onClick={() => { setSent(false); setCode('') }}>Use a different email</Button>
          </div>
        </form>
      )}
    </>
  )
}

// ─── First sign-in: recovery key ───────────────────────────────────

function RecoveryKeyBox({ recovery, email }: { recovery: string; email: string | null }) {
  const [copied, setCopied] = useState(false)
  const download = () => {
    const text = `Voidcanvas recovery key\n\nAccount: ${email ?? ''}\nMade: ${new Date().toLocaleString()}\n\n${recovery}\n\nThis key unlocks your Voidcanvas account on a new device when you have no other signed-in device to hand.\nVoidcanvas does not keep a copy and cannot reset it. Keep it somewhere safe and private.\n`
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'Voidcanvas recovery key.txt'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  return (
    <div className={`${box} space-y-3`}>
      <p data-recovery className="font-mono text-[14px] leading-7 tracking-wide break-all select-all text-void-100">{recovery}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { navigator.clipboard?.writeText(recovery).then(() => setCopied(true)).catch(() => {}) }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</Button>
        <Button onClick={download}><Download size={14} />Download as a text file</Button>
      </div>
    </div>
  )
}

function Setup() {
  const setup = useAccount(s => s.setup), email = useAccount(s => s.email)
  const [last, setLast] = useState('')
  const { busy, error, run } = useBusy()
  if (!setup) return (
    <>
      <p className="text-void-200 leading-relaxed">You are signed in as <strong>{email}</strong>. One step left: your recovery key.</p>
      <div className={`${box} space-y-2`}>
        <p className="font-medium flex items-center gap-2"><KeyRound size={15} />What the recovery key is for</p>
        <p className={note}>It unlocks your account on a new device when none of your other devices is to hand. Voidcanvas does not keep a copy and cannot reset it. If you lose every device and this key, what your account stores cannot be recovered. Designs saved on your devices are not affected.</p>
      </div>
      <Err error={error} />
      <Button primary disabled={busy} onClick={() => run(beginSetup)}>{busy ? 'Making keys…' : 'Make my recovery key'}</Button>
      <Button onClick={() => run(signOut)}>Sign out</Button>
    </>
  )
  const lastGroup = setup.recovery.split('-').pop()!
  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); run(() => finishSetup(last)) }}>
      <p className="text-void-200 leading-relaxed">This is your recovery key. Save it now, in a password manager or on paper. It is shown only once.</p>
      <RecoveryKeyBox recovery={setup.recovery} email={email} />
      <label className="block"><span className="block text-[12px] text-void-400 mb-1">To confirm you have saved it, type its last {lastGroup.length} characters</span>
        <input value={last} onChange={e => setLast(e.target.value)} autoComplete="off" spellCheck={false} className={`${input} font-mono uppercase w-40`} /></label>
      <Err error={error} />
      <Button type="submit" primary disabled={busy || last.trim().length < lastGroup.length}>{busy ? 'Saving…' : 'Finish'}</Button>
    </form>
  )
}

// ─── New device ────────────────────────────────────────────────────

function Qr({ text }: { text: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    import('qrcode-generator').then(({ default: qrcode }) => {
      const q = qrcode(0, 'M'); q.addData(text); q.make()
      setSvg(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }))
    }).catch(() => {})
  }, [text])
  return <div aria-label="QR code" className="w-40 h-40 shrink-0 rounded-lg bg-white p-1 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />
}

function Unlock() {
  const email = useAccount(s => s.email), pairing = useAccount(s => s.pairing)
  const [mode, setMode] = useState<'choose' | 'pair' | 'recovery'>('choose'), [key, setKey] = useState('')
  const { busy, error, run } = useBusy()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { if (!pairing) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [pairing])
  useEffect(() => () => cancelDevicePairing(), [])
  const origin = typeof location !== 'undefined' && location.protocol.startsWith('http') ? location.origin : 'https://voidcanvas.netlify.app'
  return (
    <>
      <p className="text-void-200 leading-relaxed">Signed in as <strong>{email}</strong>. This device needs your account key before it can sync. Get it from a device you are already signed in on, or use your recovery key.</p>
      {mode === 'choose' && (
        <div className="grid gap-2">
          <button onClick={() => { setMode('pair'); run(() => startDevicePairing(origin)) }} className={`${box} text-left hover:border-void-600 ${focusRing}`}>
            <span className="font-medium flex items-center gap-2"><Laptop size={15} />Approve from another device</span>
            <span className={`block mt-1 ${note}`}>Show a code here and approve it on a phone or computer you are signed in on.</span>
          </button>
          <button onClick={() => setMode('recovery')} className={`${box} text-left hover:border-void-600 ${focusRing}`}>
            <span className="font-medium flex items-center gap-2"><KeyRound size={15} />Use my recovery key</span>
            <span className={`block mt-1 ${note}`}>The 52-character key you saved when you set up your account.</span>
          </button>
        </div>
      )}
      {mode === 'pair' && (
        <div className={`${box} space-y-3`}>
          {!pairing ? <p className={note}><Loader2 size={14} className="inline animate-spin mr-1.5" />Preparing a code…</p> : now > pairing.expiresAt ? (
            <p className={note}>The code expired. <button className="underline" onClick={() => run(() => startDevicePairing(origin))}>Make a new one</button>.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Qr text={pairing.url} />
              <div className="space-y-2 min-w-0">
                <p className={note}>On a device you are signed in on, open <strong>Account</strong>, choose <strong>Add a device</strong> and enter:</p>
                <p data-pair-code className="font-mono text-[16px] tracking-wide text-void-100 break-all">{pairing.code}</p>
                <p className={note}><Smartphone size={12} className="inline mr-1 -mt-0.5" />Or scan the QR code with your phone. Waiting for approval… {Math.max(0, Math.ceil((pairing.expiresAt - now) / 60000))} min left.</p>
              </div>
            </div>
          )}
          <Button onClick={() => { cancelDevicePairing(); setMode('choose') }}>Back</Button>
        </div>
      )}
      {mode === 'recovery' && (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(() => unlockWithRecoveryKey(key)) }}>
          <label className="block"><span className="block text-[12px] text-void-400 mb-1">Recovery key</span>
            <textarea value={key} onChange={e => setKey(e.target.value)} rows={3} spellCheck={false} autoComplete="off" className={`${input} h-auto py-2 font-mono uppercase`} /></label>
          <Err error={error} />
          <div className="flex gap-2"><Button type="submit" primary disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</Button><Button onClick={() => setMode('choose')}>Back</Button></div>
        </form>
      )}
      {mode !== 'recovery' && <Err error={error} />}
      <Button onClick={() => run(signOut)}>Sign out</Button>
    </>
  )
}

// ─── Ready ─────────────────────────────────────────────────────────

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} minutes ago`
  if (s < 86400 * 2) return `${Math.round(s / 3600)} hours ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function Ready({ approveCode, joinLink }: { approveCode?: string; joinLink?: string }) {
  const email = useAccount(s => s.email)
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [syncState, setSyncState] = useState<string | null>(null)
  const [code, setCode] = useState(approveCode ?? ''), [found, setFound] = useState<{ device: string; ageSeconds: number } | null>(null), [added, setAdded] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const pair = useBusy(), rec = useBusy(), gen = useBusy()
  const me = useMemo(() => thisDeviceId(), [])
  const load = () => listDevices().then(setDevices).catch(() => setDevices([]))
  useEffect(() => { load() }, [])
  useEffect(() => { if (approveCode) pair.run(async () => setFound(await lookUpPairing(approveCode))) }, [approveCode]) // eslint-disable-line react-hooks/exhaustive-deps
  const syncNow = () => gen.run(async () => {
    const r = await (await import('@/lib/settings-sync')).syncSettings()
    setSyncState(r === 'received' ? 'Settings from your other device are now in use.' : r === 'sent' ? 'Your settings are saved to your account.' : 'Everything is up to date.')
  })
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[12px] text-void-400">Signed in as</p><p className="font-medium truncate">{email}</p></div>
        <Button onClick={() => gen.run(signOut)}>Sign out</Button>
      </div>

      <div className={`${box} space-y-2`}>
        <p className="font-medium flex items-center gap-2"><Check size={15} className="text-emerald-400" />Settings sync is on</p>
        <p className={note}>Interface settings, workspaces, recent colours and your usage-sharing choice follow you to every device you sign in on. They are encrypted before they leave this device.</p>
        <div className="flex items-center gap-3"><Button onClick={syncNow} disabled={gen.busy}>{gen.busy ? 'Syncing…' : 'Sync now'}</Button>{syncState && <span className={note}>{syncState}</span>}</div>
        <Err error={gen.error} />
      </div>

      <div className={`${box} space-y-3`}>
        <p className="font-medium">Add a device</p>
        {!added ? (
          <>
            <p className={note}>On the new device, sign in, choose <strong>Approve from another device</strong>, then type the code it shows here.</p>
            <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); setFound(null); pair.run(async () => setFound(await lookUpPairing(code))) }}>
              <input value={code} onChange={e => { setCode(e.target.value); setFound(null) }} placeholder="ABCD-EFGH-…" spellCheck={false} autoComplete="off" className={`${input} font-mono uppercase flex-1 min-w-[200px]`} />
              <Button type="submit" disabled={pair.busy || code.replace(/[^a-z0-9]/gi, '').length < 26}>Look up</Button>
            </form>
            {found && (
              <div className="rounded-lg bg-void-900 p-3 space-y-2">
                <p><strong>{found.device}</strong> asked {found.ageSeconds < 90 ? 'just now' : `${Math.round(found.ageSeconds / 60)} minutes ago`}. Add it only if you started this on your own device.</p>
                <Button primary disabled={pair.busy} onClick={() => pair.run(async () => { await approveDevice(code); setAdded(found.device); setTimeout(load, 3000) })}>Add this device</Button>
              </div>
            )}
          </>
        ) : <p className="text-emerald-400">{added} can now sync. It finishes on its own within a few seconds.</p>}
        <Err error={pair.error} />
      </div>

      <div className={`${box} space-y-2`}>
        <p className="font-medium">Your devices</p>
        {!devices ? <p className={note}>Loading…</p> : (
          <ul className="divide-y divide-void-800">
            {devices.map(d => (
              <li key={d.id} className="py-2 flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block truncate">{d.name}{d.id === me && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-void-800 text-void-300">This device</span>}</span><span className="block text-[12px] text-void-500">Last used {ago(d.last_seen)}</span></span>
                {d.id !== me && <Button onClick={() => forgetDevice(d.id).then(load).catch(() => {})}>Remove</Button>}
              </li>
            ))}
          </ul>
        )}
        <p className={note}>Removing a device takes it off this list. A device keeps what it has already downloaded. If one is lost, make a new recovery key below and sign out on it when you can.</p>
      </div>

      <TeamsBox joinLink={joinLink} />

      <div className={`${box} space-y-3`}>
        <p className="font-medium flex items-center gap-2"><KeyRound size={15} />Recovery key</p>
        {!newKey ? (
          <>
            <p className={note}>Lost your recovery key, or think someone else has seen it? Make a new one. The old one stops working straight away.</p>
            <Button disabled={rec.busy} onClick={() => { if (confirm('Make a new recovery key? The old one will stop working.')) rec.run(async () => setNewKey(await makeNewRecoveryKey())) }}>Make a new recovery key</Button>
          </>
        ) : (
          <>
            <p className="text-void-200">Your new recovery key. Save it now; it is shown only once.</p>
            <RecoveryKeyBox recovery={newKey} email={email} />
          </>
        )}
        <Err error={rec.error} />
      </div>
      <ChangeEmail />
      <LockOut />
      <DeleteAccount />
    </>
  )
}

// ─── Account settings ──────────────────────────────────────────────

function ChangeEmail() {
  const email = useAccount(s => s.email)
  const [open, setOpen] = useState(false), [next, setNext] = useState(''), [sent, setSent] = useState(false), [codeNew, setCodeNew] = useState(''), [codeOld, setCodeOld] = useState(''), [done, setDone] = useState(false)
  const { busy, error, run } = useBusy()
  return (
    <div className={`${box} space-y-3`}>
      <div className="flex items-center justify-between gap-3"><p className="font-medium">Email address</p>{!open && <Button onClick={() => { setOpen(true); setDone(false) }}>Change</Button>}</div>
      {done && <p className="text-emerald-400">Your account now uses {email}.</p>}
      {open && !sent && (
        <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); run(async () => { await requestEmailChange(next); setSent(true) }) }}>
          <input type="email" required value={next} onChange={e => setNext(e.target.value)} placeholder="New email address" aria-label="New email address" className={`${input} flex-1 min-w-[200px]`} />
          <Button type="submit" primary disabled={busy || !next.includes('@')}>{busy ? 'Sending…' : 'Send codes'}</Button>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
        </form>
      )}
      {open && sent && (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await confirmEmailChange(next, codeNew, codeOld); setOpen(false); setSent(false); setDone(true); setCodeNew(''); setCodeOld('') }) }}>
          <p className={note}>We sent a code to <strong>{next}</strong>. If a code also arrived at <strong>{email}</strong>, enter it too; it confirms the change came from you.</p>
          <label className="block"><span className="block text-[12px] text-void-400 mb-1">Code sent to {next}</span><input inputMode="numeric" value={codeNew} onChange={e => setCodeNew(e.target.value)} className={`${input} tracking-[0.3em] tabular-nums`} /></label>
          <label className="block"><span className="block text-[12px] text-void-400 mb-1">Code sent to {email} (if one arrived)</span><input inputMode="numeric" value={codeOld} onChange={e => setCodeOld(e.target.value)} className={`${input} tracking-[0.3em] tabular-nums`} /></label>
          <div className="flex gap-2"><Button type="submit" primary disabled={busy || codeNew.replace(/\s/g, '').length < 6}>{busy ? 'Checking…' : 'Change email'}</Button><Button onClick={() => { setSent(false); setOpen(false) }}>Cancel</Button></div>
        </form>
      )}
      <Err error={error} />
    </div>
  )
}

function LockOut() {
  const rotation = useAccount(s => s.rotation), email = useAccount(s => s.email)
  const [last, setLast] = useState(''), [done, setDone] = useState(false)
  const { busy, error, run } = useBusy()
  return (
    <div className={`${box} space-y-3`}>
      <p className="font-medium flex items-center gap-2"><Lock size={15} />Lost a device?</p>
      {done && <p className="text-emerald-400">Done. Your account has new keys, and every other device is signed out. Add your other devices again with Add a device.</p>}
      {!rotation ? (
        <>
          <p className={note}>Replace your account keys and recovery key, and sign out everywhere else. A lost device keeps only what it already downloaded. Your other devices need to sign in and be added again.</p>
          <Button disabled={busy} onClick={() => { if (confirm('Replace your keys and sign out every other device?')) { setDone(false); run(beginRotation) } }}>Replace my keys</Button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await finishRotation(last); setDone(true); setLast('') }) }}>
          <p className="text-void-200">Your new recovery key. The old one stops working when you finish. Save this one now.</p>
          <RecoveryKeyBox recovery={rotation.recovery} email={email} />
          <label className="block"><span className="block text-[12px] text-void-400 mb-1">Type its last 4 characters to finish</span>
            <input value={last} onChange={e => setLast(e.target.value)} autoComplete="off" spellCheck={false} data-rotation-confirm className={`${input} font-mono uppercase w-40`} /></label>
          <div className="flex gap-2"><Button type="submit" primary disabled={busy || last.trim().length < 4}>{busy ? 'Replacing…' : 'Finish'}</Button><Button onClick={cancelRotation}>Cancel</Button></div>
        </form>
      )}
      <Err error={error} />
    </div>
  )
}

function DeleteAccount() {
  const [open, setOpen] = useState(false), [sent, setSent] = useState(false), [code, setCode] = useState(''), [typed, setTyped] = useState(''), [fresh, setFresh] = useState(false)
  const { busy, error, run } = useBusy()
  useEffect(() => { if (open) setFresh(!needsFreshSignIn()) }, [open])
  return (
    <div className="rounded-xl border border-rose-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3"><p className="font-medium">Delete account</p>{!open && <Button onClick={() => setOpen(true)}>Delete…</Button>}</div>
      {open && (
        <>
          <p className={note}>This deletes your account and everything it stores: keys, synced settings, devices, and teams where you are the only member. Designs saved on your devices are not touched. It cannot be undone.</p>
          {!fresh ? (
            !sent ? <Button disabled={busy} onClick={() => run(async () => { await sendConfirmCode(); setSent(true) })}>Email me a code to confirm it is me</Button> : (
              <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); run(async () => { await confirmWithCode(code); setFresh(true) }) }}>
                <input inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} aria-label="Code" className={`${input} tracking-[0.3em] tabular-nums w-40`} />
                <Button type="submit" disabled={busy || code.replace(/\s/g, '').length < 6}>Confirm</Button>
              </form>
            )
          ) : (
            <form className="flex flex-wrap gap-2 items-center" onSubmit={e => { e.preventDefault(); run(deleteAccount) }}>
              <label className="text-[12.5px] text-void-300">Type DELETE to confirm <input value={typed} onChange={e => setTyped(e.target.value)} aria-label="Type DELETE" className={`${input} w-32 ml-2`} /></label>
              <Button type="submit" disabled={busy || typed !== 'DELETE'} className="!bg-rose-600/90 !text-white hover:!bg-rose-600">{busy ? 'Deleting…' : 'Delete my account'}</Button>
            </form>
          )}
          <Button onClick={() => { setOpen(false); setSent(false); setTyped('') }}>Cancel</Button>
        </>
      )}
      <Err error={error} />
    </div>
  )
}
