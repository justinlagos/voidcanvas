import type { Job } from './jobs'

export interface ProductionState {
  missingFormats: string[]
  openFeedback: number
  approvedAt: number | null
  designChangedAfterApproval: boolean
  staleDelivery: boolean
  ready: boolean
}

/** Fast, deterministic production state used across Studio. It never mutates a job. */
export function productionState(job: Job, designUpdatedAt?: number | null): ProductionState {
  const missingFormats = job.deliverables.filter(d => !d.done).map(d => d.label)
  const openFeedback = job.versions.reduce((n, v) => n + Object.values(v.pins ?? {}).flat().filter(p => !p.done).length + (v.todo ?? []).filter(t => !t.done).length, 0)
  const approved = job.versions.filter(v => v.status === 'approved').sort((a, b) => b.at - a.at)[0]
  const deliveredAt = (job.deliveries ?? []).reduce((n, d) => Math.max(n, d.at), 0)
  const changed = !!approved && !!designUpdatedAt && designUpdatedAt > approved.at
  const staleDelivery = !!deliveredAt && !!designUpdatedAt && designUpdatedAt > deliveredAt
  return { missingFormats, openFeedback, approvedAt: approved?.at ?? null, designChangedAfterApproval: changed, staleDelivery, ready: missingFormats.length === 0 && openFeedback === 0 && !!approved && !changed }
}
