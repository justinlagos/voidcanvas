'use client'
import { useEffect, useRef, useState } from 'react'
import { cloneCanvas, ctx2d } from '../engine'
import { applyRepair, repairAsync, retouchSource } from '../retouch'
import { acceptProposal, runProposals, type ProposalCandidate } from '../refine/proposals'
import { useEditor } from '../store'
import { Button, Modal } from './ui'

type Cand = ProposalCandidate<HTMLCanvasElement>

export function RepairDialog({ onClose }: { onClose: () => void }) {
  const [job, setJob] = useState(() => {
    const source = retouchSource()
    const st = useEditor.getState()
    const selection = st.selection
    if (!source || !selection || !st.doc) return null
    return {
      source,
      hole: cloneCanvas(selection),
      docId: st.doc.id,
      rev: st.docRev,
      layerId: source.layerId,
      attempt: 0,
    }
  })
  const [cands, setCands] = useState<Cand[]>([])
  const [failures, setFailures] = useState<{ label: string; error: string }[]>([])
  const [picked, setPicked] = useState(0)
  const [busy, setBusy] = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [original, setOriginal] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const view = useRef<HTMLCanvasElement>(null)
  const abort = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      abort.current?.abort()
    }
  }, [])

  const run = async (attempt: number) => {
    if (!job) return
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setBusy(true)
    setCancelled(false)
    setNotice(null)
    const st = useEditor.getState()
    try {
      const run = await runProposals<HTMLCanvasElement>(
        { docId: job.docId, docRevision: job.rev, layerId: job.layerId },
        {
          local: () => repairAsync(job.source, job.hole),
          ai: async () => {
            const ai = await import('../ai-tools')
            const { consent } = ai
            if (!consent('lama')) return { output: null, unavailable: 'On-device remover not enabled for this session.' }
            try {
              const out = await ai.repairSource(job.source.canvas, job.hole, job.hole)
              return { output: out }
            } catch (e) {
              return { output: null, unavailable: e instanceof Error ? e.message : 'The AI remover could not start in this browser.' }
            }
          },
        },
        { liveRev: () => useEditor.getState().docRev, signal: ctrl.signal },
      )
      if (!mounted.current) return
      if (ctrl.signal.aborted) {
        setCancelled(true)
        return
      }
      const labelled = run.candidates.map(c => ({
        ...c,
        label: attempt > 0 ? `${c.label} · try ${attempt + 1}` : c.label,
        id: `${c.id}-a${attempt}`,
      }))
      setCands(prev => [...prev, ...labelled].slice(-4))
      setPicked(0)
      setFailures(run.failures.map(f => ({ label: f.label, error: f.error })))
      if (run.stale) setNotice('The design changed while repairing. Review carefully — accepting re-checks before applying.')
      if (!labelled.length && !run.failures.length) setCancelled(true)
    } catch (e) {
      if (mounted.current) st.notify(String(e))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void run(0)
    }, 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sel = cands[Math.min(picked, Math.max(0, cands.length - 1))] ?? null
  useEffect(() => {
    const c = view.current
    const src = original ? job?.source.canvas : (sel?.output ?? job?.source.canvas)
    if (!c || !src) return
    const k = Math.min(1, 740 / src.width, 430 / src.height)
    c.width = Math.max(1, Math.round(src.width * k))
    c.height = Math.max(1, Math.round(src.height * k))
    ctx2d(c).drawImage(src, 0, 0, c.width, c.height)
  }, [job, sel, original])

  const cancel = () => {
    abort.current?.abort()
    setBusy(false)
    setCancelled(true)
  }

  const accept = () => {
    if (!job || !sel) return
    const st = useEditor.getState()
    const live = { docRevision: st.docRev, layerExists: st.layers.some(l => l.id === job.layerId) }
    const decision = acceptProposal(sel, live)
    if (!decision.ok) {
      setNotice(decision.reason ?? 'Stale result. Nothing was applied.')
      return
    }
    if (applyRepair({ ...job.source, separate: true }, sel.output, job.hole, `Repair (${sel.method === 'ai' ? 'AI' : 'local'})`)) onClose()
  }

  return (
    <Modal title="Repair region" onClose={onClose} wide>
      <div className="p-5 space-y-4" data-testid="repair-dialog">
        <p className="text-sm text-void-400">
          Proposals first — nothing is applied until you accept. The original stays on its layer; an accepted
          repair lands as its own patch layer in one undo step.
        </p>
        {!job ? (
          <p role="alert">Select a region on an image layer first.</p>
        ) : (
          <>
            <label className="text-sm flex gap-2">
              Sample
              <select
                aria-label="Repair sample"
                className="bg-void-800 px-2 rounded"
                value={job.source.mode ?? 'all'}
                disabled={busy}
                onChange={e => {
                  const s = useEditor.getState()
                  s.setOption('retouchSample', e.target.value as 'current' | 'below' | 'all')
                  const source = retouchSource()
                  if (source) {
                    abort.current?.abort()
                    setJob({ ...job, source, attempt: job.attempt })
                    setCands([])
                    setFailures([])
                    void run(job.attempt)
                  }
                }}
              >
                <option value="current">Current layer</option>
                <option value="below">Current and below</option>
                <option value="all">All visible layers</option>
              </select>
            </label>
            {cands.length > 1 && (
              <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Proposals">
                {cands.map((c, i) => (
                  <button
                    key={c.id}
                    aria-pressed={i === Math.min(picked, cands.length - 1)}
                    onClick={() => {
                      setPicked(i)
                      setOriginal(false)
                    }}
                    className={`h-7 px-2.5 rounded-md text-[12px] ${i === Math.min(picked, cands.length - 1) ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white hover:bg-void-800'}`}
                  >
                    {c.label} · {Math.round(c.ms)}ms
                  </button>
                ))}
              </div>
            )}
            <canvas ref={view} className="max-w-full mx-auto bg-void-800" />
            {busy && <p role="status">Finding clean matching texture…</p>}
            {cancelled && !cands.length && <p role="status">Cancelled. Nothing was changed.</p>}
            {!busy && !sel && !cancelled && (
              <p role="alert">
                No clean donor fits this selection. Try a smaller area with a little background around the
                subject, or enable the on-device AI remover below.
              </p>
            )}
            {failures.map(f => (
              <p key={f.label} className="text-[12.5px] text-void-500">
                {f.label}: {f.error}
              </p>
            ))}
            {notice && (
              <p role="status" className="text-[12.5px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                {notice}
              </p>
            )}
            <div className="flex gap-3 justify-end flex-wrap">
              {busy ? (
                <Button onClick={cancel}>Cancel</Button>
              ) : (
                <Button
                  onClick={() => {
                    const n = job.attempt + 1
                    setJob({ ...job, attempt: n })
                    void run(n)
                  }}
                >
                  Regenerate
                </Button>
              )}
              <Button onClick={() => setOriginal(!original)} disabled={!sel}>
                {original ? 'Show proposal' : 'Show original'}
              </Button>
              <Button onClick={onClose}>Reject</Button>
              <Button disabled={!sel || busy} onClick={accept}>
                Accept proposal
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
