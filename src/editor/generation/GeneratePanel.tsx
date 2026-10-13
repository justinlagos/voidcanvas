'use client'

/**
 * C2 Generate panel — compact, contextual composer for the free local
 * demonstration provider. Not a chatbot: prompt + aspect + count, inline
 * progress, tray gallery with Place / Fill / Replace / Variation.
 * Opens via `vc:open { name:'generate' }`; preserves selection/canvas state
 * (modal only, no doc writes until an explicit place/fill/replace).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useEditor } from '../store'
import { isEmptyFrame } from '../assets/place'
import { createMockGenerationProvider, validateGenerationRequest, type Aspect, type GeneratedCandidate } from './mock-provider'
import { markStaleIfMovedOn, startGeneration, type GenerationRun } from './tasks'
import { fillFrameWithGenerated, placeGeneratedAsset, registerGeneratedBatch, replaceWithGenerated } from './ingest-generated'
import type { NativeAsset } from '../assets/asset-store'
import { Modal, focusRing } from '../components/ui'

type Status = 'idle' | 'running' | 'ready' | 'failed' | 'canceled'

const ASPECTS: { id: Aspect; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
]

export function GeneratePanel({ onClose }: { onClose: () => void }) {
  const docRevAtOpen = useEditor(s => s.docRev)
  const activeId = useEditor(s => s.activeId)
  const layers = useEditor(s => s.layers)
  const active = useMemo(() => layers.find(l => l.id === activeId) ?? null, [layers, activeId])
  const activeIsFrame = isEmptyFrame(active)
  const activeIsRaster = !!active && active.type === 'raster' && !isEmptyFrame(active)

  const [prompt, setPrompt] = useState('')
  const [aspect, setAspect] = useState<Aspect>('square')
  const [count, setCount] = useState(2)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [assets, setAssets] = useState<NativeAsset[]>([])
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const submittedRev = useRef(docRevAtOpen)
  useEffect(() => {
    submittedRev.current = docRevAtOpen
  }, [docRevAtOpen])
  useEffect(() => {
    promptRef.current?.focus()
    return () => abort.current?.abort()
  }, [])

  const validation = validateGenerationRequest({
    prompt: prompt || '   ',
    aspect,
    count,
    capability: 'text-to-image',
  })
  const canStart = status !== 'running' && !validation

  const start = useCallback(
    async (variationOf?: string) => {
      const st = useEditor.getState()
      if (!st.doc) {
        setError('Open or create a design first.')
        return
      }
      setError(null)
      setStale(false)
      setStatus('running')
      setProgress(0)
      setAssets([])
      const ctrl = new AbortController()
      abort.current?.abort()
      abort.current = ctrl
      const rev = st.docRev
      submittedRev.current = rev
      try {
        const provider = createMockGenerationProvider()
        const run: GenerationRun = await startGeneration({
          provider,
          prompt: prompt.trim(),
          aspect,
          count,
          capability: variationOf ? 'variation' : 'text-to-image',
          referenceAssetId: variationOf,
          docRevision: rev,
          signal: ctrl.signal,
          onProgress: setProgress,
        })
        if (ctrl.signal.aborted) {
          setStatus('canceled')
          return
        }
        if (run.task.state === 'failed') {
          setStatus('failed')
          setError(run.task.error ?? 'Generation failed.')
          return
        }
        if (run.task.state === 'canceled') {
          setStatus('canceled')
          return
        }
        const registered = await registerGeneratedBatch(run.candidates, {
          prompt: prompt.trim(),
          aspect,
          parentId: variationOf ?? null,
        })
        const liveRev = useEditor.getState().docRev
        setStale(markStaleIfMovedOn(run, liveRev).stale || liveRev !== rev)
        setAssets(registered)
        setStatus('ready')
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError' || ctrl.signal.aborted) setStatus('canceled')
        else {
          setStatus('failed')
          setError(e instanceof Error ? e.message : 'Generation failed.')
        }
      }
    },
    [prompt, aspect, count],
  )

  const cancel = useCallback(() => {
    abort.current?.abort()
    setStatus('canceled')
  }, [])

  const act = useCallback(async (kind: string, fn: () => Promise<unknown>) => {
    setBusyAction(kind)
    try {
      await fn()
    } finally {
      setBusyAction(null)
    }
  }, [])

  return (
    <Modal title="Generate images" onClose={onClose} track="generate" wide>
      <div className="p-5 space-y-4 max-w-2xl" data-testid="generate-panel" aria-label="Generate images">
        <p className="text-[12.5px] text-void-400">
          Free, local demonstration provider <span className="font-mono text-[11.5px]">(mock-test-provider)</span> — sample artwork for layout, never
          real AI. Nothing leaves this device.
        </p>
        <div>
          <label htmlFor="generate-prompt" className="block text-[12.5px] font-medium mb-1">
            Describe the image
          </label>
          <textarea
            id="generate-prompt"
            ref={promptRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canStart) {
                e.preventDefault()
                void start()
              }
            }}
            rows={2}
            maxLength={1200}
            placeholder="A rocket poster over mountains at dusk…"
            aria-describedby="generate-hint"
            className={`w-full rounded-lg bg-void-900 border border-void-800 px-3 py-2 text-[13px] placeholder:text-void-600 ${focusRing}`}
          />
          <p id="generate-hint" className="mt-1 text-[11.5px] text-void-500">
            {prompt.trim().length < 3 ? 'At least 3 characters. ' : ''}⌘/Ctrl+Enter to generate. You can keep editing while it runs.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <fieldset>
            <legend className="text-[12.5px] font-medium mb-1">Aspect</legend>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Aspect ratio">
              {ASPECTS.map(a => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={aspect === a.id}
                  onClick={() => setAspect(a.id)}
                  className={`h-8 px-3 rounded-lg text-[12.5px] ${focusRing} ${aspect === a.id ? 'bg-void-700 text-white font-medium' : 'text-void-400 hover:text-white bg-void-900'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="generate-count" className="block text-[12.5px] font-medium mb-1">
              Candidates
            </label>
            <select
              id="generate-count"
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className={`h-8 rounded-lg bg-void-900 border border-void-800 px-2 text-[12.5px] ${focusRing}`}
            >
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {status === 'running' ? (
              <button onClick={cancel} className={`h-9 px-4 rounded-lg bg-void-800 hover:bg-void-700 text-[13px] font-medium ${focusRing}`}>
                Cancel
              </button>
            ) : (
              <button
                onClick={() => void start()}
                disabled={!canStart}
                title={validation ?? 'Generate candidates'}
                className={`h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:brightness-110 disabled:opacity-40 ${focusRing}`}
              >
                <Sparkles size={15} />
                {status === 'failed' || status === 'canceled' ? 'Retry' : 'Generate'}
              </button>
            )}
          </div>
        </div>
        {status === 'running' && (
          <div role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Generating {count} candidate{count === 1 ? '' : 's'}… {Math.round(progress * 100)}%
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-void-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-[12.5px] text-red-300">
            {error}{' '}
            <button onClick={() => void start()} className={`underline underline-offset-2 ${focusRing}`}>
              Try again
            </button>
          </p>
        )}
        {status === 'canceled' && !error && <p role="status" className="text-[12.5px] text-void-400">Cancelled. Nothing was added to your design.</p>}
        {stale && status === 'ready' && (
          <p role="status" className="text-[12.5px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            The design changed while generating. Candidates are kept below — review before placing.
          </p>
        )}
        {status === 'ready' && assets.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold mb-2">
              Candidates <span className="font-normal text-void-500">({assets.length})</span>
            </h3>
            <ul className="grid grid-cols-2 gap-2.5">
              {assets.map(a => (
                <CandidateCard
                  key={a.resourceId}
                  asset={a}
                  busy={busyAction}
                  canFill={!!activeId && activeIsFrame}
                  canReplace={!!activeId && activeIsRaster}
                  onPlace={() => void act(`place:${a.resourceId}`, () => placeGeneratedAsset(a.resourceId))}
                  onFill={() => activeId && void act(`fill:${a.resourceId}`, () => fillFrameWithGenerated(activeId, a.resourceId))}
                  onReplace={() => activeId && void act(`replace:${a.resourceId}`, () => replaceWithGenerated(activeId, a.resourceId))}
                  onVariation={() => {
                    setPrompt(p => p)
                    void start(a.resourceId)
                  }}
                />
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-void-500">Originals are preserved with lineage — undo (Ctrl+Z) reverses any placement.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function CandidateCard({
  asset,
  busy,
  canFill,
  canReplace,
  onPlace,
  onFill,
  onReplace,
  onVariation,
}: {
  asset: NativeAsset
  busy: string | null
  canFill: boolean
  canReplace: boolean
  onPlace: () => void
  onFill: () => void
  onReplace: () => void
  onVariation: () => void
}) {
  const candidate: GeneratedCandidate | null = null
  void candidate
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-2" data-candidate={asset.resourceId}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {asset.thumb ? <img src={asset.thumb} alt={asset.title} className="w-full aspect-square object-cover rounded-lg" /> : <span className="block w-full aspect-square rounded-lg bg-void-800" aria-hidden />}
      <span className="block mt-1.5 text-[12.5px] font-medium truncate" title={asset.title}>
        {asset.title}
      </span>
      <span className="block text-[11px] text-void-500">
        MOCK IMAGE — NOT AI · {asset.width}×{asset.height}
      </span>
      <div className="mt-1.5 grid grid-cols-2 gap-1">
        <button onClick={onPlace} disabled={!!busy} aria-label={`Place ${asset.title} as a new layer`} className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}>
          {busy?.startsWith('place:') ? 'Placing…' : 'Place'}
        </button>
        <button onClick={onVariation} disabled={!!busy} aria-label={`Generate a variation of ${asset.title}`} title="Generate a variation of this candidate" className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}>
          Variation
        </button>
        <button
          onClick={onFill}
          disabled={!canFill || !!busy}
          aria-label={`Fill selected frame with ${asset.title}`}
          title={canFill ? 'Fill the selected image frame' : 'Select an empty image frame first'}
          className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}
        >
          Fill
        </button>
        <button
          onClick={onReplace}
          disabled={!canReplace || !!busy}
          aria-label={`Replace selected image with ${asset.title}`}
          title={canReplace ? 'Replace the selected image, keeping position and effects' : 'Select an image layer first'}
          className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}
        >
          Replace
        </button>
      </div>
    </li>
  )
}

export function openGeneratePanel() {
  window.dispatchEvent(new CustomEvent('vc:open', { detail: { name: 'generate' } }))
}

export function GenerateCloseButton({ onClose }: { onClose: () => void }) {
  void onClose
  return (
    <button aria-label="Close generate panel" className={focusRing}>
      <X size={14} />
    </button>
  )
}
