'use client'
import { useEffect, useRef, useState } from 'react'
import { cloneCanvas, ctx2d } from '../engine'
import { applyRepair, repairAsync, retouchSource } from '../retouch'
import { useEditor } from '../store'
import { Button, Modal } from './ui'
export function RepairDialog({ onClose }: { onClose: () => void }) {
  const [job, setJob] = useState(() => {
    const source = retouchSource(),
      selection = useEditor.getState().selection
    return source && selection ? { source, hole: cloneCanvas(selection) } : null
  })
  const [out, setOut] = useState<HTMLCanvasElement | null>(null),
    [busy, setBusy] = useState(true),
    [original, setOriginal] = useState(false)
  const view = useRef<HTMLCanvasElement>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    setBusy(true)
    setOut(null)
    let alive = true
    const t = setTimeout(async () => {
      try {
        const result = job ? await repairAsync(job.source, job.hole) : null
        if (alive) setOut(result)
      } catch (e) {
        if (alive) useEditor.getState().notify(String(e))
      } finally {
        if (alive) setBusy(false)
      }
    }, 30)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [job])
  useEffect(() => {
    const c = view.current,
      src = original ? job?.source.canvas : (out ?? job?.source.canvas)
    if (!c || !src) return
    const k = Math.min(1, 740 / src.width, 430 / src.height)
    c.width = src.width * k
    c.height = src.height * k
    ctx2d(c).drawImage(src, 0, 0, c.width, c.height)
  }, [job, out, original])
  const tryAI = async () => {
    if (!job) return
    setBusy(true)
    try {
      const result = await import('../ai-tools').then((m) =>
        m.repairSource(job.source.canvas, job.hole, job.hole),
      )
      if (mounted.current) setOut(result)
    } catch (e) {
      if (mounted.current) useEditor.getState().notify(String(e))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <Modal title="Remove selected area" onClose={onClose} wide>
      <div className="p-5 space-y-4">
        <p className="text-sm text-void-400">
          Preview the texture repair. All selected regions are excluded from sampling. The original stays on
          its layer.
        </p>
        <label className="text-sm flex gap-2">
          Sample
          <select
            aria-label="Repair sample"
            className="bg-void-800 px-2 rounded"
            value={job?.source.mode ?? 'all'}
            disabled={busy}
            onChange={(e) => {
              const s = useEditor.getState()
              s.setOption('retouchSample', e.target.value as 'current' | 'below' | 'all')
              const source = retouchSource()
              if (source && job) setJob({ ...job, source })
            }}
          >
            <option value="current">Current layer</option>
            <option value="below">Current and below</option>
            <option value="all">All visible layers</option>
          </select>
        </label>
        <canvas ref={view} className="max-w-full mx-auto bg-void-800" />
        {busy ? (
          <p role="status">Finding clean matching texture…</p>
        ) : !out ? (
          <p role="alert">
            No clean donor fits this selection. Try smaller selections with a little background around the
            text, or use the AI object remover for a complex background.
          </p>
        ) : null}
        <div className="flex gap-3 justify-end">
          {!out && !busy && job && <Button onClick={tryAI}>Try AI removal</Button>}
          <Button onClick={() => setOriginal(!original)} disabled={!out}>
            {original ? 'Show repair' : 'Show original'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            disabled={!out || !job || busy}
            onClick={() => {
              if (
                job &&
                out &&
                applyRepair({ ...job.source, separate: true }, out, job.hole, 'Remove selected area')
              )
                onClose()
            }}
          >
            Apply repair
          </Button>
        </div>
      </div>
    </Modal>
  )
}
