import { create } from 'zustand'

// Interface preferences and the panel layout. Per viewer, kept in localStorage. Never part of a design.

export type PanelId =
  | 'properties' | 'layers' | 'channels' | 'paths' | 'history' | 'swatches' | 'adjustments'
  | 'character' | 'paragraph' | 'info' | 'brand' | 'navigator' | 'styles'

export interface DockGroup { id: string; tabs: PanelId[]; active: PanelId; collapsed?: boolean; size?: number }
export interface FloatingPanel { id: string; tabs: PanelId[]; active: PanelId; x: number; y: number; w: number; h: number }

export interface Workspace {
  name: string
  /** Panels docked in the right column, top to bottom. */
  groups: DockGroup[]
  /** Panels in the icon strip beside the dock. Clicking one opens it as a flyout. */
  strip: PanelId[]
  floating: FloatingPanel[]
  dockWidth: number
}

let n = 0
const gid = () => 'g' + Date.now().toString(36) + (n++)

export const WORKSPACES: Record<string, () => Workspace> = {
  Essentials: () => ({
    name: 'Essentials', dockWidth: 300, floating: [],
    strip: ['info', 'adjustments', 'character', 'paragraph', 'styles', 'brand', 'navigator'],
    groups: [
      { id: gid(), tabs: ['properties', 'history', 'swatches'], active: 'properties', size: 1.1 },
      { id: gid(), tabs: ['layers', 'channels', 'paths'], active: 'layers', size: 1 },
    ],
  }),
  Photo: () => ({
    name: 'Photo', dockWidth: 300, floating: [],
    strip: ['info', 'swatches', 'character', 'paragraph', 'styles', 'brand', 'navigator'],
    groups: [
      { id: gid(), tabs: ['adjustments', 'properties'], active: 'properties', size: 1.1 },
      { id: gid(), tabs: ['history'], active: 'history', size: 0.5 },
      { id: gid(), tabs: ['layers', 'channels', 'paths'], active: 'layers', size: 1 },
    ],
  }),
  Design: () => ({
    name: 'Design', dockWidth: 300, floating: [],
    strip: ['info', 'adjustments', 'channels', 'paths', 'history', 'navigator'],
    groups: [
      { id: gid(), tabs: ['properties', 'character', 'paragraph', 'styles'], active: 'properties', size: 1.2 },
      { id: gid(), tabs: ['layers', 'swatches', 'brand'], active: 'layers', size: 1 },
    ],
  }),
  Minimal: () => ({
    name: 'Minimal', dockWidth: 280, floating: [],
    strip: ['properties', 'history', 'swatches', 'adjustments', 'character', 'paragraph', 'styles', 'channels', 'paths', 'info', 'brand', 'navigator'],
    groups: [{ id: gid(), tabs: ['layers'], active: 'layers', size: 1 }],
  }),
}

export interface UiPrefs {
  uiScale: number // 0.9..1.5
  density: 'compact' | 'comfortable'
  touchMode: boolean
  showContextBar: boolean
  showRulers: boolean
  showGuides: boolean
  lockGuides: boolean
  snap: boolean
  snapToGuides: boolean
  pixelGrid: boolean
  historyLimit: number
  historyMemoryMB: number
  versionEveryMin: number
  showStatusBar: boolean
  /** Remembered choice so the "runs on your device" note shows once per model. */
  aiConsent: Record<string, boolean>
}

const DEFAULT_PREFS: UiPrefs = {
  uiScale: 1, density: 'comfortable', touchMode: false, showContextBar: true,
  showRulers: true, showGuides: true, lockGuides: false, snap: true, snapToGuides: true, pixelGrid: true,
  historyLimit: 100, historyMemoryMB: 1200, versionEveryMin: 10, showStatusBar: true, aiConsent: {},
}

interface UiState extends UiPrefs {
  workspace: Workspace
  saved: Record<string, Workspace>
  /** Panel shown as a flyout from the icon strip. */
  flyout: PanelId | null
  setPref: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void
  setWorkspace: (w: Workspace) => void
  applyWorkspace: (name: string) => void
  saveWorkspaceAs: (name: string) => void
  deleteWorkspace: (name: string) => void
  resetWorkspace: () => void
  /** Make a panel visible wherever it is: activate its tab, expand its group, or open its flyout. */
  showPanel: (p: PanelId) => void
  /** Move a panel: into a dock group (optionally at an index), to a new group, to the strip, or floating. */
  movePanel: (p: PanelId, to: { group: string; index?: number } | { newGroupAt: number } | { strip: true } | { float: { x: number; y: number } } | { floatGroup: string }) => void
  closePanel: (p: PanelId) => void
  updateGroup: (id: string, patch: Partial<DockGroup>) => void
  updateFloat: (id: string, patch: Partial<FloatingPanel>) => void
  setFlyout: (p: PanelId | null) => void
  /** Read stored preferences. Called once on mount so server and first client render match. */
  hydrate: () => void
  hydrated: boolean
}

const KEY = 'vc-ui-v1'
function load(): Partial<UiState> {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : {} } catch { return {} }
}
function persist(s: UiState) {
  try {
    const { workspace, saved } = s
    const prefs: any = {}
    for (const k of Object.keys(DEFAULT_PREFS)) prefs[k] = (s as any)[k]
    localStorage.setItem(KEY, JSON.stringify({ ...prefs, workspace, saved }))
  } catch { /* storage blocked: preferences last for this visit only */ }
}

const ALL_PANELS: PanelId[] = ['properties', 'layers', 'channels', 'paths', 'history', 'swatches', 'adjustments', 'character', 'paragraph', 'info', 'brand', 'navigator', 'styles']

/** Remove a panel from wherever it currently lives. Empty groups and floating windows are dropped. */
function without(w: Workspace, p: PanelId): Workspace {
  const groups = w.groups.map(g => ({ ...g, tabs: g.tabs.filter(t => t !== p) })).filter(g => g.tabs.length)
    .map(g => ({ ...g, active: g.tabs.includes(g.active) ? g.active : g.tabs[0] }))
  const floating = w.floating.map(f => ({ ...f, tabs: f.tabs.filter(t => t !== p) })).filter(f => f.tabs.length)
    .map(f => ({ ...f, active: f.tabs.includes(f.active) ? f.active : f.tabs[0] }))
  return { ...w, groups, floating, strip: w.strip.filter(t => t !== p) }
}

/** Any panel missing from a stored layout (added in a later version) goes to the strip. */
function complete(w: Workspace): Workspace {
  const seen = new Set<PanelId>([...w.strip, ...w.groups.flatMap(g => g.tabs), ...w.floating.flatMap(f => f.tabs)])
  const missing = ALL_PANELS.filter(p => !seen.has(p))
  return missing.length ? { ...w, strip: [...w.strip, ...missing] } : w
}

export const useUi = create<UiState>((set, get) => {
  const save = (patch: Partial<UiState>) => { set(patch); persist(get()) }
  return {
    ...DEFAULT_PREFS,
    workspace: WORKSPACES.Essentials(),
    saved: {},
    flyout: null,
    hydrated: false,
    hydrate: () => {
      if (get().hydrated) return
      const stored = load()
      const prefs: any = {}
      for (const k of Object.keys(DEFAULT_PREFS)) if (k in stored) prefs[k] = (stored as any)[k]
      set({ ...prefs, workspace: complete((stored.workspace as Workspace) ?? WORKSPACES.Essentials()), saved: (stored.saved as Record<string, Workspace>) ?? {}, hydrated: true })
    },

    setPref: (k, v) => save({ [k]: v } as any),
    setWorkspace: (w) => save({ workspace: complete(w) }),
    applyWorkspace: (name) => {
      const w = get().saved[name] ?? WORKSPACES[name]?.()
      if (w) save({ workspace: complete(JSON.parse(JSON.stringify(w))), flyout: null })
    },
    saveWorkspaceAs: (name) => save({ saved: { ...get().saved, [name]: { ...get().workspace, name } }, workspace: { ...get().workspace, name } }),
    deleteWorkspace: (name) => { const s = { ...get().saved }; delete s[name]; save({ saved: s }) },
    resetWorkspace: () => { const name = get().workspace.name; const fresh = get().saved[name] ?? (WORKSPACES[name] ?? WORKSPACES.Essentials)(); save({ workspace: complete(JSON.parse(JSON.stringify(fresh))), flyout: null }) },

    showPanel: (p) => {
      const w = get().workspace
      const g = w.groups.find(x => x.tabs.includes(p))
      if (g) { save({ workspace: { ...w, groups: w.groups.map(x => x.id === g.id ? { ...x, active: p, collapsed: false } : x) }, flyout: null }); return }
      const f = w.floating.find(x => x.tabs.includes(p))
      if (f) { save({ workspace: { ...w, floating: [...w.floating.filter(x => x.id !== f.id), { ...f, active: p }] } }); return }
      set({ flyout: p })
    },

    movePanel: (p, to) => {
      let w = without(get().workspace, p)
      if ('group' in to) {
        w = { ...w, groups: w.groups.map(g => { if (g.id !== to.group) return g; const tabs = [...g.tabs]; tabs.splice(to.index ?? tabs.length, 0, p); return { ...g, tabs, active: p, collapsed: false } }) }
        if (!w.groups.some(g => g.id === to.group)) w = { ...w, groups: [...w.groups, { id: gid(), tabs: [p], active: p, size: 1 }] }
      } else if ('newGroupAt' in to) {
        const groups = [...w.groups]; groups.splice(Math.max(0, Math.min(groups.length, to.newGroupAt)), 0, { id: gid(), tabs: [p], active: p, size: 1 })
        w = { ...w, groups }
      } else if ('strip' in to) {
        w = { ...w, strip: [...w.strip, p] }
      } else if ('float' in to) {
        w = { ...w, floating: [...w.floating, { id: gid(), tabs: [p], active: p, x: to.float.x, y: to.float.y, w: 290, h: 360 }] }
      } else if ('floatGroup' in to) {
        w = { ...w, floating: w.floating.map(f => f.id === to.floatGroup ? { ...f, tabs: [...f.tabs, p], active: p } : f) }
      }
      save({ workspace: w, flyout: get().flyout === p ? null : get().flyout })
    },

    closePanel: (p) => save({ workspace: { ...without(get().workspace, p), strip: [...without(get().workspace, p).strip, p] }, flyout: null }),
    updateGroup: (id, patch) => save({ workspace: { ...get().workspace, groups: get().workspace.groups.map(g => g.id === id ? { ...g, ...patch } : g) } }),
    updateFloat: (id, patch) => save({ workspace: { ...get().workspace, floating: get().workspace.floating.map(f => f.id === id ? { ...f, ...patch } : f) } }),
    setFlyout: (p) => set({ flyout: p }),
  }
})
