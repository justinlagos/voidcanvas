// B08: mock generation provider + consent state machine. No network, no charges.
// The mock is visibly marked (provider id 'mock-test-provider', mock:true) and
// must never be presented as production. Real provider wiring is Stage 3-gated.
export type TaskState = 'draft' | 'awaiting_consent' | 'queued' | 'running' | 'ready' | 'failed' | 'canceled' | 'committed'
export type Capability = 'text-to-image' | 'region-edit' | 'variation' | 'upscale' | 'search'

export interface GenerationTask {
  taskId: string
  docRevision: number
  targetObjectIds: string[]
  capability: Capability
  provider: 'mock-test-provider'
  mock: true
  state: TaskState
  costEstimate: number
  costConfirmed: boolean
  error: string | null
  resultAssetId: string | null
  disclosureShown: boolean
}

let taskSeq = 0
export const MOCK_COST = 0

export function createTask(docRevision: number, targetObjectIds: string[], capability: Capability): GenerationTask {
  return {
    taskId: 'mock-task-' + (++taskSeq), docRevision, targetObjectIds, capability,
    provider: 'mock-test-provider', mock: true, state: 'draft',
    costEstimate: MOCK_COST, costConfirmed: false, error: null, resultAssetId: null, disclosureShown: false,
  }
}

// Disclosure (provider, data sent, licence, price) must precede any queueing.
export function showDisclosure(t: GenerationTask): GenerationTask {
  return { ...t, disclosureShown: true, state: 'awaiting_consent' }
}

export function consent(t: GenerationTask, accepted: boolean): GenerationTask {
  if (t.state !== 'awaiting_consent') return { ...t, error: 'consent-out-of-order' }
  if (!t.disclosureShown) return { ...t, error: 'disclosure-required' }
  return { ...t, state: accepted ? 'queued' : 'canceled', costConfirmed: accepted }
}

export function start(t: GenerationTask): GenerationTask {
  if (t.state !== 'queued') return { ...t, error: 'start-requires-queued' }
  return { ...t, state: 'running', error: null }
}

export function complete(t: GenerationTask, assetId: string): GenerationTask {
  if (t.state !== 'running') return { ...t, error: 'complete-requires-running' }
  return { ...t, state: 'ready', resultAssetId: assetId }
}

export function fail(t: GenerationTask, message: string): GenerationTask {
  if (t.state !== 'running' && t.state !== 'queued') return { ...t, error: 'fail-requires-active' }
  return { ...t, state: 'failed', error: message }
}

export function cancel(t: GenerationTask): GenerationTask {
  if (t.state === 'ready' || t.state === 'committed') return { ...t, error: 'cancel-too-late' }
  return { ...t, state: 'canceled', error: null }
}

// Stale-revision guard: results from an old doc revision wait in the tray, never auto-commit.
export function canCommit(t: GenerationTask, currentDocRevision: number): { ok: boolean; reason: string | null } {
  if (t.state !== 'ready') return { ok: false, reason: 'not-ready' }
  if (t.docRevision !== currentDocRevision) return { ok: false, reason: 'stale-revision: keep in tray' }
  if (!t.resultAssetId) return { ok: false, reason: 'no-result' }
  return { ok: true, reason: null }
}

export function commitTask(t: GenerationTask, currentDocRevision: number): GenerationTask {
  const c = canCommit(t, currentDocRevision)
  if (!c.ok) return { ...t, error: c.reason }
  return { ...t, state: 'committed', error: null }
}
