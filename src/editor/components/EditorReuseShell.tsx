'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookmarkPlus, FileStack, Image as ImageIcon, Library, Palette, RefreshCw, Search, Sparkles, Trash2, Type, X } from 'lucide-react'
import { EditorShell } from './EditorShell'
import { useEditor } from '../store'
import {
  applyAsset,
  applyColourLook,
  applyLook,
  applyTextStyle,
  listLibrary,
  removeReusableItem,
  saveColorAsset,
  saveFontAsset,
  saveLook,
  saveRasterAsset,
  saveTemplateAsset,
  saveTextStyle,
  selectedWholeGroup,
  usageCounts,
  type AssetKind,
  type ReusableItem,
} from '../reuse'
import { replaceReusableAsset } from '../reuse-replace'

const button = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[.06] px-3 text-xs font-medium text-zinc-100 transition hover:bg-white/[.1] disabled:cursor-not-allowed disabled:opacity-35'
const quiet = 'text-[11px] leading-5 text-zinc-400'

type Filter = 'all' | 'look' | 'textStyle' | AssetKind

function itemType(item: ReusableItem): Filter | 'colourLook' {
  if (item.kind === 'asset') return item.assetKind
  return item.kind
}

function typeLabel(item: ReusableItem) {
  if (item.kind === 'textStyle') return item.scope === 'brand' ? 'Brand text style' : 'Text style'
  if (item.kind === 'colourLook') return 'Colour look · Studio reference'
  if (item.kind === 'look') return `${item.appearance.source === 'group' ? 'Group Look' : 'Look'} · ${item.appearance.effects.length} effect${item.appearance.effects.length === 1 ? '' : 's'}`
  const names: Record<AssetKind, string> = { logo: 'Logo', image: 'Image', texture: 'Texture', color: 'Colour', font: 'Font', template: 'Template' }
  return names[item.assetKind]
}

function ItemIcon({ item }: { item: ReusableItem }) {
  if (item.kind === 'asset' && item.thumb) return <img src={item.thumb} alt="" className="h-10 w-10 rounded-lg object-cover" />
  if (item.kind === 'colourLook' && item.thumb) return <img src={item.thumb} alt="" className="h-10 w-10 rounded-lg object-cover" />
  const icon = item.kind === 'textStyle' || (item.kind === 'asset' && item.assetKind === 'font') ? <Type size={16} />
    : item.kind === 'asset' && item.assetKind === 'color' ? <Palette size={16} />
    : item.kind === 'asset' && item.assetKind === 'template' ? <FileStack size={16} />
    : item.kind === 'asset' && ['logo', 'image', 'texture'].includes(item.assetKind) ? <ImageIcon size={16} />
    : <Sparkles size={16} />
  const swatch = item.kind === 'asset' && item.assetKind === 'color' && item.color
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.06] text-zinc-300" style={swatch ? { background: item.color } : undefined}>{swatch ? null : icon}</div>
}

export function EditorReuseShell() {
  const hasDoc = useEditor(s => !!s.doc)
  const activeId = useEditor(s => s.activeId)
  const selectedIds = useEditor(s => s.selectedIds)
  const brandId = useEditor(s => s.doc?.brandId ?? null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReusableItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [saving, setSaving] = useState(false)

  const active = useMemo(() => activeId ? useEditor.getState().layers.find(l => l.id === activeId) ?? null : null, [activeId])
  const wholeGroup = useMemo(() => selectedWholeGroup(), [selectedIds, activeId])
  const targetName = wholeGroup?.name ?? active?.name ?? ''
  const canSaveLook = !!wholeGroup || (!!active && active.type !== 'adjustment')
  const canSaveText = selectedIds.length === 1 && active?.type === 'text'
  const canSaveRaster = selectedIds.length === 1 && active?.type === 'raster'
  const canSaveColor = selectedIds.length === 1 && (active?.type === 'text' || active?.type === 'shape')
  const canSaveFont = selectedIds.length === 1 && active?.type === 'text'

  const refresh = useCallback(async () => {
    const next = await listLibrary()
    setItems(next)
    setCounts(await usageCounts(next))
  }, [])
  useEffect(() => { if (open) refresh() }, [open, refresh])

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

  const save = async (kind: 'look' | 'text' | 'brandText' | 'logo' | 'image' | 'texture' | 'color' | 'font' | 'template') => {
    const fallback = kind === 'text' || kind === 'brandText' ? 'Text style' : kind === 'font' ? active?.type === 'text' ? active.fontFamily : 'Font' : kind === 'template' ? `${useEditor.getState().doc?.name ?? 'Design'} template` : targetName || `New ${kind}`
    const n = name.trim() || fallback
    setSaving(true)
    try {
      const item = kind === 'look' ? await saveLook(n)
        : kind === 'text' ? await saveTextStyle(n, undefined, 'design')
        : kind === 'brandText' ? await saveTextStyle(n, undefined, 'brand')
        : kind === 'color' ? await saveColorAsset(n)
        : kind === 'font' ? await saveFontAsset(n)
        : kind === 'template' ? await saveTemplateAsset(n)
        : await saveRasterAsset(kind, n)
      if (!item) {
        useEditor.getState().notify(kind === 'text' || kind === 'brandText' || kind === 'font' ? 'Select one text layer first.' : kind === 'color' ? 'Select one text or shape layer first.' : kind === 'template' ? 'Open a design first.' : kind === 'look' ? 'Select a layer or group appearance first.' : 'Select one image layer first.')
        return
      }
      setName(''); await refresh()
      useEditor.getState().notify(`Saved “${n}” to Reuse.`)
    } finally { setSaving(false) }
  }

  const apply = async (item: ReusableItem) => {
    const ok = item.kind === 'look' ? applyLook(item) : item.kind === 'textStyle' ? applyTextStyle(item) : item.kind === 'colourLook' ? applyColourLook(item) : await applyAsset(item)
    if (!ok) {
      useEditor.getState().notify(item.kind === 'textStyle' ? 'Select one or more text layers.' : item.kind === 'asset' && item.assetKind === 'color' ? 'Select text or shape layers.' : item.kind === 'asset' && item.assetKind === 'font' ? 'Select one or more text layers.' : 'Select a compatible target first.')
      return
    }
    await refresh()
    useEditor.getState().notify(item.kind === 'asset' && item.assetKind === 'template' ? `Started a new design from “${item.name}”.` : `Applied “${item.name}”.`)
  }

  const replace = async (item: ReusableItem) => {
    if (item.kind !== 'asset') return
    const result = await replaceReusableAsset(item)
    if (!result.updated) { useEditor.getState().notify(result.reason ?? 'Select a compatible source first.'); return }
    await refresh()
    useEditor.getState().notify(result.usages.length
      ? `Updated “${item.name}” for future use. ${result.usages.length} existing design${result.usages.length === 1 ? ' keeps' : 's keep'} the current placed version until you reapply it.`
      : `Updated the reusable source for “${item.name}”.`)
  }

  const remove = async (item: ReusableItem) => {
    let result = await removeReusableItem(item)
    if (!result.removed && result.usages.length) {
      const names = result.usages.slice(0, 3).map(u => u.projectName).join(', ')
      const more = result.usages.length > 3 ? ` and ${result.usages.length - 3} more` : ''
      if (!window.confirm(`“${item.name}” is used in ${result.usages.length} design${result.usages.length === 1 ? '' : 's'}: ${names}${more}.\n\nDelete it from the library anyway? Existing designs keep their current artwork, but the reusable source will be gone.`)) return
      result = await removeReusableItem(item, true)
    }
    if (result.removed) { await refresh(); useEditor.getState().notify(`Removed “${item.name}” from your library.`) }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(item => {
      const t = itemType(item)
      const filterOk = filter === 'all' || t === filter || (filter === 'look' && t === 'colourLook')
      return filterOk && (!q || item.name.toLowerCase().includes(q) || typeLabel(item).toLowerCase().includes(q))
    })
  }, [items, query, filter])

  return <>
    <EditorShell />

    {hasDoc && <button type="button" data-reuse-library onClick={() => setOpen(true)} title="Reusable assets · Alt+Shift+L" className="fixed bottom-[70px] right-3 z-[115] inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-zinc-950/90 px-3 text-xs font-semibold text-white shadow-xl backdrop-blur md:bottom-3"><Library size={14} />Reuse</button>}

    {open && <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/35 md:items-center" onMouseDown={e => { if (e.currentTarget === e.target) setOpen(false) }}>
      <section aria-label="Reusable library" className="max-h-[88dvh] w-full overflow-hidden rounded-t-2xl border border-white/10 bg-[#111214] shadow-2xl md:w-[600px] md:rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><div className="text-sm font-semibold text-white">Reuse Library</div><div className={quiet}>Looks, type, assets and templates you can carry across designs.</div></div>
          <button aria-label="Close reuse library" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[.06] hover:text-white" onClick={() => setOpen(false)}><X size={16} /></button>
        </header>

        <div className="max-h-[calc(88dvh-70px)] overflow-y-auto p-4">
          <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-200"><BookmarkPlus size={14} />Save for reuse</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={targetName ? `Name from ${targetName}` : 'Name this reusable item'} className="mb-2 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
            <div className="flex flex-wrap gap-2">
              <button className={button} disabled={saving || !canSaveLook} onClick={() => save('look')}><Sparkles size={14} />Look</button>
              <button className={button} disabled={saving || !canSaveText} onClick={() => save('text')}><Type size={14} />Text style</button>
              {brandId && <button className={button} disabled={saving || !canSaveText} onClick={() => save('brandText')}><Type size={14} />Brand text style</button>}
              <button className={button} disabled={saving || !canSaveRaster} onClick={() => save('logo')}><ImageIcon size={14} />Logo</button>
              <button className={button} disabled={saving || !canSaveRaster} onClick={() => save('image')}><ImageIcon size={14} />Image</button>
              <button className={button} disabled={saving || !canSaveRaster} onClick={() => save('texture')}><ImageIcon size={14} />Texture</button>
              <button className={button} disabled={saving || !canSaveColor} onClick={() => save('color')}><Palette size={14} />Colour</button>
              <button className={button} disabled={saving || !canSaveFont} onClick={() => save('font')}><Type size={14} />Font</button>
              <button className={button} disabled={saving || !hasDoc} onClick={() => save('template')}><FileStack size={14} />Template</button>
            </div>
            <p className={`${quiet} mt-2`}>Saved items stay local. Reuse records which designs use them so deletion can warn before a shared source disappears.</p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-zinc-500" /><input aria-label="Search reuse library" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search library" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></label>
            <select aria-label="Filter reuse library" value={filter} onChange={e => setFilter(e.target.value as Filter)} className="h-9 rounded-lg border border-white/10 bg-[#18191c] px-3 text-xs text-zinc-200 outline-none">
              <option value="all">Everything</option><option value="look">Looks</option><option value="textStyle">Text styles</option><option value="logo">Logos</option><option value="image">Images</option><option value="texture">Textures</option><option value="color">Colours</option><option value="font">Fonts</option><option value="template">Templates</option>
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between"><div className="text-xs font-semibold text-zinc-200">Your library</div><div className={quiet}>{visible.length} item{visible.length === 1 ? '' : 's'}</div></div>

          {!visible.length ? <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-500">{items.length ? 'Nothing matches this search or filter.' : 'Nothing saved yet. Save something once, then reuse it instead of rebuilding it.'}</div> :
            <div className="mt-2 space-y-2">{visible.map(item => <div key={`${item.kind}:${item.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3">
              <ItemIcon item={item} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-zinc-100">{item.name}</div><div className={quiet}>{typeLabel(item)}{counts[item.id] ? ` · used in ${counts[item.id]} design${counts[item.id] === 1 ? '' : 's'}` : ''}</div></div>
              <button className={button} onClick={() => apply(item)}>Apply</button>
              {item.kind === 'asset' && <button aria-label={`Replace ${item.name} source`} title="Replace reusable source from the current selection" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.06] hover:text-zinc-200" onClick={() => replace(item)}><RefreshCw size={14} /></button>}
              <button aria-label={`Delete ${item.name}`} title="Remove from library" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.06] hover:text-red-300" onClick={() => remove(item)}><Trash2 size={14} /></button>
            </div>)}</div>}
        </div>
      </section>
    </div>}
  </>
}
