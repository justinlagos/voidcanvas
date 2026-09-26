// Desktop app wiring for the Editor: files opened from the operating system, the macOS menu,
// saving before quit, keeping linked files current, and update notices. Does nothing in a browser.

import { useEffect } from 'react'
import { desktop } from '@/lib/desktop'
import type { Action } from './actions'
import { useEditor } from './store'

const editable = () => {
  const a = document.activeElement as HTMLElement | null
  return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))
}

export function useDesktop(actions: Record<string, Action>) {
  useEffect(() => {
    const d = desktop; if (!d) return
    const run = (id: string) => { const a = actions[id]; if (a && (!a.enabled || a.enabled())) a.run() }
    const offs: (() => void)[] = []
    let live = true

    import('./disk').then(async disk => {
      if (!live) return
      // Files the app was launched with, or asked to open before the Editor was ready.
      disk.openPaths(await d.takePending())
      offs.push(d.onOpenFiles(files => disk.openPaths(files)))
      offs.push(d.onFlush(() => disk.saveQuietly()))

      // Keep a linked file no more than a minute behind the design.
      let seen = useEditor.getState().historyIndex, docId = useEditor.getState().doc?.id
      const t = setInterval(() => {
        const s = useEditor.getState()
        if (!s.doc) return
        if (s.doc.id === docId && s.historyIndex === seen) return
        seen = s.historyIndex; docId = s.doc.id
        disk.saveLinked({ quiet: true }).catch(() => {})
      }, 60_000)
      offs.push(() => clearInterval(t))
    })

    offs.push(d.onMenu(cmd => {
      if (['undo', 'redo', 'cut', 'copy', 'selectAll'].includes(cmd) && editable()) { d.nativeEdit(cmd as any); return }
      const map: Record<string, string> = { open: 'file.open', save: 'file.save', saveDisk: 'file.saveDisk', undo: 'edit.undo', redo: 'edit.redo', cut: 'edit.cut', copy: 'edit.copy', selectAll: 'sel.all' }
      if (map[cmd]) run(map[cmd])
    }))
    offs.push(d.onUpdate(u => useEditor.getState().notify(`Voidcanvas ${u.version} is ready. It installs when you quit.`)))
    return () => { live = false; offs.forEach(f => f()) }
  }, [actions])
}
