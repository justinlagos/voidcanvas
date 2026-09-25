'use client'

// The campaign destinations. Each one is a dare with a single button.
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BigButton, CampaignPage, DropButton, Small, focus } from './CampaignPage'
import { CLIENT_JOBS, formatClock, pick } from './briefs'
import { buildChallenge, lastBrief, startChallenge, type Challenge } from './challenge'
import { drawStarter } from './starters'
import { track } from '@/lib/analytics'

function useStart() {
  const [busy, setBusy] = useState(false)
  const go = useCallback(async (c: Challenge, own?: File | null) => { setBusy(true); try { await startChallenge(c, own) } catch { setBusy(false) } }, [])
  return { busy, go }
}

/** /make: the centre of the campaign. Click, get a brief, go. */
export function MakePage() {
  const { busy, go } = useStart()
  const [c, setC] = useState<Challenge | null>(null)
  const another = () => { track('challenge.retry', { kind: 'make', where: 'page' }); setC(buildChallenge('make', { last: lastBrief() })) }
  return (
    <CampaignPage kind="make" title={c ? <span data-brief className="text-[32px] sm:text-[56px] lg:text-[72px] tracking-[-0.04em]">{c.text}</span> : 'MAKE SOMETHING.'}
      sub={c ? <span data-brief-clock>You have {formatClock(c.seconds)}.</span> : undefined}>
      {!c ? <BigButton onClick={() => { track('challenge.brief', { kind: 'make' }); setC(buildChallenge('make', { last: lastBrief() })) }}>GIVE ME A CHALLENGE</BigButton> : (
        <>
          <BigButton busy={busy} onClick={() => go(c)}>GO</BigButton>
          <button onClick={another} className={`text-[14px] opacity-60 hover:opacity-100 rounded ${focus}`}>Another brief</button>
        </>
      )}
      {!c && <Small>A random brief, a clock, and the Editor. No signup, no tutorial.</Small>}
    </CampaignPage>
  )
}

/** /60: the clock starts when you press the button. */
export function SixtyPage() {
  const { busy, go } = useStart()
  return (
    <CampaignPage kind="60" title={<>YOU HAVE<br /><span className="font-mono tabular-nums">00:60</span></>} sub="Make something. The brief is waiting in the Editor.">
      <BigButton busy={busy} onClick={() => go(buildChallenge('60', { last: lastBrief() }))}>START THE CLOCK</BigButton>
    </CampaignPage>
  )
}

/** /five: five edits, then it is over. */
export function FivePage() {
  const { busy, go } = useStart()
  return (
    <CampaignPage kind="five" title={<>WORTH KEEPING<br />IN FIVE CLICKS?</>} sub="Every edit counts. The fifth one ends it.">
      <BigButton busy={busy} onClick={() => go(buildChallenge('five'))}>COUNT ME IN</BigButton>
    </CampaignPage>
  )
}

/** /rescue: the worst image on the internet, drawn here so it is legally ours. */
export function RescuePage() {
  const { busy, go } = useStart()
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => { try { setSrc(drawStarter('product').toDataURL('image/jpeg', 0.7)) } catch { /* no canvas */ } }, [])
  return (
    <CampaignPage kind="rescue" title="THIS IMAGE IS TERRIBLE." sub="Please improve it." dark={false}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img data-rescue-image src={src} alt="A badly lit bottle of olive oil on a kitchen table, tilted, with a timestamp" className="w-[220px] sm:w-[280px] aspect-[4/5] object-cover rounded-md shadow-[0_30px_80px_rgba(0,0,0,0.35)] rotate-[-2deg]" />}
      <BigButton light busy={busy} onClick={() => go(buildChallenge('rescue'))}>I ACCEPT.</BigButton>
    </CampaignPage>
  )
}

/** /brief: a random client, then the messages start. */
export function BriefPage() {
  const { busy, go } = useStart()
  const [c, setC] = useState<Challenge>(() => buildChallenge('brief', { seed: 3 }))
  useEffect(() => { setC(buildChallenge('brief')) }, [])
  return (
    <CampaignPage kind="brief" title="CLIENT FROM HELL." sub={<span data-client-job>“{c.text}”</span>} footer={`${CLIENT_JOBS.length} clients, ${formatClock(c.seconds)} each. The messages start once you are in.`}>
      <BigButton busy={busy} onClick={() => go(c)}>SURVIVE THE BRIEF.</BigButton>
      <button onClick={() => { track('challenge.retry', { kind: 'brief', where: 'page' }); let n = buildChallenge('brief'); for (let i = 0; i < 6 && n.text === c.text; i++) n = buildChallenge('brief'); setC(n) }} className={`text-[14px] opacity-60 hover:opacity-100 rounded ${focus}`}>Another client</button>
    </CampaignPage>
  )
}

/** /one-image: bring one image, work through ten directions. */
export function OneImagePage() {
  const { busy, go } = useStart()
  const onFile = useCallback((f: File) => { if (!f.type.startsWith('image/')) return; go(buildChallenge('one-image'), f) }, [go])
  return (
    <CampaignPage kind="one-image" title={<>ONE IMAGE.<br />TEN LIVES.</>} sub="Editorial. Poster. Album cover. Social. Experimental. Luxury. Brutalist. Retro. Minimal. Completely stupid.">
      {busy ? <BigButton busy>Opening</BigButton> : <DropButton accept="image/*" onFile={onFile}>CHOOSE AN IMAGE</DropButton>}
    </CampaignPage>
  )
}

/** /psd: drop it, it opens with its layers. */
export function PsdPage() {
  const { busy, go } = useStart()
  const [err, setErr] = useState<string | null>(null)
  const onFile = useCallback((f: File) => { if (!/\.psd$/i.test(f.name)) { setErr('That is not a PSD. Drop a .psd file.'); return } setErr(null); go(buildChallenge('psd'), f) }, [go])
  return (
    <CampaignPage kind="psd" title={<>YOUR PSD IS<br />NOT TRAPPED.</>} sub="Layers, groups, masks, text. It opens here, in the browser.">
      {busy ? <BigButton busy>Opening</BigButton> : <DropButton accept=".psd" onFile={onFile}>DROP A PSD</DropButton>}
      {err && <p role="alert" className="text-[14px] text-rose-400">{err}</p>}
    </CampaignPage>
  )
}

/** /remix and /remix/[id]: shared results need a server; that is the next phase. */
export function RemixPage({ id }: { id?: string }) {
  return (
    <CampaignPage kind="remix" title={<>MAKE YOUR<br />VERSION.</>} sub={id ? 'Remix links are not live yet. Every shared result will get its own page here.' : 'Shared results will live here, each with a button that opens it in the Editor.'} footer="Phase 2. Until then, the challenges are open.">
      <Link href="/make" data-campaign-cta className={`h-16 sm:h-20 px-9 sm:px-12 rounded-full inline-flex items-center text-[18px] sm:text-[24px] font-semibold tracking-tight bg-white text-[#0b0b0e] hover:bg-[#e9e9ec] ${focus}`}>MAKE SOMETHING INSTEAD</Link>
    </CampaignPage>
  )
}

export { pick }
