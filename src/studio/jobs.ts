import { create } from 'zustand'
import { idb } from '@/editor/io'
import { uid } from '@/editor/engine'
import type { RefAnalysis } from './analyze'

// Studio's data. A job is one piece of client work from brief to delivery. Everything lives
// in the browser's IndexedDB: nothing is uploaded, nothing needs an account.

export type JobStatus = 'direction' | 'design' | 'review' | 'delivered'
export const STATUS_LABEL: Record<JobStatus, string> = { direction: 'Direction', design: 'Design', review: 'Review', delivered: 'Delivered' }

export interface Deliverable {
  id: string
  label: string
  /** Preset id, or 'custom'. */
  presetId: string
  width: number
  height: number
  group: 'Social' | 'Screen' | 'Print' | 'Outdoor' | 'Custom'
  /** Print sizes in mm, so delivery can add bleed and crop marks. */
  mm?: { w: number; h: number }
  due?: string
  done: boolean
  /** The board (frame) in the key visual design that answers this deliverable. */
  frameId?: string
}

export interface Ref {
  id: string
  name: string
  blob: Blob
  w: number
  h: number
  palette: string[]
  note?: string
  analysis?: RefAnalysis
}

export type BoardItem =
  | { id: string; kind: 'ref'; refId: string; x: number; y: number; w: number; h: number; crop?: { x: number; y: number; w: number; h: number } }
  | { id: string; kind: 'note'; text: string; x: number; y: number; w: number; h: number; color?: string }
  | { id: string; kind: 'swatch'; hex: string; x: number; y: number; w: number; h: number }
  | { id: string; kind: 'type'; family: string; weight: number; sample: string; x: number; y: number; w: number; h: number }

export interface Direction {
  id: string
  name: string
  idea: string
  keywords: string[]
  /** The frame on the board that holds this direction's references, notes and swatches. */
  x: number
  y: number
  w: number
  h: number
  /** Chosen by hand; otherwise read from the swatches and references inside the frame. */
  palette?: string[]
  display?: string
  body?: string
}

export interface Pin { id: string; x: number; y: number; text: string; done: boolean; at: number }
export interface Version {
  id: string
  n: number
  label: string
  /** What changed since the last version. */
  notes: string
  at: number
  /** One image per format shown in this version. */
  images: { name: string; blob: Blob; w: number; h: number }[]
  pins: Record<string, Pin[]>
  /** Client feedback turned into a checklist. */
  todo: { id: string; text: string; done: boolean }[]
  status: 'sent' | 'approved' | 'changes' | 'draft'
}

export interface Job {
  id: string
  client: string
  name: string
  status: JobStatus
  createdAt: number
  updatedAt: number
  brief: string
  deliverables: Deliverable[]
  refs: Ref[]
  board: BoardItem[]
  directions: Direction[]
  chosenDirection?: string | null
  brandId?: string | null
  /** The Editor design holding the key visual and every format as linked boards. */
  designId?: string | null
  masterFrameId?: string | null
  /** The deliverable the key visual (master board) answers. */
  masterDeliverableId?: string | null
  versions: Version[]
  /** Delivery history. */
  deliveries?: { at: number; files: string[] }[]
}

export function newJob(partial: Partial<Job> = {}): Job {
  const now = Date.now()
  return { id: uid(), client: '', name: 'New job', status: 'direction', createdAt: now, updatedAt: now, brief: '', deliverables: [], refs: [], board: [], directions: [], versions: [], ...partial }
}

/** Client brands: colours with jobs, type, logos, voice. Checked live in the Editor. */
export interface ClientBrand {
  id: string
  name: string
  client: string
  colors: { hex: string; role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'background' | 'text' }[]
  display: string
  body: string
  /** Type scale ratio and base size in px, for the Editor's type checks. */
  scale?: { base: number; ratio: number }
  logos: { id: string; name: string; blob: Blob; w: number; h: number; onDark?: boolean }[]
  /** Smallest the logo may be, in px on a 1080-wide design, and clear space as a share of logo height. */
  logoMin: number
  clearSpace: number
  voice: string[]
  dos: string[]
  donts: string[]
  updatedAt: number
}
export function newBrand(partial: Partial<ClientBrand> = {}): ClientBrand {
  return { id: uid(), name: 'New brand', client: '', colors: [], display: 'Inter', body: 'Inter', logos: [], logoMin: 80, clearSpace: 0.5, voice: [], dos: [], donts: [], updatedAt: Date.now(), ...partial }
}

/** Saved looks from references ("Take the look"): Lab statistics plus texture, used by the Editor's Colour match. */
export interface Look { id: string; name: string; thumb: string; mean: [number, number, number]; std: [number, number, number]; grain: number; at: number }

// ─── Store ─────────────────────────────────────────────────────────

interface JobsState {
  jobs: Job[] | null
  brands: ClientBrand[]
  load: () => Promise<void>
  save: (j: Job) => void
  remove: (id: string) => Promise<void>
  saveBrand: (b: ClientBrand) => Promise<void>
  removeBrand: (id: string) => Promise<void>
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const pending = new Set<string>()

export const useJobs = create<JobsState>((set, get) => ({
  jobs: null,
  brands: [],
  load: async () => {
    const [jobs, brands] = await Promise.all([idb.all<Job>('jobs').catch((): Job[] => []), idb.all<ClientBrand>('brands').catch((): ClientBrand[] => [])])
    // Older reference boards become jobs, once.
    const boards = await idb.all<any>('boards').catch(() => [])
    for (const b of boards) {
      if (jobs.some(j => j.id === b.id)) continue
      const j = newJob({ id: b.id, name: b.title || 'Untitled job', brief: b.brief ?? '', refs: (b.refs ?? []).map((r: any) => ({ id: r.id, name: r.name, blob: r.blob, w: r.w ?? 1000, h: r.h ?? 1000, palette: r.palette ?? [] })), createdAt: b.updatedAt ?? Date.now(), updatedAt: b.updatedAt ?? Date.now() })
      jobs.push(j); await idb.put('jobs', j)
    }
    // Keep in-memory edits that have not been written yet.
    const mine = get().jobs ?? []
    const merged = jobs.map(j => (pending.has(j.id) ? mine.find(m => m.id === j.id) ?? j : j))
    set({ jobs: merged.sort((a, b) => b.updatedAt - a.updatedAt), brands: brands.sort((a, b) => b.updatedAt - a.updatedAt) })
  },
  save: (j) => {
    const next = { ...j, updatedAt: Date.now() }
    set({ jobs: (get().jobs ?? []).map(x => (x.id === j.id ? next : x)).concat((get().jobs ?? []).some(x => x.id === j.id) ? [] : [next]) })
    // Debounced write, so typing does not hammer the database.
    clearTimeout(timers.get(j.id)); pending.add(j.id)
    timers.set(j.id, setTimeout(() => { idb.put('jobs', next).catch(() => {}).finally(() => pending.delete(j.id)) }, 400))
  },
  remove: async (id) => { await idb.del('jobs', id); await idb.del('boards', id).catch(() => {}); set({ jobs: (get().jobs ?? []).filter(j => j.id !== id) }) },
  saveBrand: async (b) => { const next = { ...b, updatedAt: Date.now() }; await idb.put('brands', next); set({ brands: [next, ...get().brands.filter(x => x.id !== b.id)] }) },
  removeBrand: async (id) => { await idb.del('brands', id); set({ brands: get().brands.filter(b => b.id !== id) }) },
}))

/** Save immediately (before leaving the page for the Editor). */
export async function flushJob(j: Job) { clearTimeout(timers.get(j.id)); await idb.put('jobs', { ...j, updatedAt: Date.now() }); pending.delete(j.id) }
export const getJob = (id: string) => idb.get<Job>('jobs', id)
export const getLooks = async () => (await idb.all<Look>('looks').catch(() => [])).sort((a, b) => b.at - a.at)
export const saveLook = (l: Look) => idb.put('looks', l)

// ─── Formats ───────────────────────────────────────────────────────

export interface FormatDef { id: string; label: string; group: Deliverable['group']; width: number; height: number; mm?: { w: number; h: number } }
export const FORMATS: FormatDef[] = [
  { id: 'ig-post', label: 'Instagram post', group: 'Social', width: 1080, height: 1350 },
  { id: 'square', label: 'Square post', group: 'Social', width: 1080, height: 1080 },
  { id: 'story', label: 'Story / Reel / Status', group: 'Social', width: 1080, height: 1920 },
  { id: 'x-post', label: 'X post', group: 'Social', width: 1600, height: 900 },
  { id: 'fb-cover', label: 'Facebook cover', group: 'Social', width: 1640, height: 624 },
  { id: 'li', label: 'LinkedIn banner', group: 'Social', width: 1584, height: 396 },
  { id: 'x', label: 'X header', group: 'Social', width: 1500, height: 500 },
  { id: 'yt', label: 'YouTube thumbnail', group: 'Social', width: 1280, height: 720 },
  { id: 'wa-status', label: 'WhatsApp flyer', group: 'Social', width: 1080, height: 1350 },
  { id: 'slide', label: 'Presentation slide', group: 'Screen', width: 1920, height: 1080 },
  { id: 'web', label: 'Website hero', group: 'Screen', width: 2400, height: 1200 },
  { id: 'email', label: 'Email header', group: 'Screen', width: 1200, height: 600 },
  { id: 'a4', label: 'A4 flyer', group: 'Print', width: 2480, height: 3508, mm: { w: 210, h: 297 } },
  { id: 'a5', label: 'A5 flyer', group: 'Print', width: 1748, height: 2480, mm: { w: 148, h: 210 } },
  { id: 'a3', label: 'A3 poster', group: 'Print', width: 3508, height: 4961, mm: { w: 297, h: 420 } },
  { id: 'poster', label: 'Poster 18 × 24 in', group: 'Print', width: 2700, height: 3600, mm: { w: 457.2, h: 609.6 } },
  { id: 'card', label: 'Business card', group: 'Print', width: 1050, height: 600, mm: { w: 89, h: 51 } },
  { id: 'rollup', label: 'Roll-up banner 85 × 200 cm', group: 'Print', width: 2008, height: 4724, mm: { w: 850, h: 2000 } },
  { id: 'billboard-48', label: 'Billboard 48-sheet', group: 'Outdoor', width: 4800, height: 2400 },
  { id: 'billboard-ng', label: 'Billboard 40 × 20 ft', group: 'Outdoor', width: 4800, height: 2400 },
  { id: 'lamp-post', label: 'Lamp-post banner', group: 'Outdoor', width: 1200, height: 3600 },
]
export function deliverableFrom(f: FormatDef): Deliverable {
  return { id: uid(), label: f.label, presetId: f.id, width: f.width, height: f.height, group: f.group, ...(f.mm ? { mm: f.mm } : {}), done: false }
}

/** client_job_format_v3 */
export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '-').slice(0, 40) || 'untitled'
export const fileName = (j: Job, d: { label: string }, v: number, ext: string) => `${slug(j.client || 'client')}_${slug(j.name)}_${slug(d.label)}_v${v}.${ext}`
