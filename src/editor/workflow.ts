import type { Doc, ExportRecord } from './types'

// Coming-back analytics. Counts whole workflows (the north star), once per design per session:
//   create-edit-export     a new design, changed, then exported
//   open-change-save       a saved design opened, changed, then saved
//   master-formats-export  linked format boards exported
//   template-new-design    a new design started from a template
// and activation: the first export of a design. Nothing here leaves the device when usage sharing is off.

const opened = new Set<string>()
const changed = new Set<string>()
const fromTemplate = new Set<string>()
// Counted once per design per browsing session: a reload in the same tab does not count them again.
const done = (() => { try { return new Set<string>(JSON.parse(sessionStorage.getItem('vc-workflows') || '[]')) } catch { return new Set<string>() } })()
const remember = () => { try { sessionStorage.setItem('vc-workflows', JSON.stringify(Array.from(done).slice(-200))) } catch { /* storage blocked */ } }

const send = (name: string, props: Record<string, string | number | boolean>) => { import('@/lib/analytics').then(m => m.track(name, props)).catch(() => {}) }
const once = (kind: string, id: string) => { const k = kind + ':' + id; if (done.has(k)) return; done.add(k); remember(); send('workflow', { kind }) }

/** A saved design was opened (not a template copy). */
export function noteOpened(id: string) { opened.add(id) }
/** A new design was made from a template. */
export function noteFromTemplate(id: string) { fromTemplate.add(id); once('template-new-design', id) }
/** The design really changed (an export record alone does not count). */
export function noteChanged(id: string) { changed.add(id) }
/** The design was saved after a change. */
export function noteSaved(id: string) { if (opened.has(id) && changed.has(id)) once('open-change-save', id) }

/** After an export: activation on the design's first export, and the workflows an export completes. */
export function noteExported(doc: Doc, rec: Omit<ExportRecord, 'at'>, first: boolean) {
  if (first) {
    let device = false
    try { device = !localStorage.getItem('vc-activated'); localStorage.setItem('vc-activated', '1') } catch { /* storage blocked */ }
    send('activation', { format: rec.format, first_on_device: device, edited: changed.has(doc.id) })
  }
  if (!opened.has(doc.id) && changed.has(doc.id)) once('create-edit-export', doc.id)
  if ((doc.frames ?? []).some(f => f.linkedFrom && rec.boards.includes(f.id))) once('master-formats-export', doc.id)
}
