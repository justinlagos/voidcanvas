import { create } from 'zustand'
import { initialTokens, resolve, type BrandTokens, type TokKey } from './tokens'
import { DEFAULT_PAGES, PAGE_DEFS, type PageSpec } from '../brand-pages'
import { idb, isPrivate } from '@/editor/io'
import { analyseLogo, type LogoInfo } from './logo'

// The work in progress (tokens, locks, page order, logo file) is kept in the 'brand' IndexedDB store under
// one record, so a reload, a navigation or a closed tab never loses it. In a private session idb keeps it in
// memory only, and the builder warns before the page unloads.

const DRAFT_ID = 'guideline-draft'
interface Draft { id: string; tokens: BrandTokens; pages: PageSpec[]; logo: { blob: Blob; name: string } | null; orientation?: 'landscape' | 'portrait'; updatedAt: number }

interface BrandState {
  tokens: BrandTokens
  /** The uploaded logo, analysed. The original file is kept so it can be restored after a reload. */
  logo: LogoInfo | null
  logoFile: File | null
  setLogo: (info: LogoInfo | null, file: File | null) => void
  /** 'loading' until the saved draft has been read, then 'fresh' (nothing saved) or 'restored'. */
  hydration: 'loading' | 'fresh' | 'restored'
  hydrate: () => Promise<void>
  /** Back to defaults and forget the saved draft. */
  startOver: () => Promise<void>
  /** True once anything differs from the defaults. */
  dirty: () => boolean
  set: <K extends 'name' | 'tagline' | 'brandColor' | 'personality'>(k: K, v: BrandTokens[K]) => void
  /** Setting a token by hand locks it. */
  setTok: <K extends TokKey>(k: K, v: BrandTokens[K]['value']) => void
  /** Lock at the value currently showing, or free it to regenerate. */
  toggleLock: (k: TokKey) => void
  newTake: () => void
  unlockAll: () => void
  // Outliner. Page order, visibility and layout are the designer's, so New take never touches them.
  pages: PageSpec[]
  movePage: (from: number, to: number) => void
  togglePage: (i: number) => void
  setVariant: (i: number, v: number) => void
  cycleVariant: (i: number, dir?: 1 | -1) => void
  resetPages: () => void
}

export const useBrand = create<BrandState>((set, get) => ({
  tokens: initialTokens(),
  logo: null,
  logoFile: null,
  setLogo: (logo, logoFile) => set({ logo, logoFile }),
  hydration: 'loading',
  hydrate: async () => {
    if (get().hydration !== 'loading') return
    try {
      const d = await idb.get<Draft>('brand', DRAFT_ID)
      if (d && d.tokens && d.pages) {
        let logo: LogoInfo | null = null, logoFile: File | null = null
        if (d.logo?.blob) {
          try { logoFile = new File([d.logo.blob], d.logo.name || 'logo', { type: d.logo.blob.type }); logo = await analyseLogo(logoFile) } catch { /* the logo could not be read back; keep the rest */ }
        }
        // Page kinds may have changed between versions: keep only pages that still exist, add any new ones at the end.
        const pages = [...d.pages.filter(p => p.kind in PAGE_DEFS), ...DEFAULT_PAGES.filter(p => !d.pages.some(q => q.kind === p.kind))]
        set({ tokens: { ...initialTokens(), ...d.tokens }, pages, logo, logoFile, hydration: 'restored' })
        return
      }
    } catch { /* storage unavailable; work in memory */ }
    set({ hydration: 'fresh' })
  },
  startOver: async () => {
    set({ tokens: initialTokens(), pages: DEFAULT_PAGES, logo: null, logoFile: null, hydration: 'fresh' })
    try { await idb.del('brand', DRAFT_ID) } catch { /* ignore */ }
  },
  dirty: () => {
    const s = get()
    return !!s.logo || s.pages !== DEFAULT_PAGES || JSON.stringify(s.tokens) !== JSON.stringify(initialTokens())
  },
  set: (k, v) => set(s => ({ tokens: { ...s.tokens, [k]: v } })),
  setTok: (k, v) => set(s => ({ tokens: { ...s.tokens, [k]: { value: v, locked: true } } })),
  toggleLock: k => {
    const t = get().tokens, cur = t[k]
    if (cur.locked) set({ tokens: { ...t, [k]: { ...cur, locked: false } } })
    else set({ tokens: { ...t, [k]: { value: resolve(t)[k].value, locked: true } } })
  },
  newTake: () => set(s => ({ tokens: { ...s.tokens, salt: s.tokens.salt + 1 } })),
  pages: DEFAULT_PAGES,
  movePage: (from, to) => set(s => {
    if (to < 0 || to >= s.pages.length || from === to) return s
    const p = [...s.pages]; const [it] = p.splice(from, 1); p.splice(to, 0, it); return { pages: p }
  }),
  togglePage: i => set(s => ({ pages: s.pages.map((p, j) => (j === i ? { ...p, on: !p.on } : p)) })),
  setVariant: (i, v) => set(s => ({ pages: s.pages.map((p, j) => (j === i ? { ...p, variant: v } : p)) })),
  cycleVariant: (i, dir = 1) => set(s => ({ pages: s.pages.map((p, j) => { if (j !== i) return p; const n = PAGE_DEFS[p.kind].variants.length; return { ...p, variant: (p.variant + dir + n) % n } }) })),
  resetPages: () => set({ pages: DEFAULT_PAGES }),
  unlockAll: () => set(s => {
    const t = { ...s.tokens } as BrandTokens
    for (const k of Object.keys(t) as (keyof BrandTokens)[]) { const v = t[k] as unknown; if (v && typeof v === 'object' && 'locked' in (v as object)) (t as unknown as Record<string, unknown>)[k] = { ...(v as object), locked: false } }
    return { tokens: t }
  }),
}))

// Save every change, debounced, once the draft has been read (so defaults never overwrite a saved draft).
let timer: ReturnType<typeof setTimeout> | null = null
useBrand.subscribe((s, prev) => {
  if (s.hydration === 'loading') return
  if (s.tokens === prev.tokens && s.pages === prev.pages && s.logoFile === prev.logoFile) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const cur = useBrand.getState()
    // Defaults are not worth a record (and would bring back the "picked up" note after Start over).
    if (!cur.dirty()) { idb.del('brand', DRAFT_ID).catch(() => {}); return }
    const d: Draft = { id: DRAFT_ID, tokens: cur.tokens, pages: cur.pages, logo: cur.logoFile ? { blob: cur.logoFile, name: cur.logoFile.name } : null, updatedAt: Date.now() }
    idb.put('brand', d).catch(() => { /* storage full or blocked; the session keeps working in memory */ })
  }, 500)
})

/** Warn before leaving only when the draft cannot be on disk (private session) and there is work to lose. */
export function guardUnload() {
  if (typeof window === 'undefined') return () => {}
  const h = (e: BeforeUnloadEvent) => { if (isPrivate() && useBrand.getState().dirty()) { e.preventDefault(); e.returnValue = '' } }
  window.addEventListener('beforeunload', h)
  return () => window.removeEventListener('beforeunload', h)
}
