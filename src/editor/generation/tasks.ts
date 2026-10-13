/**
 * C2 generation tasks — runtime orchestration for the local mock provider.
 * Wraps the pure B08 state machine (../unified/generation-tasks) with:
 * - AbortController cancellation (user cancel, superseded/stale tasks)
 * - Progress reporting (per-candidate fractions)
 * - Stale-revision protection (docRev snapshot vs live docRev)
 * - Failed-candidate surfacing without touching canvas state
 *
 * No network, no cost, no canvas writes. Ingest/placement lives in
 * ingest-generated.ts and commits through the ONE C1 history system.
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
  type Capability,
  type GenerationTask,
} from '../unified/generation-tasks'
import type { GeneratedCandidate, GenerationProvider, GenerationRequest } from './mock-provider'

export interface StartGenerationOptions {
  provider: GenerationProvider
  prompt: string
  aspect: GenerationRequest['aspect']
  count: number
  capability?: Capability
  referenceAssetId?: string
  /** docRev snapshot at composer submit time; stale results stay in tray. */
  docRevision: number
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

export interface GenerationRun {
  task: GenerationTask
  candidates: GeneratedCandidate[]
  /** True when the doc moved on while generating; candidates are tray-only. */
  stale: boolean
}

function toProviderCapability(c: Capability): GenerationRequest['capability'] {
  return c === 'variation' ? 'variation' : 'text-to-image'
}

export function isAbortError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError'
}

/**
 * Run one generation end-to-end (consent is implicit: the mock is free and
 * local; the disclosure is shown in the GeneratePanel, not as a blocker).
 * Throws AbortError on cancellation; returns failed state via task, never throws
 * for provider validation errors (surfaced as task.error instead).
 */
export async function startGeneration(opts: StartGenerationOptions): Promise<GenerationRun> {
  let task = createTask(opts.docRevision, opts.referenceAssetId ? [opts.referenceAssetId] : [], opts.capability ?? 'text-to-image')
  task = showDisclosure(task)
  task = consentTask(task, true)
  task = startTask(task)
  if (task.error) {
    return { task: failTask(task, task.error), candidates: [], stale: false }
  }
  const request: GenerationRequest = {
    prompt: opts.prompt,
    aspect: opts.aspect,
    count: opts.count,
    capability: toProviderCapability(opts.capability ?? 'text-to-image'),
    referenceAssetId: opts.referenceAssetId,
  }
  let candidates: GeneratedCandidate[] = []
  try {
    candidates = await opts.provider.generate(request, {
      signal: opts.signal,
      onProgress: opts.onProgress,
    })
  } catch (e) {
    if (isAbortError(e)) {
      return { task: cancelTask(task), candidates: [], stale: false }
    }
    const message = e instanceof Error ? e.message : 'Generation failed.'
    return { task: failTask(task, message), candidates: [], stale: false }
  }
  if (!candidates.length) {
    return { task: failTask(task, 'The provider returned no candidates.'), candidates: [], stale: false }
  }
  task = completeTask(task, candidates[0].id)
  return { task, candidates, stale: false }
}

export interface CommitDecision {
  ok: boolean
  reason: string | null
  task: GenerationTask
}

/** Re-check staleness against the live docRev before any canvas commit. */
export function decideCommit(task: GenerationTask, liveDocRev: number): CommitDecision {
  const check = canCommit(task, liveDocRev)
  if (!check.ok) return { ok: false, reason: check.reason, task: { ...task, error: check.reason } }
  const next = { ...task, state: 'committed' as const, error: null }
  return { ok: true, reason: null, task: next }
}

/** Mark a run stale when the live doc moved on; candidates remain usable from the tray. */
export function markStaleIfMovedOn(run: GenerationRun, liveDocRev: number): GenerationRun {
  if (run.task.docRevision !== liveDocRev) return { ...run, stale: true }
  return run
}

export type { GenerationTask }
