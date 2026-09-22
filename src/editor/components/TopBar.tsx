'use client'

import { Download, Search, Maximize, Scaling, Palette, LayoutGrid, Lock, X, Minus, Plus, Redo2, Undo2, FolderOpen, Frame, Crosshair } from 'lucide-react'
import { AppNav, Logo } from '@/components/AppNav'
import { saveProject } from '../io'
import { useEditor } from '../store'
import { stageApi } from './Stage'
import { Button, IconButton, focusRing } from './ui'
import { PrivateBadge } from './PrivacyPanel'

export function TopBar({ onExport, onAdd, onSearch }: { onExport: () => void; onAdd: () => void; onSearch: () => void }) {
  const doc = useEditor(s => s.doc)
  const zoom = useEditor(s => s.view.zoom)
  const canUndo = useEditor(s => s.historyIndex > 0)
  const canRedo = useEditor(s => s.historyIndex < s.history.length - 1)
  const dirty = useEditor(s => s.dirty)
  const s = useEditor.getState()
  const hasFrames = useEditor(st => !!st.doc?.frames?.length)

  return (
    <header className="h-12 shrink-0 flex items-center gap-1 sm:gap-3 px-2 sm:px-3 border-b border-void-800/60 bg-void-950">
      <Logo compact={!!doc} />
      <AppNav />
      <PrivateBadge />
      {doc && (
        <>
          <input aria-label="Design name" value={doc.name} onChange={e => s.setDoc({ name: e.target.value })} onBlur={() => useEditor.setState({ dirty: true })}
            className={`hidden md:block h-8 w-44 px-2 rounded-md bg-transparent hover:bg-void-900 focus:bg-void-900 text-[13px] text-void-100 truncate ${focusRing}`} />
          <span className="hidden lg:block text-[11.5px] text-void-500 w-16" aria-live="polite">{dirty ? 'Saving…' : 'Saved'}</span>
          <div className="flex items-center ml-auto md:ml-0">
            <IconButton label="Undo" shortcut="Ctrl+Z" disabled={!canUndo} onClick={s.undo}><Undo2 size={17} /></IconButton>
            <IconButton label="Redo" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={s.redo}><Redo2 size={17} /></IconButton>
          </div>
          <div className="hidden sm:flex items-center ml-auto">
            <IconButton label="Zoom out" shortcut="Ctrl+-" onClick={() => stageApi.zoomBy(1 / 1.25)}><Minus size={16} /></IconButton>
            <button onClick={() => stageApi.zoomTo(1)} title="Zoom to 100%" className={`w-14 h-8 rounded-md text-[12px] tabular-nums text-void-200 hover:bg-void-800 ${focusRing}`}>{Math.round(zoom * 100)}%</button>
            <IconButton label="Zoom in" shortcut="Ctrl++" onClick={() => stageApi.zoomBy(1.25)}><Plus size={16} /></IconButton>
            <IconButton label="Fit to screen" shortcut="Ctrl+0" onClick={() => stageApi.fit()}><Maximize size={15} /></IconButton>
            <IconButton label="Fit selection" shortcut="Shift+2" onClick={() => stageApi.fitSelection()}><Crosshair size={15} /></IconButton>
            {hasFrames && <IconButton label="Fit board" shortcut="Shift+1" onClick={() => stageApi.fitFrame()}><Frame size={15} /></IconButton>}
          </div>
          <button onClick={onSearch} title="Search every action (Ctrl+K)" className={`hidden lg:flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-400 hover:text-white ${focusRing}`}><Search size={13} />Search actions<kbd className="ml-2 text-[10.5px] px-1.5 py-0.5 rounded bg-void-800 text-void-300">Ctrl K</kbd></button>
          <IconButton label="Resize for other formats" onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'resize' }))} className="hidden sm:inline-flex"><Scaling size={16} /></IconButton>
          <IconButton label="Brand kit" onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'brand' }))} className="hidden sm:inline-flex"><Palette size={16} /></IconButton>
          <IconButton label="Boards: add and manage them" onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' }))} className="hidden sm:inline-flex"><LayoutGrid size={16} /></IconButton>
          <IconButton label="All designs" onClick={async () => { await saveProject(); s.closeDoc() }} className="hidden sm:inline-flex"><FolderOpen size={16} /></IconButton>
          <IconButton label="Your privacy" onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'privacy' }))}><Lock size={16} /></IconButton>
          <IconButton label="Close to home" onClick={async () => { await saveProject(); s.closeDoc(); window.location.href = '/' }}><X size={17} /></IconButton>
          <Button onClick={onAdd} className="!bg-accent !text-white hover:!bg-[#9a8dff] !px-2.5 sm:!px-3.5"><Plus size={15} /><span className="hidden sm:inline">Add</span><span className="sr-only sm:hidden">Add</span></Button>
          <Button primary onClick={onExport} className="!px-2.5 sm:!px-3.5"><Download size={15} /><span className="hidden sm:inline">Export</span><span className="sr-only sm:hidden">Export</span></Button>
        </>
      )}
    </header>
  )
}
