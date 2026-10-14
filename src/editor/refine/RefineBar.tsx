'use client'

/**
 * C3 Refine bar — the focused regional-editing mode, rendered in place of the
 * normal OptionsBar content while a raster layer is being refined.
 *
 * It introduces no new selection machinery: region tools are the existing
 * marquee/ellipse/lasso, mask ops are the existing store/ops functions, and
 * repair/removal are the existing Repair dialog and on-device AI remover.
 * Generative Replace/Extend stay visibly disabled until an authorised
 * provider is configured — they are never faked.
 */
import { useEffect } from 'react'
import { openModal } from '../actions'
import { modifySelection } from '../ops'
import { useEditor } from '../store'
import type { ToolId } from '../types'
import { focusRing } from '../components/ui'
import { enterRefineArea, exitRefineArea, refineStillValid } from './session'

const chip = (on: boolean) =>
  `h-7 px-2.5 rounded-md text-[12px] shrink-0 whitespace-nowrap ${focusRing} ${on ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white hover:bg-void-800'}`
const Sep = () => <span className="w-px h-5 bg-white/[0.08] shrink-0" />

function Step({ label, value, min, max, onChange, title }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; title?: string }) {
  return (
    <label className="flex items-center gap-1.5 shrink-0" title={title}>
      <span className="text-[12px] text-void-400">{label}</span>
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={e => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, Math.round(v))))
        }}
        onKeyDown={e => e.stopPropagation()}
        className={`w-14 h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums text-void-100 ${focusRing}`}
      />
    </label>
  )
}

/** Enter refine mode for the active layer from menus, panels and the floating bar. */
export function refineActiveLayer(): boolean {
  const s = useEditor.getState()
  const l = s.active()
  return enterRefineArea(
    { setTool: (t: ToolId) => s.setTool(t), setRefine: (id: string | null) => s.setRefine(id), notify: (m: string) => s.notify(m) },
    l && l.type === 'raster' ? { id: l.id, type: l.type, locked: l.locked, lockPixels: l.lockPixels, name: l.name } : null,
  )
}

export function RefineBar() {
  const refineId = useEditor(s => s.refineLayerId)
  const layer = useEditor(s => s.layers.find(l => l.id === s.refineLayerId))
  const tool = useEditor(s => s.tool)
  const selMode = useEditor(s => s.options.selMode ?? 'new')
  const feather = useEditor(s => s.options.feather ?? 0)
  const hasSelection = useEditor(s => !!s.selection)
  const s = useEditor.getState()

  // The target was deleted, locked or converted: leave the mode, keep the selection.
  useEffect(() => {
    if (refineId && !refineStillValid(layer && layer.type === 'raster' ? { id: layer.id, type: layer.type, locked: layer.locked, lockPixels: layer.lockPixels } : null)) {
      s.setRefine(null)
    }
  }, [refineId, layer, s])

  if (!refineId || !layer || layer.type !== 'raster') return null
  const setTool = (t: ToolId) => s.setTool(t)
  const done = () => exitRefineArea({ setTool, setRefine: (id: string | null) => s.setRefine(id), notify: (m: string) => s.notify(m) })

  return (
    <div
      role="toolbar"
      aria-label={`Refining ${layer.name}`}
      data-testid="refine-bar"
      className="vc-chrome h-10 shrink-0 flex items-center gap-2 px-3 overflow-x-auto no-scrollbar border-b border-white/[0.06] bg-[#14131a] text-void-300"
    >
      <span className="text-[12px] font-medium text-void-100 shrink-0" title={`Only “${layer.name}” is affected. Zoom and pan freely; the region stays aligned.`}>
        Refining <span className="text-accent-light">{layer.name}</span>
        <span className="ml-1.5 font-normal text-void-500">
          {layer.canvas.width}×{layer.canvas.height}px
        </span>
      </span>
      <Sep />
      {(['marquee', 'ellipse', 'lasso'] as const).map(t => (
        <button
          key={t}
          aria-label={`${t === 'marquee' ? 'Rectangular' : t === 'ellipse' ? 'Elliptical' : 'Freehand'} region tool`}
          aria-pressed={tool === t}
          title={t === 'marquee' ? 'Rectangular region (M)' : t === 'ellipse' ? 'Elliptical region' : 'Freehand region (L)'}
          onClick={() => setTool(t)}
          className={chip(tool === t)}
        >
          {t === 'marquee' ? 'Rect' : t === 'ellipse' ? 'Ellipse' : 'Lasso'}
        </button>
      ))}
      <span className="flex items-center gap-0.5 shrink-0" role="group" aria-label="How the next stroke combines">
        {(['new', 'add', 'sub', 'intersect'] as const).map(m => (
          <button
            key={m}
            aria-label={m === 'new' ? 'New region' : m === 'add' ? 'Add to region (Shift)' : m === 'sub' ? 'Subtract from region (Alt)' : 'Intersect with region'}
            aria-pressed={selMode === m}
            title={m === 'new' ? 'New region' : m === 'add' ? 'Add (Shift-drag)' : m === 'sub' ? 'Subtract (Alt-drag)' : 'Intersect'}
            onClick={() => s.setOption('selMode', m)}
            className={chip(selMode === m)}
          >
            {m === 'new' ? 'New' : m === 'add' ? 'Add' : m === 'sub' ? 'Sub' : 'Cut'}
          </button>
        ))}
      </span>
      <Sep />
      <Step label="Feather" value={feather} min={0} max={200} title="Soft edge in pixels" onChange={v => s.setOption('feather', v)} />
      <button
        className={chip(false)}
        disabled={!hasSelection}
        title="Swap selected and unselected areas"
        onClick={() => s.invertSelection()}
      >
        Invert
      </button>
      <button
        className={chip(false)}
        disabled={!hasSelection}
        title="Grow the region by 8px"
        onClick={() => modifySelection('expand', 8)}
      >
        Expand
      </button>
      <button
        className={chip(false)}
        disabled={!hasSelection}
        title="Shrink the region by 8px"
        onClick={() => modifySelection('contract', 8)}
      >
        Contract
      </button>
      <button
        className={chip(false)}
        disabled={!hasSelection}
        title="Clear the region"
        onClick={() => s.setSelection(null, 'Clear region')}
      >
        Clear
      </button>
      <Sep />
      <button
        className={`${chip(false)} !bg-accent !text-white font-medium`}
        disabled={!hasSelection}
        title={hasSelection ? 'Preview a texture repair, then apply it as its own patch layer' : 'Select a region first'}
        onClick={() => openModal('repair')}
      >
        Local repair…
      </button>
      <button
        className={chip(false)}
        disabled={!hasSelection}
        title={hasSelection ? 'Remove the selected area with the on-device remover (free, nothing uploaded)' : 'Select a region first'}
        onClick={async () => {
          const sel = useEditor.getState().selection
          if (!sel) return
          const { removeObject } = await import('../ai-tools')
          await removeObject(sel)
        }}
      >
        AI remove
      </button>
      <button className={chip(false)} disabled title="Generative replace needs an authorised image provider, which is not configured. Local repair and AI remove work on this device.">
        Replace…
      </button>
      <button className={chip(false)} disabled title="Generative extend needs an authorised image provider, which is not configured.">
        Extend…
      </button>
      <span className="ml-auto shrink-0">
        <button className={chip(false)} onClick={done} title="Leave refine mode (Esc). Your selection is kept.">
          Done
        </button>
      </span>
    </div>
  )
}
