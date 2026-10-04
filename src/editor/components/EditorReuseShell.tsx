'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookmarkPlus, Library, Sparkles, Trash2, Type, X } from 'lucide-react'
import { EditorShell } from './EditorShell'
import { useEditor } from '../store'
import {
  applyColourLook,
  applyLook,
  applyTextStyle,
  listLibrary,
  removeReusableItem,
  saveLook,
  saveTextStyle,
  type ReusableItem,
} from '../reuse'

const button = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[.06] px-3 text-xs font-medium text-zinc-100 transition hover:bg-white/[.1] disabled:cursor-not-allowed disabled:opacity-35'
const quiet = 'text-[11px] leading-5 text-zinc-400'

/**
 * Phase 7A is intentionally wrapped around EditorShell instead of changing the editor's layout.
 * Desktop gets a small Reuse pill; phones get the same control above the mode bar. The library
 * becomes a bottom sheet on narrow screens and a compact floating panel on desktop.
 */
export function EditorReuseShell() {
  const hasDoc = useEditor(s => !!s.doc)
  const activeId = useEditor(s => s.activeId)
  const selectedIds = useEditor(s => s.selectedIds)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReusableItem[]>([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const active = useMemo(() => {
    if (!activeId) return null
    return useEditor.getState().layers.find(l => l.id === activeId) ?? null
  }, [activeId])

  const refresh = useCallback(async () => setItems(await listLibrary()), [])
  useEffect(() => { if (open) refresh() }, [open, refresh])

  // One discoverable shortcut without taking a common browser/editor shortcut.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!hasDoc || !e.altKey || !e.shiftKey || e.key.toLowerCase() !== 'l') return
      const el = e.target as HTMLElement | null
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
      e.preventDefault(); setOpen(v => !v)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [hasDoc])

  const save = async (kind: 'look' | 'text') => {
    const n = name.trim() || (kind === 'text' ? 'Text style' : active?.name ? `${active.name} look` : 'New look')
    setSaving(true)
    try {
      const item = kind === 'text' ? await saveTextStyle(n) : await saveLook(n)
      if (!item) {
        useEditor.getState().notify(kind === 'text' ? 'Select a text layer first.' : 'Select a layer or group appearance first.')
        return
      }
      setName('')
      await refresh()
      useEditor.getState().notify(kind === 'text' ? `Saved text style “${n}”.` : `Saved Look “${n}”.`)
    } finally { setSaving(false) }
  }

  const apply = (item: ReusableItem) => {
    const ok = item.kind === 'look' ? applyLook(item) : item.kind === 'textStyle' ? applyTextStyle(item) : applyColourLook(item)
    if (!ok) {
      useEditor.getState().notify(item.kind === 'textStyle' ? 'Select one or more text layers.' : 'Select a compatible layer first.')
      return
    }
    useEditor.getState().notify(item.kind === 'textStyle' ? `Applied “${item.name}”.` : `Applied Look “${item.name}”.`)
  }

  const remove = async (item: ReusableItem) => {
    await removeReusableItem(item)
    await refresh()
    useEditor.getState().notify(`Removed “${item.name}” from your library.`)
  }

  return <>
    <EditorShell />

    {hasDoc && <button
      type="button"
      data-reuse-library
      onClick={() => setOpen(true)}
      title="Reusable Looks and text styles · Alt+Shift+L"
      className="fixed bottom-[70px] right-3 z-[115] inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-zinc-950/90 px-3 text-xs font-semibold text-white shadow-xl backdrop-blur md:bottom-3"
    ><Library size={14} />Reuse</button>}

    {open && <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/35 md:items-center" onMouseDown={e => { if (e.currentTarget === e.target) setOpen(false) }}>
      <section aria-label="Reusable library" className="max-h-[84dvh] w-full overflow-hidden rounded-t-2xl border border-white/10 bg-[#111214] shadow-2xl md:w-[440px] md:rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><div className="text-sm font-semibold text-white">Reuse</div><div className={quiet}>Looks and type you can carry into the next design.</div></div>
          <button aria-label="Close reuse library" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[.06] hover:text-white" onClick={() => setOpen(false)}><X size={16} /></button>
        </header>

        <div className="max-h-[calc(84dvh-70px)] overflow-y-auto p-4">
          <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-200"><BookmarkPlus size={14} />Save what is selected</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={active?.name ? `${active.name} look` : 'Name this style'} className="mb-2 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
            <div className="flex flex-wrap gap-2">
              <button className={button} disabled={saving || !active || active.type === 'adjustment'} onClick={() => save('look')}><Sparkles size={14} />Save as Look</button>
              <button className={button} disabled={saving || active?.type !== 'text'} onClick={() => save('text')}><Type size={14} />Save text style</button>
            </div>
            <p className={`${quiet} mt-2`}>A Look keeps appearance and the ordered effect stack, not the content. Effect masks stay with their original layer.</p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-200">Your library</div>
            <div className={quiet}>{selectedIds.length ? `${selectedIds.length} selected` : 'Select a target to apply'}</div>
          </div>

          {!items.length ? <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-500">Nothing saved yet. Treat something once, save it, then reuse it instead of rebuilding it.</div> :
            <div className="mt-2 space-y-2">{items.map(item => <div key={`${item.kind}:${item.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3">
              {item.kind === 'colourLook' && item.thumb ? <img src={item.thumb} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-zinc-300">{item.kind === 'textStyle' ? <Type size={16} /> : <Sparkles size={16} />}</div>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-100">{item.name}</div>
                <div className={quiet}>{item.kind === 'textStyle' ? 'Text style' : item.kind === 'colourLook' ? 'Colour look · Studio reference' : `${item.appearance.effects.length} effect${item.appearance.effects.length === 1 ? '' : 's'} · appearance`}</div>
              </div>
              <button className={button} onClick={() => apply(item)}>Apply</button>
              <button aria-label={`Delete ${item.name}`} title="Remove from library" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.06] hover:text-red-300" onClick={() => remove(item)}><Trash2 size={14} /></button>
            </div>)}</div>}
        </div>
      </section>
    </div>}
  </>
}
