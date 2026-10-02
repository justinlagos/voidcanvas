import { describe, expect, it } from 'vitest'
import { ago, countLine, designStatus, jobStatus, lastExportLine } from '../desk'
import { alsoNeeded } from '@/editor/export'
import type { ProjectSummary } from '@/editor/io'
import type { Job } from '@/studio/jobs'

const NOW = new Date(2026, 9, 2, 15, 0).getTime()
const H = 3600_000, D = 24 * H
const design = (o: Partial<ProjectSummary> = {}): ProjectSummary => ({ id: 'd', name: 'Launch', updatedAt: NOW - H, width: 1080, height: 1350, thumb: '', ...o })
const job = (o: Partial<Job> = {}): Job => ({ id: 'j', client: 'Kobo', name: 'Launch', status: 'review', createdAt: 0, updatedAt: 0, brief: 'x', deliverables: [], refs: [], board: [], directions: [], versions: [], ...o }) as Job
const version = (o: any = {}) => ({ id: 'v' + (o.n ?? 1), n: 1, label: 'v1', notes: '', at: 0, images: [], pins: {}, todo: [], status: 'draft', ...o })

describe('Home status lines', () => {
  it('says how long ago in plain words', () => {
    expect(ago(NOW - 20_000, NOW)).toBe('just now')
    expect(ago(NOW - 5 * 60_000, NOW)).toBe('5 min ago')
    expect(ago(NOW - 2 * H, NOW)).toBe('2 hours ago')
    expect(ago(NOW - 1 * H, NOW)).toBe('1 hour ago')
    expect(ago(NOW - D, NOW)).toBe('yesterday')
  })
  it('a design edited lately and never exported is work in progress', () => {
    expect(designStatus(design({ editedAt: NOW - 3 * D }), null, NOW)).toEqual({ text: 'Not exported yet', tone: 'todo', open: true })
    expect(designStatus(design({ editedAt: NOW - 40 * D, updatedAt: NOW - 40 * D }), null, NOW).open).toBe(false)
  })
  it('counts formats exported, and notices a change after the last export', () => {
    const last = { at: NOW - 2 * H, format: 'png', boards: 2 }
    expect(designStatus(design({ boards: 4, exportedBoards: 2, lastExport: last, editedAt: NOW - 3 * H }), null, NOW).text).toBe('2 of 4 formats exported')
    expect(designStatus(design({ boards: 2, exportedBoards: 2, lastExport: last, editedAt: NOW - H }), null, NOW)).toEqual({ text: 'Changed since export', tone: 'todo', open: true })
    expect(designStatus(design({ boards: 2, exportedBoards: 2, lastExport: last, editedAt: NOW - 3 * H }), null, NOW)).toEqual({ text: 'Exported 2 hours ago', tone: 'done', open: false })
  })
  it('a Studio job says what it is waiting for', () => {
    expect(jobStatus(job({ versions: [version({ status: 'sent' })] }))?.text).toBe('Waiting for client')
    expect(jobStatus(job({ versions: [version({ status: 'sent' }), version({ n: 2, status: 'changes', pins: { a: [{ id: 'p', x: 0, y: 0, text: 'x', done: false, at: 0 }, { id: 'q', x: 0, y: 0, text: 'y', done: true, at: 0 }] } })] }))?.text).toBe('Changes asked, 1 comment open')
    expect(jobStatus(job({ versions: [version({ status: 'sent', decision: { value: 'approved', note: '', by: 'Ada', at: 0 } })] }))?.text).toBe('Approved, ready to deliver')
    expect(jobStatus(job({ status: 'delivered' }))?.text).toBe('Delivered')
    expect(jobStatus(job())).toBeNull()
    // The job's line wins over the design's own export line.
    expect(designStatus(design({ jobId: 'j' }), job({ versions: [version({ status: 'sent' })] }), NOW).tone).toBe('wait')
  })
  it('the count line only says what there is', () => {
    expect(countLine({ designs: 12, brands: 1, templates: 0, exports: 27 })).toBe('12 designs · 1 brand · 27 exports')
    expect(countLine({ designs: 0, brands: 0, templates: 0, exports: 0 })).toBe('')
  })
  it('the export dialog says what was exported last', () => {
    const frames = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'e' }]
    expect(lastExportLine({ frames, exports: [{ at: NOW - 2 * H, boards: ['a', 'b'], format: 'png' }] }, NOW)).toBe('Last exported 2 hours ago: 2 of 4 boards, PNG')
    expect(lastExportLine({ frames: null, exports: [{ at: NOW - 60_000 * 3, boards: ['__doc'], format: 'jpeg' }] }, NOW)).toBe('Last exported 3 min ago: the design, JPG')
    expect(lastExportLine({ frames, exports: [{ at: NOW, boards: ['a'], format: 'svg', what: 'selection' }] }, NOW)).toBe('Last exported just now: the selection, SVG')
    expect(lastExportLine({ frames, exports: [] }, NOW)).toBeNull()
  })
})

describe('After export: also needed', () => {
  const f = (id: string, w: number, h: number, o: any = {}) => ({ id, name: id, x: 0, y: 0, width: w, height: h, background: '#fff', ...o })
  it('offers boards never exported, and common sizes the design does not have', () => {
    const doc = { width: 4000, height: 2000, jobId: null, frames: [f('post', 1080, 1350), f('story', 1080, 1920, { linkedFrom: 'post' })], exports: [{ at: 1, boards: ['post'], format: 'png', scale: 1, files: 1 }] }
    const r = alsoNeeded(doc)
    expect(r.others).toEqual(['story'])
    expect(r.from).toBe('post')
    expect(r.sizes.map(p => p.id)).toEqual(['square', 'yt', 'li'])
  })
  it('a print design is offered print sizes; a job design only its own boards', () => {
    expect(alsoNeeded({ width: 2480, height: 3508, frames: undefined, exports: [], jobId: null }).sizes.map(p => p.id)).toEqual(['a5', 'poster', 'card'])
    expect(alsoNeeded({ width: 1, height: 1, frames: [f('a', 1080, 1080)], exports: [], jobId: 'j' })).toEqual({ others: ['a'], sizes: [], from: null })
  })
  it('a selection export does not count as exporting the board', () => {
    expect(alsoNeeded({ width: 1, height: 1, jobId: null, frames: [f('a', 1080, 1080)], exports: [{ at: 1, boards: ['a'], format: 'png', scale: 1, files: 1, what: 'selection' }] }).others).toEqual(['a'])
  })
})
