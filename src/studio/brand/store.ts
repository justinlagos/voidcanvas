import { create } from 'zustand'
import { initialTokens, resolve, type BrandTokens, type TokKey } from './tokens'
import { DEFAULT_PAGES, PAGE_DEFS, type GuidePhoto, type PageSpec } from '../brand-pages'
import { idb, isPrivate } from '@/editor/io'
import { analyseLogo, NO_DECISIONS, type LogoDecisions, type LogoInfo } from './logo'
import { suggestRules } from '@/lib/intelligence/brand'
import type { VariantId } from '@/lib/intelligence/logo'

// The work in progress (tokens, locks, page order, logo file) is kept in the 'brand' IndexedDB store under
// one record, so a reload, a navigation or a closed tab never loses it. In a private session idb keeps it in
// memory only, and the builder warns before the page unloads.

const DRAFT_ID = 'guideline-draft'
interface Draft { id: string; tokens: BrandTokens; pages: PageSpec[]; logo: { blob: Blob; name: string } | null; decisions?: LogoDecisions; orientation?: 'landscape' | 'portrait'; photos?: { id: string; name: string; blob: Blob }[]; updatedAt: number }

/** A brand photo: the original file, and a decoded copy for drawing. */
export interface BrandPhoto extends GuidePhoto { blob: Blob }
export const MAX_PHOTOS = 3

async function decodePhoto(blob: Blob, max = 1600): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k))
  const x = c.getContext('2d')!; x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  return c
}
/** The photography page sits after the logo rules while there are photos, and goes when the last one does. */
function withPhotoPage(pages: PageSpec[], has: boolean): PageSpec[] {
  const at = pages.findIndex(p => p.kind === 'photo')
  if (has && at < 0) { const i = pages.findIndex(p => p.kind === 'misuse'); const next = [...pages]; next.splice(i < 0 ? next.length : i + 1, 0, { kind: 'photo', variant: 0, on: true }); return next }
  if (!has && at >= 0) return pages.filter(p => p.kind !== 'photo')
  return pages
}

interface BrandState {
  tokens: BrandTokens
  /** The uploaded logo, analysed. The original file is kept so it can be restored after a reload. */
  logo: LogoInfo | null
  logoFile: File | null
  setLogo: (info: LogoInfo | null, file: File | null) => void
  /** The designer's say over the analysis: variants switched off, treatments chosen per background. */
  decisions: LogoDecisions
  toggleVariant: (id: VariantId) => void
  /** Choose a treatment for a background by hand, or null to go back to the suggestion. */
  chooseBackground: (bgId: string, v: VariantId | null) => void
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
  /** 'layout' keeps colours, type and scale and redraws composition (a variation). 'all' regenerates every unlocked token (a mutation). */
  newTake: (kind?: 'layout' | 'all') => void
  unlockAll: () => void
  /** Up to three photos of the brand in use, for the photography page, saved with the client brand. */
  photos: BrandPhoto[]
  addPhotos: (files: File[]) => Promise<number>
  removePhoto: (id: string) => void
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
  setLogo: (logo, logoFile) => set(s => {
    // Rules the designer has not set follow the artwork: clear space from its shape, minimum size from its thinnest stroke.
    const r = suggestRules(logo?.profile ?? null)
    const t = { ...s.tokens }
    if (!t.logoClear.locked) t.logoClear = { value: r.clearSpace.value, locked: false }
    if (!t.logoMin.locked) t.logoMin = { value: r.minWidth.value, locked: false }
    if (!t.logoMinPrint.locked) t.logoMinPrint = { value: r.minPrint.value, locked: false }
    // Decisions were made about one artwork; a different file starts clean.
    const same = logo && s.logo && logo.fileName === s.logo.fileName && logo.width === s.logo.width && logo.height === s.logo.height
    return { logo, logoFile, tokens: t, decisions: same ? s.decisions : NO_DECISIONS }
  }),
  decisions: NO_DECISIONS,
  toggleVariant: id => set(s => ({ decisions: { ...s.decisions, off: s.decisions.off.includes(id) ? s.decisions.off.filter(x => x !== id) : [...s.decisions.off, id] } })),
  chooseBackground: (bgId, v) => set(s => { const b = { ...s.decisions.backgrounds }; if (v) b[bgId] = v; else delete b[bgId]; return { decisions: { ...s.decisions, backgrounds: b } } }),
  photos: [],
  addPhotos: async files => {
    const room = MAX_PHOTOS - get().photos.length
    const add: BrandPhoto[] = []
    for (const f of files.slice(0, Math.max(0, room))) {
      try { add.push({ id: 'ph' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: f.name.replace(/\.[a-z0-9]+$/i, '') || 'Photo', blob: f, img: await decodePhoto(f) }) } catch { /* not an image; skip it */ }
    }
    if (add.length) set(s => { const photos = [...s.photos, ...add].slice(0, MAX_PHOTOS); return { photos, pages: withPhotoPage(s.pages, true) } })
    return add.length
  },
  removePhoto: id => set(s => { const photos = s.photos.filter(p => p.id !== id); return { photos, pages: withPhotoPage(s.pages, photos.length > 0) } }),
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
        const photos: BrandPhoto[] = []
        for (const p of d.photos ?? []) { try { photos.push({ id: p.id, name: p.name, blob: p.blob, img: await decodePhoto(p.blob) }) } catch { /* could not be read back */ } }
        const pages = withPhotoPage([...d.pages.filter(p => p.kind in PAGE_DEFS), ...DEFAULT_PAGES.filter(p => !d.pages.some(q => q.kind === p.kind))], photos.length > 0)
        set({ tokens: { ...initialTokens(), ...d.tokens }, pages, logo, logoFile, photos, decisions: d.decisions ?? NO_DECISIONS, hydration: 'restored' })
        return
      }
    } catch { /* storage unavailable; work in memory */ }
    set({ hydration: 'fresh' })
  },
  startOver: async () => {
    set({ tokens: initialTokens(), pages: DEFAULT_PAGES, logo: null, logoFile: null, photos: [], decisions: NO_DECISIONS, hydration: 'fresh' })
    try { await idb.del('brand', DRAFT_ID) } catch { /* ignore */ }
  },
  dirty: () => {
    const s = get()
    return !!s.logo || s.photos.length > 0 || s.pages !== DEFAULT_PAGES || JSON.stringify(s.tokens) !== JSON.stringify(initialTokens())
  },
  set: (k, v) => set(s => ({ tokens: { ...s.tokens, [k]: v } })),
  setTok: (k, v) => set(s => ({ tokens: { ...s.tokens, [k]: { value: v, locked: true } } })),
  toggleLock: k => {
    const t = get().tokens, cur = t[k]
    if (cur.locked) set({ tokens: { ...t, [k]: { ...cur, locked: false } } })
    else set({ tokens: { ...t, [k]: { value: resolve(t)[k].value, locked: true } } })
  },
  newTake: (kind = 'all') => set(s => (kind === 'layout' ? { tokens: { ...s.tokens, layoutSalt: (s.tokens.layoutSalt ?? 0) + 1 } } : { tokens: { ...s.tokens, salt: s.tokens.salt + 1 } })),
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
  if (s.tokens === prev.tokens && s.pages === prev.pages && s.logoFile === prev.logoFile && s.decisions === prev.decisions && s.photos === prev.photos) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const cur = useBrand.getState()
    // Defaults are not worth a record (and would bring back the "picked up" note after Start over).
    if (!cur.dirty()) { idb.del('brand', DRAFT_ID).catch(() => {}); return }
    const d: Draft = { id: DRAFT_ID, tokens: cur.tokens, pages: cur.pages, logo: cur.logoFile ? { blob: cur.logoFile, name: cur.logoFile.name } : null, decisions: cur.decisions, photos: cur.photos.map(p => ({ id: p.id, name: p.name, blob: p.blob })), updatedAt: Date.now() }
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
