'use client'

import { GRADIENT_PRESETS, GRADIENT_TYPES } from '../gradient'
import type { GradientOverlayStyle } from '../types'
type GradientOverlayStyleOptions = Pick<GradientOverlayStyle, 'from' | 'to' | 'angle' | 'scale' | 'kind' | 'stops' | 'reverse' | 'centerX' | 'centerY' | 'aspect'>
import { ColorField, Select, Slider } from './ui'

export function GradientControls({ value: v, patch, commit = () => {} }: {
  value: GradientOverlayStyleOptions; patch: (p: Partial<GradientOverlayStyleOptions>) => void; commit?: () => void
}) {
  const stops = v.stops?.length ? v.stops : [{ position: 0, color: v.from }, { position: 1, color: v.to }]
  const update = (i: number, p: Partial<(typeof stops)[number]>) => patch({ stops: stops.map((s, j) => j === i ? { ...s, ...p } : s) })
  const done = (p: Partial<GradientOverlayStyleOptions>) => { patch(p); commit() }
  return <div className="space-y-3" data-gradient-controls>
    <Select label="Gradient type" value={v.kind ?? 'linear'} options={GRADIENT_TYPES} onChange={kind => done({ kind: kind as typeof v.kind })} />
    <div className="flex flex-wrap gap-1.5" aria-label="Gradient presets">
      {GRADIENT_PRESETS.map(p => <button key={p.name} title={p.name} aria-label={`${p.name} gradient`} onClick={() => done({ from: p.colors[0], to: p.colors[p.colors.length - 1], stops: p.colors.map((color, i) => ({ color, position: i / (p.colors.length - 1) })) })} className="h-7 w-10 rounded border border-white/20 focus-visible:ring-2 focus-visible:ring-accent" style={{ background: `linear-gradient(to right, ${p.colors.join(',')})` }} />)}
    </div>
    {stops.map((s, i) => <div key={i} className="space-y-1.5 rounded bg-white/[0.03] p-2">
      <ColorField label={`Stop ${i + 1}`} value={s.color} onChange={color => color && update(i, { color })} onCommit={commit} />
      <Slider label={`Stop ${i + 1} position`} value={Math.round(s.position * 100)} min={0} max={100} unit="%" onChange={position => update(i, { position: position / 100 })} onCommit={commit} />
      {stops.length > 2 && <button className="text-xs text-void-400" onClick={() => done({ stops: stops.filter((_, j) => i !== j) })}>Remove stop {i + 1}</button>}
    </div>)}
    {stops.length < 8 && <button className="text-xs text-void-200 underline" onClick={() => done({ stops: [...stops, { position: 0.5, color: '#ffffff' }] })}>Add colour stop</button>}
    <label className="flex gap-2 text-xs text-void-300"><input type="checkbox" checked={v.reverse ?? false} onChange={e => done({ reverse: e.target.checked })} />Reverse colours</label>
    <details className="space-y-3">
      <summary className="text-xs text-void-300 cursor-pointer">Placement and shape</summary>
      <Slider label="Angle" value={v.angle} min={-180} max={180} unit="°" onChange={angle => patch({ angle })} onCommit={commit} />
      <Slider label="Scale" value={v.scale} min={1} max={300} unit="%" onChange={scale => patch({ scale })} onCommit={commit} />
      <Slider label="Centre X" value={v.centerX ?? 50} min={0} max={100} unit="%" onChange={centerX => patch({ centerX })} onCommit={commit} />
      <Slider label="Centre Y" value={v.centerY ?? 50} min={0} max={100} unit="%" onChange={centerY => patch({ centerY })} onCommit={commit} />
      {(v.kind === 'radial' || v.kind === 'diamond') && <Slider label="Shape ratio" value={v.aspect ?? 1} min={0.1} max={3} step={0.05} onChange={aspect => patch({ aspect })} onCommit={commit} />}
      <p className="text-xs text-void-500">Radial at ratio 1 is circular. Change the ratio for an ellipse. Stops control where each colour appears.</p>
    </details>
  </div>
}
