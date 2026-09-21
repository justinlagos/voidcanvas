'use client'

import { useMemo, useRef } from 'react'
import { curveLut } from '../engine'

const S = 224

/** Tone curve. Click to add a point, drag to bend, double-click a point to remove it. */
export function CurvesEditor({ points, onChange, onCommit }: { points: [number, number][]; onChange: (p: [number, number][]) => void; onCommit: () => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef<number | null>(null)
  const lut = useMemo(() => curveLut(points), [points])
  const path = useMemo(() => Array.from(lut).map((y, x) => `${x ? 'L' : 'M'}${(x / 255) * S},${S - (y / 255) * S}`).join(''), [lut])

  const at = (e: React.PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect()
    return [Math.round(Math.min(255, Math.max(0, ((e.clientX - r.left) / r.width) * 255))), Math.round(Math.min(255, Math.max(0, (1 - (e.clientY - r.top) / r.height) * 255)))]
  }
  const down = (e: React.PointerEvent) => {
    const [x, y] = at(e)
    let i = points.findIndex(p => Math.abs(p[0] - x) < 12 && Math.abs(p[1] - y) < 16)
    if (i < 0) {
      const next = [...points, [x, lut[x]] as [number, number]].sort((a, b) => a[0] - b[0])
      i = next.findIndex(p => p[0] === x)
      onChange(next)
    }
    dragging.current = i
    svg.current!.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const i = dragging.current; if (i === null) return
    const [x, y] = at(e)
    const next = points.map(p => [...p] as [number, number])
    if (!next[i]) return
    const lo = i === 0 ? 0 : next[i - 1][0] + 2, hi = i === next.length - 1 ? 255 : next[i + 1][0] - 2
    next[i] = [i === 0 || i === next.length - 1 ? next[i][0] : Math.min(hi, Math.max(lo, x)), y]
    onChange(next)
  }
  const up = () => { if (dragging.current !== null) { dragging.current = null; onCommit() } }

  return (
    <div>
      <svg ref={svg} viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Tone curve"
        className="w-full aspect-square rounded-lg bg-void-950 border border-void-800 touch-none cursor-crosshair"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {[1, 2, 3].map(i => <g key={i} stroke="#2a2a33" strokeWidth="1"><line x1={(S * i) / 4} y1="0" x2={(S * i) / 4} y2={S} /><line x1="0" y1={(S * i) / 4} x2={S} y2={(S * i) / 4} /></g>)}
        <line x1="0" y1={S} x2={S} y2="0" stroke="#3a3a44" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="#8b7cff" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={(p[0] / 255) * S} cy={S - (p[1] / 255) * S} r="5.5" fill="#fff" stroke="#8b7cff" strokeWidth="2"
            onDoubleClick={e => { e.stopPropagation(); if (i > 0 && i < points.length - 1) { onChange(points.filter((_, j) => j !== i)); onCommit() } }} />
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[11px] text-void-500"><span>Shadows</span><span>Midtones</span><span>Highlights</span></div>
    </div>
  )
}

export const CURVE_PRESETS: { label: string; points: [number, number][] }[] = [
  { label: 'More contrast', points: [[0, 0], [64, 48], [192, 210], [255, 255]] },
  { label: 'Brighten', points: [[0, 0], [110, 150], [255, 255]] },
  { label: 'Darken', points: [[0, 0], [150, 110], [255, 255]] },
  { label: 'Faded film', points: [[0, 34], [70, 78], [190, 200], [255, 236]] },
]
