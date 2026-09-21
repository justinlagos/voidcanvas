'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, ImagePlus, Save, Trash2, X } from 'lucide-react'
import { renderDoc, makeCanvas } from '../engine'
import { FONTS, canvasToBlob, downloadBlob, getBrand, saveBrand, saveDesign, zipFiles, type BrandKit } from '../io'
import { SIZE_PRESETS } from '../presets'
import { resizeDesign } from '../resize'
import { useEditor } from '../store'
import { Button, Modal, focusRing } from './ui'

// ─── Resize to every format ────────────────────────────────────────

export function ResizeDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const [picked, setPicked] = useState<Set<string>>(new Set(['square', 'story', 'yt']))
  const [working, setWorking] = useState<string | null>(null)
  const targets = SIZE_PRESETS.filter(p => picked.has(p.id) && !(p.width === doc.width && p.height === doc.height))

  const build = () => { const s = useEditor.getState(); return targets.map(p => ({ p, ...resizeDesign(s.doc!, s.layers, p.width, p.height, `${s.doc!.name} (${p.label})`) })) }
  const download = async () => {
    setWorking('Building files')
    const s = useEditor.getState()
    const files = []
    for (const t of build()) {
      const c = makeCanvas(t.doc.width, t.doc.height)
      renderDoc(c, t.doc, t.layers, { groups: s.groups, noCache: true })
      files.push({ name: `${t.p.label.replace(/[^\w ]+/g, '')} ${t.doc.width}x${t.doc.height}.png`, blob: await canvasToBlob(c) })
    }
    downloadBlob(await zipFiles(files), `${doc.name.replace(/[^\w\- ]+/g, '') || 'design'} all sizes.zip`)
    setWorking(null); onClose()
  }
  const saveAll = async () => {
    setWorking('Saving designs')
    const s = useEditor.getState()
    for (const t of build()) await saveDesign(t.doc, t.layers, s.groups, s.swatches)
    s.notify(`${targets.length} new designs saved. Find them under All designs to fine-tune each one.`)
    setWorking(null); onClose()
  }

  return (
    <Modal title="Resize for other formats" onClose={onClose} wide>
      <div className="p-5">
        <p className="text-[13px] text-void-400 mb-4 max-w-xl">Pick the formats you need. Backgrounds stretch to fill each one, everything else keeps its place and scales to fit. Your current design is not changed.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SIZE_PRESETS.map(p => {
            const on = picked.has(p.id), k = 44 / Math.max(p.width, p.height), same = p.width === doc.width && p.height === doc.height
            return (
              <button key={p.id} disabled={same} aria-pressed={on} onClick={() => setPicked(v => { const n = new Set(v); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left disabled:opacity-35 ${focusRing} ${on && !same ? 'border-[#8b7cff] bg-[#8b7cff]/10' : 'border-void-800 bg-void-900 hover:bg-void-800'}`}>
                <span className="w-11 h-11 shrink-0 flex items-center justify-center"><span className="block rounded-[2px] bg-white/85" style={{ width: p.width * k, height: p.height * k }} /></span>
                <span className="min-w-0"><span className="block text-[12.5px] font-medium truncate">{p.label}</span><span className="block text-[11.5px] text-void-500 tabular-nums">{same ? 'Current size' : `${p.width} × ${p.height}`}</span></span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <Button primary disabled={!targets.length || !!working} onClick={download}><Download size={15} />{working ?? `Download ${targets.length} as PNG`}</Button>
          <Button disabled={!targets.length || !!working} onClick={saveAll}><Save size={15} />Save as separate designs</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Brand kit ─────────────────────────────────────────────────────

function Logo({ blob, name }: { blob: Blob; name: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u) }, [blob])
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={name} className="max-w-full max-h-full object-contain" /> : null
}

export function BrandKitDialog({ onClose }: { onClose: () => void }) {
  const [kit, setKit] = useState<BrandKit | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const fg = useEditor(s => s.fg)
  useEffect(() => { getBrand().then(setKit) }, [])
  const update = (patch: Partial<BrandKit>) => setKit(k => { const n = { ...k!, ...patch }; saveBrand(n); applyBrand(n); return n })
  if (!kit) return null
  return (
    <Modal title="Brand kit" onClose={onClose} wide>
      <div className="p-5 space-y-6">
        <p className="text-[13px] text-void-400 max-w-xl">Set these once. Your colours and fonts are ready in every design, and your logos are one click away in the Add menu.</p>
        <section>
          <h3 className="text-[13px] font-semibold mb-2.5">Colours</h3>
          <div className="flex flex-wrap items-center gap-2">
            {kit.colors.map(c => (
              <span key={c} className="group relative"><span className="block w-10 h-10 rounded-lg border border-white/10" style={{ background: c }} title={c} />
                <button aria-label={`Remove ${c}`} onClick={() => update({ colors: kit.colors.filter(x => x !== c) })} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-void-700 text-white hidden group-hover:flex items-center justify-center"><X size={11} /></button></span>
            ))}
            <label className={`h-10 px-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-void-600 text-[12.5px] text-void-300 hover:text-white cursor-pointer ${focusRing}`}>
              <input type="color" defaultValue={fg} onBlur={e => { const c = e.target.value; if (!kit.colors.includes(c)) update({ colors: [...kit.colors, c] }) }} className="w-5 h-5 bg-transparent" />Add colour
            </label>
          </div>
        </section>
        <section>
          <h3 className="text-[13px] font-semibold mb-1">Fonts</h3>
          <p className="text-[12px] text-void-500 mb-2.5">The first one becomes the default for new text.</p>
          <div className="flex flex-wrap gap-1.5">
            {FONTS.map(f => { const on = kit.fonts.includes(f); return <button key={f} aria-pressed={on} onClick={() => update({ fonts: on ? kit.fonts.filter(x => x !== f) : [...kit.fonts, f] })} className={`h-8 px-2.5 rounded-lg text-[12.5px] border ${focusRing} ${on ? 'border-[#8b7cff] bg-[#8b7cff]/15 text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`}>{on ? `${kit.fonts.indexOf(f) + 1}. ` : ''}{f}</button> })}
          </div>
        </section>
        <section>
          <h3 className="text-[13px] font-semibold mb-2.5">Logos</h3>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => update({ logos: [...kit.logos, ...Array.from(e.target.files ?? []).map(f => ({ id: 'l' + Math.random().toString(36).slice(2), name: f.name, blob: f as Blob }))] })} />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {kit.logos.map(l => (
              <div key={l.id} className="group relative aspect-square rounded-xl p-3 flex items-center justify-center border border-void-800" style={{ background: 'repeating-conic-gradient(#2a2a33 0% 25%, #1a1a1f 0% 50%) 50% / 16px 16px' }}>
                <Logo blob={l.blob} name={l.name} />
                <button aria-label={`Remove ${l.name}`} onClick={() => update({ logos: kit.logos.filter(x => x.id !== l.id) })} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/70 text-white hidden group-hover:flex items-center justify-center"><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => file.current?.click()} className={`aspect-square rounded-xl border border-dashed border-void-600 text-void-300 hover:text-white flex flex-col items-center justify-center gap-1.5 text-[12px] ${focusRing}`}><ImagePlus size={18} />Add logo</button>
          </div>
          <p className="mt-2 text-[12px] text-void-500">PNG or SVG with a transparent background works best.</p>
        </section>
      </div>
    </Modal>
  )
}

/** Put brand colours first in the swatches and keep the brand font ready for new text. */
export function applyBrand(kit: BrandKit) {
  const s = useEditor.getState()
  useEditor.setState({ swatches: Array.from(new Set([...kit.colors, ...s.swatches])).slice(0, 21), brandFont: kit.fonts[0] ?? null } as any)
}

// ─── Shortcut sheet ────────────────────────────────────────────────

const KEYS: [string, [string, string][]][] = [
  ['Tools', [['V', 'Move'], ['B', 'Brush'], ['E', 'Eraser'], ['J', 'Heal'], ['S', 'Clone stamp'], ['T', 'Text'], ['U', 'Shape'], ['M / Shift M', 'Rectangle / ellipse select'], ['L', 'Lasso'], ['W', 'Magic wand'], ['G / Shift G', 'Fill / gradient'], ['I', 'Pick colour'], ['C', 'Crop'], ['Space', 'Pan']]],
  ['Layers', [['Ctrl J', 'Duplicate, or copy selection to layer'], ['Ctrl G', 'Group'], ['Ctrl Shift G', 'Ungroup'], ['Shift click', 'Select several'], ['[ ]', 'Send back / bring forward'], ['Arrows', 'Nudge (Shift for 10)'], ['Enter', 'Edit text'], ['Delete', 'Delete']]],
  ['Everything else', [['Ctrl K', 'Search every action'], ['\\ (hold)', 'See before'], ['Ctrl Z / Shift Z', 'Undo / redo'], ['Ctrl A / D', 'Select all / deselect'], ['Ctrl 0 / 1', 'Fit / 100%'], ['Ctrl E', 'Export'], ['[ ] with a brush', 'Brush size'], ['X / D', 'Swap / reset colours'], ['?', 'This sheet']]],
]

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} wide>
      <div className="p-5 grid sm:grid-cols-3 gap-6">
        {KEYS.map(([title, rows]) => (
          <section key={title}><h3 className="text-[13px] font-semibold mb-2.5">{title}</h3>
            <dl className="space-y-1.5">{rows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-3 text-[12.5px]"><dt className="text-void-400">{v}</dt><dd><kbd className="px-1.5 py-0.5 rounded bg-void-800 text-void-100 text-[11.5px] whitespace-nowrap">{k}</kbd></dd></div>)}</dl>
          </section>
        ))}
        <p className="sm:col-span-3 text-[12px] text-void-500">Coming from Photoshop? The tool keys are the same. On a Mac, use Cmd where it says Ctrl.</p>
      </div>
    </Modal>
  )
}
