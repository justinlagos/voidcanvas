'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mic, Square } from 'lucide-react'
import { Card, Loading, Notice, StudyFooterLinks, StudyFrame, field, focus, useParticipant } from '@/components/research/ui'
import { DATES, QUESTIONS, studyCall, studyErrorText, type Question, type StudyView } from '@/lib/research'

const MAX_SECONDS = 10 * 60
type Save = 'idle' | 'saving' | 'saved' | 'error'

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) if (MediaRecorder.isTypeSupported?.(m)) return m
  return ''
}
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function QuestionCard({ q, n, token, initial, onView }: { q: Question; n: number; token: string; initial: { text: string; audio: boolean } | undefined; onView: (v: StudyView) => void }) {
  const [text, setText] = useState(initial?.text || '')
  const [hasAudio, setHasAudio] = useState(!!initial?.audio)
  const [save, setSave] = useState<Save>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [rec, setRec] = useState<'off' | 'recording' | 'uploading'>('off')
  const [secs, setSecs] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const length = useRef(0)
  const textNow = useRef(initial?.text || '')
  const saved = useRef(initial?.text || '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!pickMime()

  const saveText = async (value: string) => {
    if (value === saved.current) return
    setSave('saving'); setErr(null)
    try {
      const r = await studyCall<{ view: StudyView }>('answer', { token, question: q.id, text: value })
      saved.current = value; setSave('saved'); onView(r.view)
    } catch (e) { setSave('error'); setErr(studyErrorText(e)) }
  }
  const onChange = (v: string) => {
    setText(v); textNow.current = v; setSave('idle')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => saveText(v), 1500)
  }

  const start = async () => {
    setErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMime()
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      r.onstop = () => { stream.getTracks().forEach(t => t.stop()); upload(new Blob(chunks.current, { type: r.mimeType || mime })) }
      recorder.current = r
      r.start(1000)
      setSecs(0); length.current = 0; setRec('recording')
      tick.current = setInterval(() => { length.current += 1; setSecs(length.current); if (length.current >= MAX_SECONDS) stop() }, 1000)
    } catch {
      setErr('We could not use your microphone. Check your browser allowed it, or type your answer instead.')
    }
  }
  const stop = () => { if (tick.current) clearInterval(tick.current); if (recorder.current?.state === 'recording') recorder.current.stop() }

  const upload = async (blob: Blob) => {
    setRec('uploading')
    try {
      const mime = blob.type.split(';')[0] || 'audio/webm'
      const { url, path } = await studyCall<{ url: string; path: string }>('voice-url', { token, question: q.id, mime })
      const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': mime, 'x-upsert': 'true' }, body: blob })
      if (!put.ok) throw new Error('upload')
      const r = await studyCall<{ view: StudyView }>('answer', { token, question: q.id, text: textNow.current, audioPath: path, audioSeconds: length.current })
      saved.current = textNow.current
      setHasAudio(true); setPreview(URL.createObjectURL(blob)); onView(r.view)
    } catch (e) {
      setErr(e instanceof Error && e.message === 'upload' ? 'The voice note did not upload. Check your connection and record it again, or type your answer.' : studyErrorText(e))
    } finally { setRec('off') }
  }

  const answered = !!text.trim() || hasAudio
  return (
    <Card className="!p-5 sm:!p-7">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-lp-accent">Question {n} of 6 · {q.title}</p>
        {answered && <span className="inline-flex items-center gap-1 text-[12.5px] text-emerald-400"><Check size={14} aria-hidden />Answered</span>}
      </div>
      <h2 className="mt-2 text-[19px] sm:text-[21px] leading-snug font-semibold tracking-tight text-lp-fg" id={`q-${q.id}`}>{q.prompt}</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-lp-dim">{q.hint}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {canRecord && rec === 'off' && (
          <button onClick={start} className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border border-lp-line text-[14.5px] text-lp-fg hover:border-lp-faint ${focus}`}>
            <Mic size={16} aria-hidden />{hasAudio ? 'Record again' : 'Record a voice note'}
          </button>
        )}
        {rec === 'recording' && (
          <button onClick={stop} className={`inline-flex items-center gap-2 h-10 px-4 rounded-full bg-rose-500/15 border border-rose-400/40 text-[14.5px] text-rose-200 ${focus}`}>
            <Square size={14} aria-hidden />Stop and save · {clock(secs)}
          </button>
        )}
        {rec === 'uploading' && <span className="inline-flex items-center gap-2 text-[14px] text-lp-dim"><Loader2 size={15} className="animate-spin" aria-hidden />Saving voice note…</span>}
        {hasAudio && rec === 'off' && <span className="text-[13.5px] text-lp-dim">Voice note saved.</span>}
        {!canRecord && <span className="text-[13.5px] text-lp-dim">Voice notes are not available in this browser. Typing works just as well.</span>}
      </div>
      {preview && <audio controls src={preview} className="mt-3 w-full max-w-[420px]" />}
      {rec === 'recording' && <p className="mt-2 text-[12.5px] text-lp-faint">Up to 10 minutes. Talk the way you would to a colleague.</p>}

      <label htmlFor={`a-${q.id}`} className="block mt-5 text-[14px] text-lp-dim">{hasAudio ? 'Anything to add in writing? (optional)' : 'Or type your answer'}</label>
      <textarea id={`a-${q.id}`} aria-describedby={`q-${q.id}`} value={text} onChange={e => onChange(e.target.value)} onBlur={() => saveText(text)} rows={4} maxLength={8000} className={`${field} mt-2 py-3 leading-relaxed resize-y`} />
      <div className="mt-2 h-5 text-[12.5px]" aria-live="polite">
        {save === 'saving' && <span className="text-lp-dim">Saving…</span>}
        {save === 'saved' && <span className="text-emerald-400">Saved</span>}
      </div>
      {err && <div className="mt-2"><Notice kind="error">{err}</Notice></div>}
    </Card>
  )
}

export default function InterviewPage() {
  const { token, view, setView, error } = useParticipant()
  const [done, setDone] = useState(0)
  useEffect(() => { if (view) setDone(QUESTIONS.filter(q => view.answers[q.id]?.text || view.answers[q.id]?.audio).length) }, [view])

  return (
    <StudyFrame eyebrow="Working Designer Study" title="Your last multi-format job" intro={<>Six questions, about 15 minutes. Answer by voice note or by typing, whichever is easier. Everything saves as you go, so you can stop and come back. Please answer by {DATES.dueShort}.</>}>
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !view && <Loading />}
      {view && !['active', 'complete', 'paid'].includes(view.status) && <Notice>These questions open once you have joined the study.</Notice>}
      {view && token && ['active', 'complete', 'paid'].includes(view.status) && (
        <>
          <div className="sticky top-12 z-10 -mx-5 sm:mx-0 px-5 sm:px-0 py-3 bg-lp-bg/90 backdrop-blur">
            <div className="flex items-center justify-between text-[13.5px] text-lp-dim"><span>{done} of 6 answered</span>{done === 6 && <span className="text-emerald-400">All done</span>}</div>
            <div className="mt-2 h-1.5 rounded-full bg-lp-panel overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={done} aria-label="Questions answered"><div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${(done / 6) * 100}%` }} /></div>
          </div>
          <div className="mt-4 space-y-5">
            {QUESTIONS.map((q, i) => <QuestionCard key={q.id} q={q} n={i + 1} token={token} initial={view.answers[q.id]} onView={setView} />)}
          </div>
          <div className="mt-8">
            {done === 6
              ? <Notice kind="ok">Thank you. All six answers are saved. The next step is one real client job in Studio. <Link href={`/research/me?p=${token}`} className="text-lp-accent underline underline-offset-2">Back to your study page</Link></Notice>
              : <Link href={`/research/me?p=${token}`} className="text-[14.5px] text-lp-accent hover:text-lp-fg">Save and come back later</Link>}
          </div>
        </>
      )}
      <StudyFooterLinks />
    </StudyFrame>
  )
}
