'use client'

import { useEffect, useState } from 'react'
import { GRADIENT_PRESETS, GRADIENT_TYPES, type GradientStop } from '../gradient'
import type { GradientOverlayStyle } from '../types'
type GradientOverlayStyleOptions = Pick<GradientOverlayStyle, 'from' | 'to' | 'angle' | 'scale' | 'kind' | 'stops' | 'reverse' | 'centerX' | 'centerY' | 'aspect'>
import { ColorField, Select, Slider } from './ui'

const KEY = 'voidcanvas.gradient-presets.v1'
type Personal = { name: string; stops: GradientStop[] }

export function GradientControls({ value: v, patch, commit = () => {} }: {
  value: GradientOverlayStyleOptions; patch: (p: Partial<GradientOverlayStyleOptions>) => void; commit?: () => void
}) {
  const stops: GradientStop[] = v.stops?.length ? v.stops : [{ position: 0, color: v.from }, { position: 1, color: v.to }]
  const [personal, setPersonal] = useState<Personal[]>([])
  useEffect(() => { try { setPersonal(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch {} }, [])
  const savePersonal = () => {
    const name = window.prompt('Preset name', `Gradient ${personal.length + 1}`)?.trim(); if (!name) return
    const next = [...personal.filter(p => p.name !== name), { name, stops }].slice(-12)
    setPersonal(next); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }
  const update = (i: number, p: Partial<GradientStop>) => patch({ stops: stops.map((s, j) => j === i ? { ...s, ...p } : s) })
  const done = (p: Partial<GradientOverlayStyleOptions>) => { patch(p); commit() }
  const applyStops = (list: GradientStop[]) => done({ from: list[0].color, to: list[list.length - 1].color, stops: list.map(s => ({ ...s })) })
  return <div className="space-y-3" data-gradient-controls>
    <Select label="Gradient type" value={v.kind ?? 'linear'} options={GRADIENT_TYPES} onChange={kind => done({ kind: kind as typeof v.kind })} />
    <div className="flex flex-wrap gap-1.5" aria-label="Gradient presets">
      {GRADIENT_PRESETS.map(p => <button key={p.name} title={p.name} aria-label={`${p.name} gradient`} onClick={() => applyStops(p.colors.map((color, i) => ({ color, position: i / (p.colors.length - 1) })))} className="h-7 w-10 rounded border border-white/20 focus-visible:ring-2 focus-visible:ring-accent" style={{ background: `linear-gradient(to right, ${p.colors.join(',')})` }} />)}
      {personal.map(p => <button key={p.name} title={p.name} aria-label={`${p.name} saved gradient`} onClick={() => applyStops(p.stops)} className="h-7 px-2 rounded border border-accent/40 text-[10px] text-void-200 hover:bg-white/[0.05]">{p.name}</button>)}
      <button onClick={savePersonal} className="h-7 px-2 rounded border border-white/15 text-[10px] text-void-300 hover:text-white">Save preset</button>
    </div>
    {stops.map((s, i) => <div key={i} className="space-y-1.5 rounded bg-white/[0.03] p-2">
      <ColorField label={`Stop ${i + 1}`} value={s.color} onChange={color => color && update(i, { color })} onCommit={commit} />
      <Slider label="Position" value={Math.round(s.position * 100)} min={0} max={100} unit="%" onChange={position => update(i, { position: position / 100 })} onCommit={commit} />
      <Slider label="Opacity" value={Math.round((s.opacity ?? 1) * 100)} min={0} max={100} unit="%" onChange={opacity => update(i, { opacity: opacity / 100 })} onCommit={commit} />
      {i < stops.length - 1 && <Slider label="Midpoint" value={Math.round((s.midpoint ?? 0.5) * 100)} min={5} max={95} unit="%" onChange={midpoint => update(i, { midpoint: midpoint / 100 })} onCommit={commit} />}
      {stops.length > 2 && <button className="text-xs text-void-400" onClick={() => done({ stops: stops.filter((_, j) => i !== j) })}>Remove stop {i + 1}</button>}
    </div>)}
    {stops.length < 8 && <button className="text-xs text-void-200 underline" onClick={() => done({ stops: [...stops, { position: 0.5, color: '#ffffff', opacity: 1, midpoint: 0.5 }] })}>Add colour stop</button>}
    <label className="flex gap-2 text-xs text-void-300"><input type="checkbox" checked={v.reverse ?? false} onChange={e => done({ reverse: e.target.checked })} />Reverse colours</label>
    <details className="space-y-3">
      <summary className="text-xs text-void-300 cursor-pointer">Placement and shape</summary>
      <Slider label="Angle" value={v.angle} min={-180} max={180} unit="°" onChange={angle => patch({ angle })} onCommit={commit} />
      <Slider label="Scale" value={v.scale} min={1} max={300} unit="%" onChange={scale => patch({ scale })} onCommit={commit} />
      <Slider label="Centre X" value={v.centerX ?? 50} min={0} max={100} unit="%" onChange={centerX => patch({ centerX })} onCommit={commit} />
      <Slider label="Centre Y" value={v.centerY ?? 50} min={0} max={100} unit="%" onChange={centerY => patch({ centerY })} onCommit={commit} />
      {(v.kind === 'radial' || v.kind === 'diamond') && <Slider label="Shape ratio" value={v.aspect ?? 1} min={0.1} max={3} step={0.05} onChange={aspect => patch({ aspect })} onCommit={commit} />}
      <p className="text-xs text-void-500">Stops can carry their own opacity and midpoint. Placement remains editable and non-destructive.</p>
    </details>
  </div>
}
