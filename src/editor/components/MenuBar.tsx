'use client'

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Download, Menu as MenuIcon, Plus, Redo2, Search, Undo2 } from 'lucide-react'
import { MENUS, buildActions, prettyKey, resolveAction, type Action, type MenuItem } from '../actions'
import { useEditor } from '../store'
import { Button, IconButton, focusRing } from './ui'
import { PrivateBadge, usePrivate } from './PrivacyPanel'

// Photopea-style menu bar. Menus open on click, then follow the pointer across the bar, like desktop apps.
// Arrow keys move through items, Right opens a submenu, Escape closes.

type Resolved = { kind: 'action'; a: Action } | { kind: 'sep' } | { kind: 'sub'; label: string; items: MenuItem[] }

function resolve(actions: Record<string, Action>, items: MenuItem[] | (() => MenuItem[])): Resolved[] {
  const list = typeof items === 'function' ? items() : items
  const out: Resolved[] = []
  for (const it of list) {
    if (it === '-') { if (out.length && out[out.length - 1].kind !== 'sep') out.push({ kind: 'sep' }); continue }
    if (typeof it === 'string') { const a = resolveAction(actions, it); if (a) out.push({ kind: 'action', a }); continue }
    const sub = typeof it.items === 'function' ? it.items() : it.items
    out.push({ kind: 'sub', label: it.label, items: sub })
  }
  while (out.length && out[out.length - 1].kind === 'sep') out.pop()
  return out
}

/** A submenu opens to the right of its item, like desktop apps. It is placed with fixed coordinates so the parent
 *  list's scrolling never clips it, and flips to the left only when there is no room on the right. */
function SubMenu({ anchor, children, onKeyDown }: { anchor: HTMLElement | null; children: React.ReactNode; onKeyDown: (e: React.KeyboardEvent) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current; if (!anchor || !el) return
    // The editor chrome can be zoomed (Interface size). Fixed coordinates inside it are in zoomed units.
    const z = parseFloat(getComputedStyle(anchor).getPropertyValue('--vc-ui-scale')) || 1
    const a = anchor.getBoundingClientRect(), w = el.offsetWidth * z, h = el.offsetHeight * z
    let left = a.right + 2
    if (left + w > innerWidth - 8) left = Math.max(8, a.left - w - 2)
    let top = a.top - 6
    if (top + h > innerHeight - 8) top = Math.max(8, innerHeight - 8 - h)
    setPos({ left: left / z, top: top / z })
  }, [anchor])
  return (
    <div ref={box} className="fixed z-50" style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }} onKeyDown={onKeyDown}>
      {children}
    </div>
  )
}

function MenuList({ items, actions, onDone, level = 0, autoFocus }: { items: MenuItem[] | (() => MenuItem[]); actions: Record<string, Action>; onDone: () => void; level?: number; autoFocus?: boolean }) {
  const rows = useMemo(() => resolve(actions, items), [actions, items])
  const [sub, setSub] = useState<number | null>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const hover = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { if (autoFocus) refs.current.find(Boolean)?.focus() }, [autoFocus])
  const focusable = rows.map((r, i) => (r.kind === 'sep' ? -1 : i)).filter(i => i >= 0)
  const move = (from: number, dir: 1 | -1) => {
    const at = focusable.indexOf(from)
    const next = focusable[(at + dir + focusable.length) % focusable.length]
    refs.current[next]?.focus()
  }
  return (
    <div role="menu" className="min-w-[250px] max-h-[80vh] overflow-y-auto py-1.5 rounded-xl bg-[#1d1d23] border border-white/[0.09] shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
      {rows.map((r, i) => {
        if (r.kind === 'sep') return <div key={'s' + i} className="my-1 mx-2 h-px bg-white/[0.07]" role="separator" />
        if (r.kind === 'sub') {
          return (
            <div key={r.label} className="relative" onPointerEnter={() => { if (hover.current) clearTimeout(hover.current); hover.current = setTimeout(() => setSub(i), 90) }} onPointerLeave={() => { if (hover.current) clearTimeout(hover.current) }}>
              <button ref={el => { refs.current[i] = el }} role="menuitem" aria-haspopup="menu" aria-expanded={sub === i}
                onClick={() => setSub(i)}
                onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); setSub(i) } else if (e.key === 'ArrowDown') { e.preventDefault(); move(i, 1) } else if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -1) } }}
                className={`w-full flex items-center gap-2 pl-8 pr-3 h-8 text-left text-[13px] outline-none ${sub === i ? 'bg-accent text-white' : 'text-void-100 hover:bg-white/[0.06] focus:bg-white/[0.06]'}`}>
                <span className="flex-1">{r.label}</span><ChevronRight size={14} className="opacity-60" />
              </button>
              {sub === i && (
                <SubMenu anchor={refs.current[i]} onKeyDown={e => { if (e.key === 'ArrowLeft') { e.stopPropagation(); setSub(null); refs.current[i]?.focus() } }}>
                  <MenuList items={r.items} actions={actions} onDone={onDone} level={level + 1} autoFocus />
                </SubMenu>
              )}
            </div>
          )
        }
        const a = r.a
        const enabled = a.enabled ? a.enabled() : true
        const checked = a.checked ? a.checked() : undefined
        const key = a.hotkey ?? a.shortcut
        return (
          <button key={a.id} ref={el => { refs.current[i] = el }} role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={checked} aria-disabled={!enabled}
            onPointerEnter={() => setSub(null)}
            onClick={() => { if (!enabled) return; onDone(); setTimeout(() => a.run(), 0) }}
            onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); move(i, 1) } else if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -1) } }}
            className={`w-full flex items-center gap-2 pl-8 pr-3 h-8 text-left text-[13px] relative outline-none ${enabled ? 'text-void-100 hover:bg-accent hover:text-white focus:bg-accent focus:text-white' : 'text-void-600 cursor-default'}`}>
            {checked && <Check size={14} className="absolute left-2.5" />}
            <span className="flex-1 truncate">{a.label}</span>
            {key && <span className="ml-6 text-[11.5px] tabular-nums opacity-60">{prettyKey(key)}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function MenuBar({ onExport, onAdd, onSearch }: { onExport: () => void; onAdd: () => void; onSearch: () => void }) {
  const doc = useEditor(s => s.doc)
  const dirty = useEditor(s => s.dirty)
  const priv = usePrivate()
  const canUndo = useEditor(s => s.historyIndex > 0)
  const canRedo = useEditor(s => s.historyIndex < s.history.length - 1)
  // Rebuilt on every open so enabled and checked states are current.
  const [open, setOpen] = useState<number | null>(null)
  const [mobile, setMobile] = useState(false)
  const actions = useMemo(() => buildActions(), [open, mobile]) // eslint-disable-line react-hooks/exhaustive-deps
  const bar = useRef<HTMLDivElement>(null)
  const s = useEditor.getState()

  useEffect(() => {
    if (open === null && !mobile) return
    const down = (e: PointerEvent) => { if (bar.current && !bar.current.contains(e.target as Node)) { setOpen(null); setMobile(false) } }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setMobile(false) } }
    window.addEventListener('pointerdown', down); window.addEventListener('keydown', key)
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key) }
  }, [open, mobile])

  // Alt alone focuses the menu bar, like Windows apps.
  useEffect(() => {
    let alone = false
    const kd = (e: KeyboardEvent) => { alone = e.key === 'Alt' }
    const ku = (e: KeyboardEvent) => { if (e.key === 'Alt' && alone && !(e.target as HTMLElement)?.closest?.('input,textarea')) { e.preventDefault(); setOpen(o => (o === null ? 1 : null)) } alone = false }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  const top = [{ label: 'Voidcanvas', items: [] as MenuItem[] }, ...MENUS]
  return (
    <header ref={bar} className="vc-chrome h-10 shrink-0 flex items-center gap-1 pl-2 pr-2 sm:pr-3 border-b border-white/[0.06] bg-surface-raised relative z-40">
      <div className="relative">
        <button aria-label="Voidcanvas menu" aria-haspopup="menu" aria-expanded={open === 0} onClick={() => setOpen(open === 0 ? null : 0)} onPointerEnter={() => open !== null && setOpen(0)}
          className={`flex items-center gap-2 h-8 pl-1 pr-2 rounded-md ${open === 0 ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'} ${focusRing}`}>
          <span className="w-6 h-6 bg-white rounded-md flex items-center justify-center"><span className="text-void-950 font-bold text-[12px] tracking-tight">V</span></span>
        </button>
        {open === 0 && (
          <div className="absolute left-0 top-full mt-1 min-w-[240px] py-1.5 rounded-xl bg-[#1d1d23] border border-white/[0.09] shadow-2xl" role="menu">
            {[['/', 'Home and all designs'], ['/studio', 'Studio: briefs and brand'], ['/effects', 'Effects: one-click looks'], ['/tools/halftone', 'Quick tools'], ['/learn', 'Learn']].map(([href, label]) => (
              <Link key={href} href={href} role="menuitem" onClick={() => setOpen(null)} className="flex items-center h-8 pl-8 pr-3 text-[13px] text-void-100 hover:bg-accent hover:text-white">{label}</Link>
            ))}
            <div className="my-1 mx-2 h-px bg-white/[0.07]" />
            <button role="menuitem" onClick={() => { setOpen(null); actions['edit.prefs'].run() }} className="w-full text-left flex items-center h-8 pl-8 pr-3 text-[13px] text-void-100 hover:bg-accent hover:text-white">Preferences…</button>
            <button role="menuitem" onClick={() => { setOpen(null); actions['help.privacy'].run() }} className="w-full text-left flex items-center h-8 pl-8 pr-3 text-[13px] text-void-100 hover:bg-accent hover:text-white">Your privacy</button>
          </div>
        )}
      </div>

      {/* Desktop menus */}
      <nav aria-label="Menu" className="hidden lg:flex items-center" role="menubar">
        {MENUS.map((m, i) => (
          <div key={m.label} className="relative">
            <button role="menuitem" aria-haspopup="menu" aria-expanded={open === i + 1} disabled={!doc && !['File', 'Window', 'Help'].includes(m.label)}
              onClick={() => setOpen(open === i + 1 ? null : i + 1)} onPointerEnter={() => open !== null && setOpen(i + 1)}
              onKeyDown={e => { if (e.key === 'ArrowRight') setOpen(((open ?? i + 1) % MENUS.length) + 1); if (e.key === 'ArrowLeft') setOpen(((open ?? i + 1) - 2 + MENUS.length) % MENUS.length + 1); if (e.key === 'ArrowDown') setOpen(i + 1) }}
              className={`h-8 px-2.5 rounded-md text-[13px] disabled:opacity-35 ${open === i + 1 ? 'bg-white/[0.09] text-white' : 'text-void-200 hover:bg-white/[0.05] hover:text-white'} ${focusRing}`}>
              {m.label}
            </button>
            {open === i + 1 && <div className="absolute left-0 top-full mt-1"><MenuList items={m.items} actions={actions} onDone={() => setOpen(null)} autoFocus /></div>}
          </div>
        ))}
      </nav>

      {/* Phone and tablet (below lg): one menu button holding every menu. The full menubar plus Search, Add and Export does not fit in 768 px. */}
      <div className="lg:hidden relative">
        <IconButton label="Menu" onClick={() => setMobile(v => !v)} active={mobile}><MenuIcon size={18} /></IconButton>
        {mobile && <div className="absolute left-0 top-full mt-1"><MenuList items={MENUS.map(m => ({ label: m.label, items: m.items }))} actions={actions} onDone={() => setMobile(false)} /></div>}
      </div>

      <PrivateBadge />
      {doc && (
        <div className="hidden lg:flex items-center gap-2 mx-auto min-w-0">
          <input aria-label="Design name" value={doc.name} onChange={e => s.setDoc({ name: e.target.value })} onBlur={() => useEditor.setState({ dirty: true })}
            className={`h-7 w-48 px-2 rounded-md bg-transparent hover:bg-void-900 focus:bg-void-900 text-[12.5px] text-center text-void-200 truncate ${focusRing}`} />
          <span className="flex items-center gap-1.5 text-[11.5px] text-void-500 shrink-0" aria-live="polite"><span className={`w-1.5 h-1.5 rounded-full ${priv ? 'bg-accent' : dirty ? 'bg-amber-400' : 'bg-emerald-500'}`} />{priv ? 'Private session, not saved' : dirty ? 'Saving' : 'Saved on this device'}</span>
        </div>
      )}
      {!doc && <span className="flex-1" />}
      {doc && (
        <div className="ml-auto lg:ml-0 flex items-center gap-1">
          <IconButton label="Undo" shortcut={prettyKey('Ctrl+Z')} disabled={!canUndo} onClick={s.undo} tipSide="bottom"><Undo2 size={16} /></IconButton>
          <IconButton label="Redo" shortcut={prettyKey('Ctrl+Shift+Z')} disabled={!canRedo} onClick={s.redo} tipSide="bottom"><Redo2 size={16} /></IconButton>
          <button onClick={onSearch} title="Search every action" className={`hidden xl:flex items-center gap-2 h-8 ml-1 pl-2.5 pr-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12.5px] text-void-400 hover:text-white ${focusRing}`}><Search size={13} />Search<kbd className="ml-1 text-[10.5px] px-1.5 py-0.5 rounded bg-void-800 text-void-300">{prettyKey('Ctrl+K')}</kbd></button>
          <IconButton label="Search every action" shortcut={prettyKey('Ctrl+K')} onClick={onSearch} className="xl:hidden" tipSide="bottom"><Search size={16} /></IconButton>
          <Button onClick={onAdd} className="!h-8 !bg-accent !text-white hover:!bg-[#9a8dff] !px-2.5 lg:!px-3 ml-1"><Plus size={15} /><span className="hidden lg:inline">Add</span><span className="sr-only lg:hidden">Add</span></Button>
          <Button primary onClick={onExport} className="!h-8 !px-2.5 lg:!px-3"><Download size={15} /><span className="hidden lg:inline">Export</span><span className="sr-only lg:hidden">Export</span></Button>
        </div>
      )}
      <Fragment />
    </header>
  )
}
