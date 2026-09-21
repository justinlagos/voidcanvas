import { create } from 'zustand'
import { saveProject, openProject } from './io'
import { useEditor } from './store'

// Lightweight multi-file tabs. Each tab is a saved project id; switching saves the current one
// and opens the target. The heavy document state stays in the single editor store, so nothing
// about rendering or history changes. This keeps tabs additive and safe.

export interface Tab { id: string; name: string }

interface TabsState {
  tabs: Tab[]
  activeId: string | null
  sync: () => void
  switchTo: (id: string) => Promise<void>
  close: (id: string) => Promise<void>
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [],
  activeId: null,

  // Reflect the currently open doc as a tab (called after new/open).
  sync: () => {
    const doc = useEditor.getState().doc
    if (!doc) { set({ activeId: null }); return }
    const tabs = get().tabs
    const exists = tabs.find(t => t.id === doc.id)
    const next = exists ? tabs.map(t => t.id === doc.id ? { id: doc.id, name: doc.name } : t) : [...tabs, { id: doc.id, name: doc.name }]
    set({ tabs: next, activeId: doc.id })
  },

  switchTo: async (id) => {
    if (get().activeId === id) return
    await saveProject().catch(() => {})
    const ok = await openProject(id)
    if (ok) set({ activeId: id })
    else { set({ tabs: get().tabs.filter(t => t.id !== id) }) }
  },

  close: async (id) => {
    const { tabs, activeId } = get()
    const rest = tabs.filter(t => t.id !== id)
    if (id === activeId) {
      await saveProject().catch(() => {})
      if (rest.length) { const nextId = rest[rest.length - 1].id; const ok = await openProject(nextId); set({ tabs: rest, activeId: ok ? nextId : null }); if (!ok) useEditor.getState().closeDoc() }
      else { useEditor.getState().closeDoc(); set({ tabs: rest, activeId: null }) }
    } else set({ tabs: rest })
  },
}))
