'use client'

import React, { useEffect, useState } from 'react'

import { Download, Search, Maximize, Scaling, Palette, LayoutGrid, Lock, X, Minus, Plus, Redo2, Undo2, FolderOpen, Frame, Crosshair, MoreHorizontal, PanelsTopLeft } from 'lucide-react'
import { AppNav, Logo } from '@/components/AppNav'
import { saveProject } from '../io'
import { useEditor } from '../store'
import { stageApi } from './Stage'
import { Button, IconButton, focusRing } from './ui'
import { PrivateBadge } from './PrivacyPanel'

function OverflowMenu({ s, hasFrames }: { s: ReturnType<typeof useEditor.getState>; hasFrames: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (!open) return; const h = () => setOpen(false); window.addEventListener('pointerdown', h); return () => window.removeEventListener('pointerdown', h) }, [open])
  const item = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button onClick={() => { setOpen(false); onClick() }} className={`w-full flex items-center gap-2.5 px-3 h-9 text-left text-[13px] text-void-200 hover:bg-surface-sunken ${focusRing}`}>{icon}{label}</button>
  )
  return (
    <div className="relative" onPointerDown={e => e.stopPropagation()}>
      <IconButton label="More" onClick={() => setOpen(o => !o)} active={open}><MoreHorizontal size={18} /></IconButton>
      {open && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-surface-overlay border border-white/[0.08] shadow-2xl py-1.5 z-20">
          {item(<Scaling size={15} />, 'Resize for other formats', () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'resize' })))}
          {item(<LayoutGrid size={15} />, 'Boards', () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))}
          {item(<Palette size={15} />, 'Brand kit', () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'brand' })))}
          <div className="my-1 h-px bg-white/[0.06]" />
          {item(<FolderOpen size={15} />, 'All designs', async () => { await saveProject(); s.closeDoc() })}
        </div>
      )}
    </div>
  )
}

export function TopBar({ onExport, onAdd, onSearch }: { onExport: () => void; onAdd: () => void; onSearch: () => void }) {
  const doc = useEditor(s => s.doc)
  const zoom = useEditor(s => s.view.zoom)
  const canUndo = useEditor(s => s.historyIndex > 0)
  const canRedo = useEditor(s => s.historyIndex < s.history.length - 1)
  const dirty = useEditor(s => s.dirty)
  const s = useEditor.getState()
  const hasFrames = useEditor(st => !!st.doc?.frames?.length)

  return (
    <header className="h-12 shrink-0 flex items-center gap-1 sm:gap-3 px-2 sm:px-3 border-b border-white/[0.06] bg-surface-raised">
      <Logo compact={!!doc} />
      <AppNav />
      <PrivateBadge />
      {doc && (
        <>
          {/* LEFT: name + save status */}
          <input aria-label="Design name" value={doc.name} onChange={e => s.setDoc({ name: e.target.value })} onBlur={() => useEditor.setState({ dirty: true })}
            className={`hidden md:block h-8 w-40 px-2 rounded-md bg-transparent hover:bg-void-900 focus:bg-void-900 text-[13px] text-void-100 truncate ${focusRing}`} />
          <span className="hidden lg:flex items-center gap-1.5 text-[11.5px] text-void-500" aria-live="polite"><span className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-amber-400' : 'bg-emerald-500'}`} />{dirty ? 'Saving' : 'Saved'}</span>

          {/* CENTER: view + edit state, centred */}
          <div className="flex items-center gap-0.5 mx-auto">
            <IconButton label="Undo" shortcut="Ctrl+Z" disabled={!canUndo} onClick={s.undo}><Undo2 size={17} /></IconButton>
            <IconButton label="Redo" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={s.redo}><Redo2 size={17} /></IconButton>
            <span className="hidden sm:block w-px h-5 bg-white/[0.08] mx-1" />
            <IconButton label="Zoom out" shortcut="Ctrl+-" onClick={() => stageApi.zoomBy(1 / 1.25)} className="hidden sm:inline-flex"><Minus size={16} /></IconButton>
            <button onClick={() => stageApi.zoomTo(1)} title="Zoom to 100%" className={`hidden sm:block w-14 h-8 rounded-md text-[12px] tabular-nums text-void-200 hover:bg-void-800 ${focusRing}`}>{Math.round(zoom * 100)}%</button>
            <IconButton label="Zoom in" shortcut="Ctrl++" onClick={() => stageApi.zoomBy(1.25)} className="hidden sm:inline-flex"><Plus size={16} /></IconButton>
            <IconButton label="Fit to screen" shortcut="Ctrl+0" onClick={() => stageApi.fit()} className="hidden sm:inline-flex"><Maximize size={15} /></IconButton>
            <IconButton label="Fit selection" shortcut="Shift+2" onClick={() => stageApi.fitSelection()} className="hidden md:inline-flex"><Crosshair size={15} /></IconButton>
            {hasFrames && <IconButton label="Fit board" shortcut="Shift+1" onClick={() => stageApi.fitFrame()} className="hidden md:inline-flex"><Frame size={15} /></IconButton>}
          </div>

          {/* RIGHT: search, overflow menu, privacy, close, Add, Export */}
          <button onClick={onSearch} title="Search every action (Ctrl+K)" className={`hidden lg:flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12.5px] text-void-400 hover:text-white ${focusRing}`}><Search size={13} />Search<kbd className="ml-1 text-[10.5px] px-1.5 py-0.5 rounded bg-void-800 text-void-300">⌘K</kbd></button>
          <OverflowMenu s={s} hasFrames={hasFrames} />
          <IconButton label="Your privacy" onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'privacy' }))}><Lock size={16} /></IconButton>
          <IconButton label="Close to home" onClick={async () => { await saveProject(); s.closeDoc(); window.location.href = '/' }}><X size={17} /></IconButton>
          <Button onClick={onAdd} className="!bg-accent !text-white hover:!bg-[#9a8dff] !px-2.5 sm:!px-3.5"><Plus size={15} /><span className="hidden sm:inline">Add</span><span className="sr-only sm:hidden">Add</span></Button>
          <Button primary onClick={onExport} className="!px-2.5 sm:!px-3.5"><Download size={15} /><span className="hidden sm:inline">Export</span><span className="sr-only sm:hidden">Export</span></Button>
        </>
      )}
    </header>
  )
}
