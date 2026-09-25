'use client'

// Runs a challenge inside the Editor: the dare and the clock at the top, the end screen when time is up.
import { useEffect, useRef, useState } from 'react'
import { useEditor } from '@/editor/store'
import { exportImage, downloadBlob } from '@/editor/io'
import { track } from '@/lib/analytics'
import { focusRing } from '@/editor/components/ui'
import { formatClock } from './briefs'
import { buildChallenge, lastBrief, shareBlob, startChallenge, useChallenge } from './challenge'

const LINE_EVERY_MS = 18000

/** The dare and the clock, mounted over the stage. */
export function ChallengeBar() {
  const active = useChallenge(s => s.active)
  const done = useChallenge(s => s.done)
  if (!active || done) return null
  return <Bar />
}

/** The end screen, mounted with the Editor's dialogs. */
export function ChallengeEnd({ onExport }: { onExport: () => void }) {
  const active = useChallenge(s => s.active)
  const done = useChallenge(s => s.done)
  if (!active || !done) return null
  return <MadeScreen onExport={onExport} />
}

function Bar() {
  const c = useChallenge(s => s.active)!
  const startedAt = useChallenge(s => s.startedAt)
  const edits = useChallenge(s => s.edits)
  const linesShown = useChallenge(s => s.linesShown)
  const life = useChallenge(s => s.life)
  const [left, setLeft] = useState(c.seconds)
  const [open, setOpen] = useState(false)
  const [line, setLine] = useState<string | null>(null)
  const historyIndex = useEditor(s => s.historyIndex)
  const lastIdx = useRef(historyIndex)

  // Count edits: every step forward in history is one click.
  useEffect(() => {
    if (historyIndex > lastIdx.current) {
      const n = useChallenge.getState().edits + 1
      useChallenge.setState({ edits: n })
      if (c.clicks && n >= c.clicks) finish('clicks')
    }
    lastIdx.current = historyIndex
  }, [historyIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // The clock.
  useEffect(() => {
    if (!c.seconds) return
    const t = setInterval(() => {
      const l = c.seconds - (Date.now() - startedAt) / 1000
      setLeft(l)
      if (l <= 0) { clearInterval(t); finish('time') }
    }, 250)
    return () => clearInterval(t)
  }, [c.seconds, startedAt])

  // Client from hell: a new message every so often.
  useEffect(() => {
    if (!c.lines?.length) return
    const t = setInterval(() => {
      const st = useChallenge.getState()
      if (st.linesShown >= c.lines!.length) { clearInterval(t); return }
      setLine(c.lines![st.linesShown]); useChallenge.setState({ linesShown: st.linesShown + 1 })
      track('challenge.line', { kind: c.kind, n: st.linesShown + 1 })
    }, LINE_EVERY_MS)
    return () => clearInterval(t)
  }, [c.lines, c.kind])
  useEffect(() => { if (!line) return; const t = setTimeout(() => setLine(null), 6000); return () => clearTimeout(t) }, [line])

  const urgent = c.seconds > 0 && left <= 10
  const dir = c.directions?.[life]

  const nextLife = async () => {
    try {
      const blob = await exportImage({ format: 'jpeg', scale: 0.5, quality: 0.8, transparent: false })
      const url = await blobUrl(blob)
      const st = useChallenge.getState()
      const lives = [...st.lives, url]
      track('challenge.life', { kind: c.kind, life: st.life + 1, direction: dir?.id ?? null })
      if (st.life + 1 >= (c.directions?.length ?? 0)) { useChallenge.setState({ lives }); finish('lives'); return }
      useChallenge.setState({ lives, life: st.life + 1 })
      useEditor.getState().notify(`Life ${st.life + 1} kept. Next: ${c.directions![st.life + 1].name}.`)
    } catch { useEditor.getState().notify('Could not keep that one. Try again.') }
  }

  return (
    <>
      <div data-challenge-bar className="pointer-events-none absolute inset-x-0 top-2 z-[30] flex justify-center pl-2 pr-[96px] md:pr-3 md:pl-16">
        <div className={`pointer-events-auto flex items-center gap-2 w-full md:w-auto min-w-0 md:max-w-[720px] rounded-full border pl-3 pr-1.5 py-1.5 shadow-2xl backdrop-blur ${urgent ? 'bg-rose-600/95 border-rose-400 text-white' : 'bg-[#101014]/95 border-void-700 text-void-100'}`}>
          {c.seconds > 0 && <span data-challenge-clock className="font-mono tabular-nums text-[15px] font-semibold shrink-0">{formatClock(left)}</span>}
          {c.clicks > 0 && <span data-challenge-clicks className="font-mono tabular-nums text-[15px] font-semibold shrink-0">{Math.min(edits, c.clicks)}<span className="opacity-50">/{c.clicks}</span></span>}
          {dir && <span data-challenge-life className="text-[12px] font-semibold shrink-0 px-2 h-6 rounded-full bg-white text-void-950 flex items-center">{life + 1}/{c.directions!.length} {dir.name}</span>}
          <button onClick={() => setOpen(o => !o)} className={`flex-1 min-w-0 text-left text-[13px] leading-tight ${open ? 'whitespace-normal' : 'truncate'} ${focusRing} rounded`} title={c.text}>{dir ? dir.hint : c.text}</button>
          {c.directions ? (
            <button data-challenge-next onClick={nextLife} className={`shrink-0 h-8 px-3 rounded-full bg-white text-void-950 text-[12.5px] font-semibold hover:bg-void-100 ${focusRing}`}>Keep it, next life</button>
          ) : (
            <button data-challenge-done onClick={() => finish('done')} className={`shrink-0 h-8 px-3 rounded-full bg-white text-void-950 text-[12.5px] font-semibold hover:bg-void-100 ${focusRing}`}>Done</button>
          )}
        </div>
      </div>
      {line && (
        <div role="status" data-challenge-line className="absolute z-[31] right-3 top-14 md:top-16 max-w-[300px] rounded-2xl rounded-tr-sm bg-white text-void-950 px-4 py-3 shadow-2xl text-[13.5px] leading-snug">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-void-500 mb-0.5">The client</span>{line}
        </div>
      )}
    </>
  )
}

function finish(reason: string) {
  const st = useChallenge.getState(); if (!st.active || st.done) return
  track('challenge.done', { kind: st.active.kind, reason, edits: st.edits, seconds: Math.round((Date.now() - st.startedAt) / 1000), lives: st.lives.length })
  st.end()
}

function blobUrl(blob: Blob) { return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob) }) }

function MadeScreen({ onExport }: { onExport: () => void }) {
  const c = useChallenge(s => s.active)!
  const edits = useChallenge(s => s.edits)
  const lives = useChallenge(s => s.lives)
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const docName = useEditor(s => s.doc?.name ?? 'Made with Voidcanvas')

  useEffect(() => {
    let live = true
    exportImage({ format: 'png', scale: 1, quality: 1, transparent: false }).then(b => { if (!live) return; setBlob(b); setUrl(URL.createObjectURL(b)) }).catch(() => {})
    return () => { live = false }
  }, [])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const download = () => { if (!blob) return; track('challenge.export', { kind: c.kind, via: 'download' }); downloadBlob(blob, `${docName.replace(/[^\w\- ]+/g, '') || 'voidcanvas'}.png`) }
  const share = async () => {
    if (!blob) return
    const how = await shareBlob(blob, docName.replace(/[^\w\- ]+/g, '') || 'voidcanvas')
    track('challenge.share', { kind: c.kind, via: how })
    setNote(how === 'copied' ? 'Copied. Paste it anywhere.' : how === 'downloaded' ? 'Saved to your downloads.' : null)
  }
  const another = () => { track('challenge.retry', { kind: c.kind }); const kind = c.kind === 'remix' || c.kind === 'psd' || c.kind === 'one-image' ? 'make' : c.kind; startChallenge(buildChallenge(kind, { last: lastBrief() })) }
  const keepGoing = () => { track('challenge.continue', { kind: c.kind }); useChallenge.getState().clear() }

  const title = c.kind === 'rescue' ? 'RESCUED.' : c.kind === 'brief' ? 'YOU SURVIVED THE BRIEF.' : c.kind === 'one-image' ? `${lives.length} LIVES.` : 'YOU MADE THIS.'

  return (
    <div data-made-screen role="dialog" aria-label="You made this" className="fixed inset-0 z-[80] bg-[#0b0b0e]/95 text-white flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-6">
        <h2 className="text-[34px] sm:text-[56px] font-semibold tracking-[-0.04em] leading-none text-center">{title}</h2>
        {c.kind === 'one-image' && lives.length > 1 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-4xl w-full">
            {lives.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <figure key={i} className="rounded-lg overflow-hidden bg-void-900"><img src={u} alt={c.directions?.[i]?.name ?? `Life ${i + 1}`} className="w-full aspect-[4/5] object-cover" /><figcaption className="px-2 py-1 text-[11px] text-void-400">{c.directions?.[i]?.name}</figcaption></figure>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-[min(70vw,520px)] max-h-[48vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url ? <img src={url} alt="What you made" className="max-w-full max-h-[48vh] object-contain rounded-lg shadow-2xl" /> : <div className="w-64 h-80 rounded-lg bg-void-900 animate-pulse" />}
          </div>
        )}
        <p className="text-[13px] text-void-400">{edits} {edits === 1 ? 'edit' : 'edits'}{c.seconds ? ` in ${formatClock(Math.min(c.seconds, Math.round((Date.now() - useChallenge.getState().startedAt) / 1000)))}` : ''}. No account. Nothing left your browser.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button data-made-download onClick={download} disabled={!blob} className={`h-11 px-5 rounded-full bg-white text-void-950 text-[14px] font-semibold hover:bg-void-100 disabled:opacity-40 ${focusRing}`}>Download</button>
          <button data-made-share onClick={share} disabled={!blob} className={`h-11 px-5 rounded-full bg-void-800 text-white text-[14px] font-semibold hover:bg-void-700 disabled:opacity-40 ${focusRing}`}>Share</button>
          <button data-made-another onClick={another} className={`h-11 px-5 rounded-full bg-void-800 text-white text-[14px] font-semibold hover:bg-void-700 ${focusRing}`}>Try another</button>
          <button data-made-continue onClick={keepGoing} className={`h-11 px-5 rounded-full text-void-300 text-[14px] font-medium hover:text-white ${focusRing}`}>Keep editing</button>
        </div>
        {note && <p role="status" className="text-[13px] text-void-300">{note}</p>}
        <button onClick={() => { useChallenge.getState().clear(); onExport() }} className={`text-[12.5px] text-void-500 hover:text-void-300 underline underline-offset-4 ${focusRing}`}>Other formats and sizes</button>
      </div>
    </div>
  )
}
