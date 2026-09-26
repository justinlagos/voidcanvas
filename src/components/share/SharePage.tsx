'use client'

// What a client sees when they open a review or delivery link. No account, nothing to install.
// The key is in the URL fragment, which browsers never send to a server; everything is decrypted here.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, Loader2, MessageSquare, X } from 'lucide-react'
import type { DeliveryManifest, OpenShare, ReviewManifest, ShareEvent, ShareEventBody, ShareFile } from '@/lib/share'

const NAME_KEY = 'vc-review-name'
const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]'
const btn = `inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium disabled:opacity-50 ${ring}`
const fmt = (t: string | number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 16)

export function SharePage() {
  const [share, setShare] = useState<OpenShare | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (location.hash.length < 2) { setError('This page needs the full link. Ask for it to be sent again.'); return }
    import('@/lib/share').then(m => m.openShare(location.href)).then(setShare).catch(e => setError(e.message || 'This link could not be opened.'))
  }, [])
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-[#ececf1]">
      {error ? <Notice title="This link cannot be opened">{error}</Notice>
        : !share ? <Notice title="Opening…"><Loader2 className="animate-spin" size={18} /></Notice>
        : !share.ready ? <Notice title="Still uploading">The files are still on their way. Try again in a minute.</Notice>
        : share.manifest.kind === 'review' ? <Review share={share} manifest={share.manifest} />
        : <Delivery share={share} manifest={share.manifest} />}
    </main>
  )
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-2"><h1 className="text-[17px] font-semibold">{title}</h1><div className="text-[13.5px] text-[#a3a3b2] flex justify-center">{children}</div></div>
    </div>
  )
}

function Header({ m, expires, extra }: { m: ReviewManifest | DeliveryManifest; expires: string; extra: string }) {
  return (
    <header className="px-4 sm:px-6 py-4 border-b border-white/10">
      {m.client && <p className="text-[12.5px] text-[#8e8ea0]">{m.client}</p>}
      <h1 className="text-[20px] font-semibold tracking-tight">{m.job} <span className="text-[#8e8ea0] font-normal">· {m.label}</span></h1>
      <p className="text-[12px] text-[#8e8ea0] mt-0.5">{extra} Link works until {fmt(expires)}.</p>
      {m.notes && <p className="mt-2 text-[13.5px] text-[#d4d4de] whitespace-pre-wrap max-w-3xl">{m.notes}</p>}
    </header>
  )
}

function useBlobUrl(share: OpenShare, f: ShareFile | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!f) return
    let u: string | null = null, live = true
    import('@/lib/share').then(m => m.fetchShareFile(share, f)).then(b => { if (!live) return; u = URL.createObjectURL(b); setUrl(u) }).catch(() => {})
    return () => { live = false; if (u) URL.revokeObjectURL(u) }
  }, [share, f])
  return url
}

// ─── Review ────────────────────────────────────────────────────────

interface CPin { id: string; img: number; x: number; y: number; text: string; by: string; team: boolean; done: boolean; replies: { id: string; by: string; text: string; team: boolean }[] }

function fold(events: ShareEvent[]) {
  const pins: CPin[] = []
  let decision: { value: 'approved' | 'changes'; note: string; by: string; at: string } | null = null
  for (const e of events) {
    const by = e.team ? 'Designer' : e.by
    if (e.t === 'pin' && !pins.some(p => p.id === e.id)) pins.push({ id: e.id, img: e.img, x: e.x, y: e.y, text: e.text, by, team: e.team, done: false, replies: [] })
    else if (e.t === 'reply') { const p = pins.find(x => x.id === e.pin); if (p && !p.replies.some(r => r.id === e.id)) p.replies.push({ id: e.id, by, text: e.text, team: e.team }) }
    else if (e.t === 'done') { const p = pins.find(x => x.id === e.pin); if (p) p.done = e.done }
    else if (e.t === 'decision') decision = { value: e.value, note: e.note, by, at: e.at }
  }
  return { pins, decision }
}

function Review({ share, manifest: m }: { share: OpenShare; manifest: ReviewManifest }) {
  const [events, setEvents] = useState<ShareEvent[]>(share.events)
  const after = useRef(share.after)
  const [img, setImg] = useState(0)
  const [name, setName] = useState('')
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => { try { setName(localStorage.getItem(NAME_KEY) || '') } catch { /* private window */ } }, [])
  const saveName = (n: string) => { setName(n); try { localStorage.setItem(NAME_KEY, n) } catch { /* ignore */ } }

  const refresh = useCallback(async () => {
    try {
      const { pollShare } = await import('@/lib/share')
      const r = await pollShare({ ...share, after: after.current })
      after.current = r.after
      if (r.events.length) setEvents(ev => [...ev, ...r.events.filter(e => !ev.some(x => x.eid === e.eid))])
    } catch { /* try again on the next tick */ }
  }, [share])
  useEffect(() => {
    const t = setInterval(refresh, 15_000)
    const vis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [refresh])

  const send = async (body: ShareEventBody) => {
    setError(null)
    try { const { postEvent } = await import('@/lib/share'); await postEvent(share, body); await refresh(); return true }
    catch (e) { setError((e as Error).message || 'Could not send. Try again.'); return false }
  }

  const { pins, decision } = useMemo(() => fold(events), [events])
  const here = pins.filter(p => p.img === img)
  const number = (id: string) => pins.findIndex(p => p.id === id) + 1
  const im = m.images[img]
  const url = useBlobUrl(share, im)

  return (
    <div className="flex flex-col lg:h-screen">
      <Header m={m} expires={share.expiresAt} extra={`${m.images.length} image${m.images.length === 1 ? '' : 's'} for review, sent ${fmt(m.at)}.`} />
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section className="flex-1 min-w-0 flex flex-col p-3 sm:p-4 gap-2">
          {m.images.length > 1 && (
            <div className="flex gap-1 overflow-x-auto" role="tablist">
              {m.images.map((x, i) => <button key={i} role="tab" aria-selected={img === i} onClick={() => { setImg(i); setDraft(null) }} className={`h-8 px-3 rounded-lg text-[12.5px] whitespace-nowrap ${ring} ${img === i ? 'bg-white/15 text-white' : 'text-[#a3a3b2] hover:text-white'}`}>{x.name}{pins.some(p => p.img === i && !p.done) ? ' •' : ''}</button>)}
            </div>
          )}
          <p className="text-[12px] text-[#8e8ea0]">Tap the image where you want to leave a comment.</p>
          <div className="flex-1 min-h-[300px] flex items-center justify-center bg-black/40 rounded-xl overflow-hidden p-2">
            {!url ? <Loader2 className="animate-spin text-[#8e8ea0]" size={20} /> : (
              <div className="relative max-w-full max-h-full" style={{ aspectRatio: `${im.w ?? 1} / ${im.h ?? 1}`, width: `min(100%, calc((100vh - 220px) * ${(im.w ?? 1) / (im.h ?? 1)}))` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={im.name} className="absolute inset-0 w-full h-full object-contain select-none" draggable={false} />
                <div data-testid="pin-surface" className="absolute inset-0 cursor-crosshair" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setDraft({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); setActive(null) }} />
                {here.map(p => (
                  <button key={p.id} onClick={() => setActive(p.id)} aria-label={`Comment ${number(p.id)}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                    className={`absolute -ml-3.5 -mt-3.5 w-7 h-7 rounded-full text-[12px] font-bold shadow-lg ${ring} ${p.done ? 'bg-emerald-400 text-black' : active === p.id ? 'bg-white text-black' : 'bg-[#8b7cff] text-white'}`}>{number(p.id)}</button>
                ))}
                {draft && <span className="absolute -ml-3.5 -mt-3.5 w-7 h-7 rounded-full bg-white text-black text-[12px] font-bold flex items-center justify-center shadow-lg" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}>+</span>}
              </div>
            )}
          </div>
        </section>
        <aside className="lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:overflow-y-auto p-4 space-y-5">
          <NameField name={name} onName={saveName} />
          {draft && <NewComment name={name} onCancel={() => setDraft(null)} onSend={async text => { if (await send({ t: 'pin', id: newId(), img, x: draft.x, y: draft.y, text, by: name })) setDraft(null) }} />}
          {error && <p role="alert" className="text-[12.5px] text-rose-400">{error}</p>}
          <Comments pins={here} number={number} active={active} setActive={setActive} name={name} onReply={(pin, text) => send({ t: 'reply', id: newId(), pin, text, by: name })} onDone={(pin, done) => send({ t: 'done', pin, done, by: name })} />
          <Decision decision={decision} name={name} onDecide={(value, note) => send({ t: 'decision', id: newId(), value, note, by: name })} />
        </aside>
      </div>
    </div>
  )
}

function NameField({ name, onName }: { name: string; onName: (n: string) => void }) {
  const [v, setV] = useState(name)
  useEffect(() => setV(name), [name])
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-[#d4d4de] mb-1">Your name</span>
      <input value={v} onChange={e => setV(e.target.value)} onBlur={() => onName(v.trim().slice(0, 60))} maxLength={60} placeholder="So the designer knows who said what" className={`w-full h-9 px-3 rounded-lg bg-black/40 border border-white/10 text-[13px] ${ring}`} />
    </label>
  )
}

function NewComment({ name, onSend, onCancel }: { name: string; onSend: (t: string) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState(''), [busy, setBusy] = useState(false)
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
      <span className="block text-[12.5px] font-semibold">New comment</span>
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={2000} placeholder="What should change here?" className={`w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-[13px] resize-y ${ring}`} />
      {!name && <p className="text-[12px] text-amber-200">Add your name above first.</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className={`${btn} text-[#a3a3b2] hover:text-white`}>Cancel</button>
        <button disabled={!text.trim() || !name || busy} onClick={async () => { setBusy(true); await onSend(text.trim()); setBusy(false) }} className={`${btn} bg-[#8b7cff] text-white`}>{busy ? 'Sending…' : 'Post comment'}</button>
      </div>
    </div>
  )
}

function Comments({ pins, number, active, setActive, name, onReply, onDone }: { pins: CPin[]; number: (id: string) => number; active: string | null; setActive: (id: string | null) => void; name: string; onReply: (pin: string, t: string) => Promise<boolean>; onDone: (pin: string, done: boolean) => Promise<boolean> }) {
  const [reply, setReply] = useState('')
  if (!pins.length) return <p className="text-[12.5px] text-[#8e8ea0] flex items-center gap-2"><MessageSquare size={14} />No comments on this image yet.</p>
  return (
    <ol className="space-y-2">
      {pins.map(p => (
        <li key={p.id} onClick={() => setActive(p.id)} className={`rounded-xl p-3 text-[13px] border ${active === p.id ? 'border-[#8b7cff]/60 bg-white/5' : 'border-white/10'}`}>
          <div className="flex gap-2">
            <span className={`w-6 h-6 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${p.done ? 'bg-emerald-400 text-black' : 'bg-[#8b7cff] text-white'}`}>{number(p.id)}</span>
            <div className="min-w-0 flex-1">
              <p><b className="font-semibold">{p.by}</b>{p.done && <span className="ml-1.5 text-[11px] text-emerald-300">Resolved</span>}</p>
              <p className={`whitespace-pre-wrap ${p.done ? 'text-[#8e8ea0]' : 'text-[#d4d4de]'}`}>{p.text}</p>
              {p.replies.map(r => <p key={r.id} className="mt-1.5 pl-2 border-l border-white/15"><b className="font-semibold">{r.by}</b> <span className="text-[#d4d4de] whitespace-pre-wrap">{r.text}</span></p>)}
              {active === p.id && (
                <div className="mt-2 space-y-1.5">
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} maxLength={2000} placeholder="Reply" className={`w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[13px] resize-y ${ring}`} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={e => { e.stopPropagation(); onDone(p.id, !p.done) }} className={`${btn} h-8 text-[#a3a3b2] hover:text-white`}>{p.done ? 'Reopen' : 'Mark resolved'}</button>
                    <button disabled={!reply.trim() || !name} onClick={async e => { e.stopPropagation(); if (await onReply(p.id, reply.trim())) setReply('') }} className={`${btn} h-8 bg-white/10`}>Reply</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Decision({ decision, name, onDecide }: { decision: ReturnType<typeof fold>['decision']; name: string; onDecide: (v: 'approved' | 'changes', note: string) => Promise<boolean> }) {
  const [asking, setAsking] = useState(false), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const go = async (v: 'approved' | 'changes') => { setBusy(true); if (await onDecide(v, v === 'changes' ? note.trim() : '')) { setAsking(false); setNote('') } setBusy(false) }
  return (
    <div className="rounded-xl border border-white/10 p-3 space-y-2">
      <span className="block text-[12.5px] font-semibold">Your decision on this version</span>
      {decision && (
        <p className={`text-[12.5px] rounded-lg px-2.5 py-1.5 ${decision.value === 'approved' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-100'}`}>
          {decision.by} {decision.value === 'approved' ? 'approved it' : 'asked for changes'} on {fmt(decision.at)}.{decision.note ? ` "${decision.note}"` : ''}
        </p>
      )}
      {asking ? (
        <>
          <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="What needs to change? Comments pinned on the images are sent too." className={`w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-[13px] resize-y ${ring}`} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAsking(false)} className={`${btn} text-[#a3a3b2]`}><X size={14} />Cancel</button>
            <button disabled={!name || busy} onClick={() => go('changes')} className={`${btn} bg-amber-300 text-black`}>Send</button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button disabled={!name || busy} onClick={() => go('approved')} className={`${btn} bg-emerald-400 text-black`}><Check size={15} />Approve</button>
          <button disabled={!name || busy} onClick={() => setAsking(true)} className={`${btn} bg-white/10`}>Ask for changes</button>
        </div>
      )}
      {!name && <p className="text-[12px] text-[#8e8ea0]">Add your name above to approve or ask for changes.</p>}
    </div>
  )
}

// ─── Delivery ──────────────────────────────────────────────────────

function Delivery({ share, manifest: m }: { share: OpenShare; manifest: DeliveryManifest }) {
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState<string | null>(null)
  const total = m.files.reduce((n, f) => n + f.size, 0)
  const save = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000) }
  const one = async (f: ShareFile) => {
    setBusy(f.path); setError(null)
    try { save(await (await import('@/lib/share')).fetchShareFile(share, f), f.name) } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  const all = async () => {
    setBusy('all'); setError(null)
    try {
      const { fetchShareFile } = await import('@/lib/share'), { zipFiles } = await import('@/editor/zip')
      const files = []
      for (const f of m.files) files.push({ name: f.name, blob: await fetchShareFile(share, f) })
      save(await zipFiles(files), `${(m.client ? `${m.client}_` : '') + m.job}_${m.label}.zip`.replace(/[^\w.-]+/g, '-'))
    } catch (e) { setError((e as Error).message || 'Could not download the files.') } finally { setBusy(null) }
  }
  return (
    <div>
      <Header m={m} expires={share.expiresAt} extra={`${m.files.length} file${m.files.length === 1 ? '' : 's'}, ${size(total)}, delivered ${fmt(m.at)}.`} />
      <div className="max-w-3xl p-4 sm:p-6 space-y-3">
        <button onClick={all} disabled={!!busy} className={`${btn} h-10 bg-[#8b7cff] text-white`}>{busy === 'all' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Download everything as a zip</button>
        {error && <p role="alert" className="text-[12.5px] text-rose-400">{error}</p>}
        <ul className="rounded-xl border border-white/10 divide-y divide-white/10">
          {m.files.map(f => (
            <li key={f.path} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1"><span className="block text-[13px] truncate font-mono">{f.name}</span><span className="block text-[11.5px] text-[#8e8ea0]">{size(f.size)}</span></span>
              <button onClick={() => one(f)} disabled={!!busy} aria-label={`Download ${f.name}`} className={`${btn} h-8 bg-white/10`}>{busy === f.path ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}Download</button>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-[#8e8ea0]">These files were encrypted before they were uploaded and are decrypted in your browser. Download them before the link stops working.</p>
      </div>
    </div>
  )
}
