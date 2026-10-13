/**
 * C3-B regional proposals — non-destructive edit candidates with C2 task records.
 *
 * A proposal run captures {docId, docRev, layerId} up front and wraps each
 * candidate method (local texture repair, on-device AI removal) in a real
 * C2 GenerationTask (capability 'region-edit'): draft → disclosure → consent →
 * running → ready/failed/canceled. Accepting checks the task against the live
 * docRev first, so a result started before the layer was modified or deleted
 * can never silently overwrite newer state (stale quarantine).
 *
 * Repair functions are injected so the orchestration is unit-testable without
 * canvases, models or the store.
 */

import {
  canCommit,
  cancel as cancelTask,
  complete as completeTask,
  consent as consentTask,
  createTask,
  fail as failTask,
  showDisclosure,
  start as startTask,
  type GenerationTask,
} from '../unified/generation-tasks'

export type ProposalMethod = 'local' | 'ai'

export interface ProposalInput {
  docId: string
  docRevision: number
  layerId: string
}

export interface ProposalCandidate<T = unknown> {
  id: string
  method: ProposalMethod
  label: string
  /** Opaque repair output (canvas in the dialog, marker in tests). */
  output: T
  ms: number
  task: GenerationTask
}

export interface ProposalFailure {
  method: ProposalMethod
  label: string
  error: string
}

export interface ProposalRun<T = unknown> {
  input: ProposalInput
  candidates: ProposalCandidate<T>[]
  failures: ProposalFailure[]
  stale: boolean
}

export interface RepairFns<T = unknown> {
  local: () => Promise<T | null>
  /** Null when the method is unavailable (no consent, no model); string explains why. */
  ai: () => Promise<{ output: T | null; unavailable?: string }>
}

let proposalSeq = 0

async function runMethod<T>(
  method: ProposalMethod,
  label: string,
  input: ProposalInput,
  fn: () => Promise<T | null>,
  liveRev: () => number,
  signal?: AbortSignal,
): Promise<{ candidate: ProposalCandidate<T> | null; failure: ProposalFailure | null }> {
  let task = startTask(consentTask(showDisclosure(createTask(input.docRevision, [input.layerId], 'region-edit')), true))
  if (signal?.aborted) return { candidate: null, failure: null }
  const t0 = Date.now()
  try {
    const output = await fn()
    if (signal?.aborted) return { candidate: null, failure: null }
    if (output == null) {
      task = failTask(task, method === 'local' ? 'No clean donor fits this selection.' : 'The AI remover produced no output.')
      return { candidate: null, failure: { method, label, error: task.error ?? 'No output.' } }
    }
    task = completeTask(task, `${method}-proposal-${proposalSeq}`)
    return {
      candidate: { id: `proposal-${++proposalSeq}`, method, label, output, ms: Date.now() - t0, task },
      failure: null,
    }
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError' || signal?.aborted) {
      return { candidate: null, failure: null }
    }
    task = failTask(task, e instanceof Error ? e.message : 'Repair failed.')
    return { candidate: null, failure: { method, label, error: task.error ?? 'Repair failed.' } }
  }
}

/**
 * Run all available methods. AI unavailability (declined consent, unloadable
 * model) is reported as a failure with its reason — never faked with a
 * local result relabelled as AI.
 */
export async function runProposals<T>(
  input: ProposalInput,
  fns: RepairFns<T>,
  opts: { liveRev: () => number; signal?: AbortSignal; includeAI?: boolean } = { liveRev: () => 0 },
): Promise<ProposalRun<T>> {
  const candidates: ProposalCandidate<T>[] = []
  const failures: ProposalFailure[] = []
  const local = await runMethod<T>('local', 'Local texture repair', input, fns.local, opts.liveRev, opts.signal)
  if (local.candidate) candidates.push(local.candidate)
  else if (local.failure) failures.push(local.failure)
  if (opts.includeAI !== false && !opts.signal?.aborted) {
    const ai = await runMethod<T>('ai', 'AI removal (on-device)', input, async () => {
      const r = await fns.ai()
      if (r.unavailable) throw new Error(r.unavailable)
      return r.output
    }, opts.liveRev, opts.signal)
    if (ai.candidate) candidates.push(ai.candidate)
    else if (ai.failure) failures.push(ai.failure)
  }
  return { input, candidates, failures, stale: opts.liveRev() !== input.docRevision }
}

/** Re-check a candidate against live state before any canvas commit. */
export function acceptProposal<T>(
  candidate: ProposalCandidate<T>,
  live: { docRevision: number; layerExists: boolean },
): { ok: boolean; reason: string | null } {
  if (!live.layerExists) return { ok: false, reason: 'That layer is gone. Nothing was applied.' }
  const check = canCommit(candidate.task, live.docRevision)
  if (!check.ok) return { ok: false, reason: check.reason ?? 'Stale result: the design changed. Kept, not applied.' }
  candidate.task = { ...candidate.task, state: 'committed', error: null }
  return { ok: true, reason: null }
}

export function cancelProposalTask(task: GenerationTask): GenerationTask {
  return cancelTask(task)
}
