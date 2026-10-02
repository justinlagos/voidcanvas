import type { ProjectSummary } from '@/editor/io'
import type { Job } from '@/studio/jobs'

// What Home says about each piece of work: what is unfinished, in a few words. Shared by the Editor's start
// screen and the landing page. No nagging: a line under the card, nothing more.

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR

/** "just now", "5 min ago", "2 hours ago", "yesterday", "3 Sept". */
export function ago(at: number, now = Date.now()): string {
  const d = now - at
  if (d < MIN) return 'just now'
  if (d < HOUR) return `${Math.round(d / MIN)} min ago`
  if (d < DAY) { const h = Math.round(d / HOUR); return `${h} hour${h === 1 ? '' : 's'} ago` }
  const a = new Date(at), y = new Date(now); y.setDate(y.getDate() - 1)
  if (a.toDateString() === y.toDateString()) return 'yesterday'
  return a.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** "Last exported 2 hours ago: 2 of 4 boards, PNG". Null when the design has never been exported. */
export function lastExportLine(p: { exports?: { at: number; boards: string[]; format: string; what?: string }[]; frames?: { id: string }[] | null }, now = Date.now()): string | null {
  const list = p.exports ?? []
  const last = list[list.length - 1]
  if (!last) return null
  const total = p.frames?.length || 1
  const fmt = last.format === 'jpeg' ? 'JPG' : last.format.toUpperCase()
  const what = last.what === 'selection' ? 'the selection' : total > 1 ? `${last.boards.length} of ${total} boards` : 'the design'
  return `Last exported ${ago(last.at, now)}: ${what}, ${fmt}`
}

export interface DeskStatus {
  text: string
  /** todo: something to do; wait: with the client; done: finished; none: nothing to say. */
  tone: 'todo' | 'wait' | 'done' | 'none'
  /** Work in progress: shown first on Home. */
  open: boolean
}

/** Open comments on a job's newest version. */
export function openPins(job: Job): number {
  const v = latestVersion(job)
  if (!v) return 0
  return Object.values(v.pins ?? {}).reduce((a, list) => a + list.filter(p => !p.done).length, 0)
}
export const latestVersion = (job: Job) => (job.versions ?? []).reduce<Job['versions'][number] | null>((a, v) => (!a || v.n > a.n ? v : a), null)

/** What a job is waiting for, when it is waiting on the client or on you. Null when nothing is pending. */
export function jobStatus(job: Job): DeskStatus | null {
  if (job.status === 'delivered') return { text: 'Delivered', tone: 'done', open: false }
  const v = latestVersion(job)
  const pins = openPins(job)
  const notes = pins ? `, ${pins} comment${pins === 1 ? '' : 's'} open` : ''
  if (v) {
    const decided = v.decision?.value
    if (v.status === 'changes' || decided === 'changes') return { text: `Changes asked${notes}`, tone: 'todo', open: true }
    if (v.status === 'approved' || decided === 'approved') return { text: 'Approved, ready to deliver', tone: 'todo', open: true }
    if (v.status === 'sent') return { text: `Waiting for client${notes}`, tone: 'wait', open: true }
  }
  if (pins) return { text: `${pins} comment${pins === 1 ? '' : 's'} open`, tone: 'todo', open: true }
  return null
}

/**
 * A design's line on Home. Work in progress is: edited in the last 30 days and not exported, only partly
 * exported, changed since its last export, or a Studio job waiting on someone.
 */
export function designStatus(p: ProjectSummary, job?: Job | null, now = Date.now()): DeskStatus {
  if (job) { const s = jobStatus(job); if (s) return s }
  const boards = p.boards ?? 1, done = Math.min(p.exportedBoards ?? 0, boards)
  const edited = p.editedAt ?? p.updatedAt
  const recent = now - edited < 30 * DAY
  if (!p.lastExport) return recent ? { text: 'Not exported yet', tone: 'todo', open: true } : { text: '', tone: 'none', open: false }
  if (done < boards) return { text: `${done} of ${boards} formats exported`, tone: 'todo', open: true }
  if (edited > p.lastExport.at + 2000) return { text: 'Changed since export', tone: 'todo', open: recent }
  return { text: `Exported ${ago(p.lastExport.at, now)}`, tone: 'done', open: false }
}

/** "12 designs · 3 brands · 4 templates · 27 exports": only what there is. */
export function countLine(c: { designs: number; brands: number; templates: number; exports: number }): string {
  const part = (n: number, one: string) => (n ? `${n} ${one}${n === 1 ? '' : 's'}` : '')
  return [part(c.designs, 'design'), part(c.brands, 'brand'), part(c.templates, 'template'), part(c.exports, 'export')].filter(Boolean).join(' · ')
}
