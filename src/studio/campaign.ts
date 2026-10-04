import { idb, type ProjectSummary, type StoredProject } from '@/editor/io'
import type { DesignBrief } from '@/editor/types'
import type { Job } from './jobs'

const UNDO_PREFIX = 'campaign-undo:'

interface CampaignUndo {
  id: string
  kind: 'campaignUndo'
  jobId: string
  at: number
  projects: { project: StoredProject; summary?: ProjectSummary }[]
}

export interface CampaignUpdateResult {
  designs: number
  layers: number
  boards: number
  overrides: number
  keys: string[]
  undoId?: string
}

const itemMap = (brief?: DesignBrief | null) => new Map((brief?.items ?? []).filter(i => i.key).map(i => [i.key!, i.value]))

/**
 * Update brief-linked text in every saved design belonging to a Studio job.
 * A tagged layer is only changed when it still contains the previous token value; if the designer
 * edited that layer away from the linked value, it is treated as an intentional local override.
 */
export async function changeCampaignEverywhere(job: Job, nextBrief: DesignBrief): Promise<CampaignUpdateResult> {
  const summaries = await idb.all<ProjectSummary>('index').catch((): ProjectSummary[] => [])
  const ids = new Set(summaries.filter(p => p.jobId === job.id).map(p => p.id))
  if (job.designId) ids.add(job.designId)

  const snapshots: CampaignUndo['projects'] = []
  let designs = 0, layers = 0, overrides = 0
  const boards = new Set<string>(), keys = new Set<string>()

  for (const id of Array.from(ids)) {
    const project = await idb.get<StoredProject>('projects', id).catch(() => undefined)
    if (!project) continue
    const summary = summaries.find(p => p.id === id)
    const oldBrief = project.doc?.brief as DesignBrief | undefined
    const before = itemMap(oldBrief), after = itemMap(nextBrief)
    let changed = false

    const nextLayers = (project.layers ?? []).map((layer: any) => {
      if (layer?.type !== 'text' || !layer.briefKey || !after.has(layer.briefKey)) return layer
      const from = before.get(layer.briefKey)
      const to = after.get(layer.briefKey)!
      if (from === to) return layer
      if (!from || typeof layer.text !== 'string' || !layer.text.includes(from)) { overrides++; return layer }
      changed = true; layers++; keys.add(layer.briefKey); if (layer.frameId) boards.add(layer.frameId)
      return { ...layer, text: layer.text.split(from).join(to), rev: Date.now() + Math.random() }
    })

    if (!changed && JSON.stringify(oldBrief?.items ?? []) === JSON.stringify(nextBrief.items ?? [])) continue
    snapshots.push({ project, summary })
    const nextProject: StoredProject = { ...project, doc: { ...project.doc, brief: nextBrief }, layers: nextLayers }
    await idb.put('projects', nextProject)
    if (summary) await idb.put('index', { ...summary, updatedAt: Date.now() })
    designs++
  }

  if (!snapshots.length) return { designs, layers, boards: boards.size, overrides, keys: Array.from(keys) }
  const undo: CampaignUndo = { id: `${UNDO_PREFIX}${job.id}:${Date.now()}`, kind: 'campaignUndo', jobId: job.id, at: Date.now(), projects: snapshots }
  const old = (await idb.all<any>('account').catch(() => [])).filter(x => x?.kind === 'campaignUndo' && x.jobId === job.id)
  await Promise.all(old.map(x => idb.del('account', x.id).catch(() => {})))
  await idb.put('account', undo)
  return { designs, layers, boards: boards.size, overrides, keys: Array.from(keys), undoId: undo.id }
}

export async function undoCampaignChange(undoId: string): Promise<number> {
  const undo = await idb.get<CampaignUndo>('account', undoId).catch(() => undefined)
  if (!undo) return 0
  for (const snap of undo.projects) {
    await idb.put('projects', snap.project)
    if (snap.summary) await idb.put('index', snap.summary)
  }
  await idb.del('account', undo.id)
  return undo.projects.length
}
