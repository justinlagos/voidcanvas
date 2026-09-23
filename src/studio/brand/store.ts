import { create } from 'zustand'
import { initialTokens, resolve, type BrandTokens, type TokKey } from './tokens'
import { DEFAULT_PAGES, PAGE_DEFS, type PageSpec } from '../brand-pages'

// In memory only. Nothing about the brand is written to disk unless the user exports it.

interface BrandState {
  tokens: BrandTokens
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
