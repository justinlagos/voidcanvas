'use client'
import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../store'
import { cloneCanvas, ctx2d, makeCanvas } from '../engine'
import { runPixels } from '../pixel-worker'
import { type LiquifyDab } from '../liquify'
import { Button, Modal, Slider } from './ui'
export function LiquifyDialog({ onClose }: { onClose: () => void }) {
  const [job] = useState(() => {
    const s = useEditor.getState(),
      l = s.active()
    return l?.type === 'raster' && !l.smart && !l.locked && !l.lockPixels
      ? {
          id: l.id,
          rev: l.rev,
          docId: s.doc?.id,
          source: l.liquify?.source ?? l.canvas,
          strokes: l.liquify?.strokes ?? [],
        }
      : null
  })
  const [strokes, setStrokes] = useState<LiquifyDab[]>(job?.strokes ?? []),
    [mode, setMode] = useState<LiquifyDab['mode']>('push'),
    [radius, setRadius] = useState(12),
    [strength, setStrength] = useState(0.6),
    [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const view = useRef<HTMLCanvasElement>(null),
    last = useRef<{ x: number; y: number } | null>(null)
  const [preview] = useState(() => {
    if (!job) return null
    const k = Math.min(1, 800 / Math.max(job.source.width, job.source.height)),
      c = makeCanvas(job.source.width * k, job.source.height * k)
    ctx2d(c).drawImage(job.source, 0, 0, c.width, c.height)
    return c
  })
  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      const c = view.current
      if (!preview || !c) return
      try {
        const im = ctx2d(preview).getImageData(0, 0, preview.width, preview.height),
          result = await runPixels({
            kind: 'liquify',
            src: im.data,
            w: preview.width,
            h: preview.height,
            strokes,
          })
        if (!alive || !result) return
        im.data.set(result)
        c.width = preview.width
        c.height = preview.height
        ctx2d(c).putImageData(im, 0, 0)
      } catch (e) {
        useEditor.getState().notify(String(e))
      }
    }, 50)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [preview, strokes])
  const pos = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  const dab = (p: { x: number; y: number }, prev: { x: number; y: number }) =>
    setStrokes((a) =>
      a.length >= 600
        ? a
        : [
            ...a,
            {
              ...p,
              dx: Math.max(-0.03, Math.min(0.03, p.x - prev.x)),
              dy: Math.max(-0.03, Math.min(0.03, p.y - prev.y)),
              radius: radius / 100,
              strength,
              mode,
            },
          ],
    )
  const apply = async () => {
    if (!job) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 20))
    try {
      const s = useEditor.getState(),
        l = s.layers.find((x) => x.id === job.id)
      if (s.doc?.id !== job.docId || l?.rev !== job.rev) {
        s.notify('The layer changed. Reopen Liquify.')
        return
      }
      const c = cloneCanvas(job.source),
        x = ctx2d(c),
        im = x.getImageData(0, 0, c.width, c.height)
      const result = await runPixels({ kind: 'liquify', src: im.data, w: c.width, h: c.height, strokes })
      if (!result || !alive.current) return
      if (
        useEditor.getState().doc?.id !== job.docId ||
        useEditor.getState().layers.find((x) => x.id === job.id)?.rev !== job.rev
      ) {
        s.notify('The layer changed while applying Liquify. Reopen it.')
        return
      }
      im.data.set(result)
      x.putImageData(im, 0, 0)
      s.updateLayer(job.id, { canvas: c, liquify: { source: job.source, strokes } }, 'Liquify')
      onClose()
    } catch (e) {
      useEditor.getState().notify(String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Liquify" onClose={onClose} wide>
      <div className="p-5 space-y-3">
        {!job ? (
          <p>Select an unlocked raster layer. Rasterize a smart object explicitly before liquifying it.</p>
        ) : (
          <>
            <div className="flex gap-2">
              {(['push', 'pinch', 'bloat', 'restore'] as const).map((m) => (
                <Button key={m} onClick={() => setMode(m)}>
                  {mode === m ? '✓ ' : ''}
                  {m}
                </Button>
              ))}
            </div>
            <Slider label="Radius" value={radius} min={1} max={40} unit="%" onChange={setRadius} />
            <Slider
              label="Strength"
              value={strength * 100}
              min={1}
              max={100}
              onChange={(v) => setStrength(v / 100)}
            />
            <canvas
              aria-label="Liquify preview"
              ref={view}
              className="max-w-full mx-auto touch-none bg-void-800"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                last.current = pos(e)
                if (mode !== 'push') dab(last.current, last.current)
              }}
              onPointerMove={(e) => {
                if (!last.current) return
                const p = pos(e)
                if (Math.hypot(p.x - last.current.x, p.y - last.current.y) < 0.004) return
                dab(p, last.current)
                last.current = p
              }}
              onPointerUp={() => {
                last.current = null
              }}
              onPointerCancel={() => {
                last.current = null
              }}
            />
            <p className="text-xs text-void-400">
              The source is preserved. Reopen Liquify to adjust or reset. Preview uses reduced resolution;
              Apply renders the original resolution. {strokes.length}/600 dabs.
            </p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setStrokes((a) => a.slice(0, -1))}>Undo dab</Button>
              <Button onClick={() => setStrokes([])}>Reset</Button>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={apply} disabled={busy}>
                {busy ? 'Applying…' : 'Apply'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
