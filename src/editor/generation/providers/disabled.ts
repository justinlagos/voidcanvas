/**
 * GEN-A real-provider adapters — interface-conformant, DISABLED by default.
 *
 * Each adapter below describes a genuine provider (capabilities per current
 * public docs, links included for implementers) but performs NO network I/O:
 * availability() is false until server credentials exist, every method
 * consults policy.ts first and throws ProviderDisabledError otherwise.
 *
 * Capability/price notes are verify-current snapshots (Oct 2026 research),
 * not quotes. Enabling any adapter requires explicit approval, server-side
 * credentials, and a pricing re-check — never a client-bundle key.
 */
import {
  ProviderDisabledError,
  type Availability,
  type CostEstimate,
  type GeneratedCandidate,
  type GenerationCapability,
  type GenerationProvider,
  type GenerationRequest,
  type RegionEditRequest,
} from '../provider'
import { isProviderAllowed } from '../policy'

const DISABLED_REASON =
  'No API credentials are configured and remote generation has not been approved. Nothing was sent anywhere.'

function guard(id: string): void {
  const policy = isProviderAllowed(id, false)
  if (!policy.ok) throw new ProviderDisabledError(id, policy.reason ?? DISABLED_REASON)
  throw new ProviderDisabledError(id, DISABLED_REASON)
}

function base(id: string, displayName: string, capabilities: readonly GenerationCapability[]): Omit<GenerationProvider, 'generate' | 'editRegion'> & { generate: GenerationProvider['generate']; editRegion?: GenerationProvider['editRegion'] } {
  return {
    id,
    mock: false,
    remote: true,
    displayName,
    capabilities,
    availability: (): Availability => ({ available: false, reason: DISABLED_REASON }),
    estimateCost: () => ({ amount: null, currency: 'USD', breakdown: 'Verify current provider pricing before enabling.' }),
    generate: async () => {
      guard(id)
      throw new Error('unreachable')
    },
  }
}

/**
 * OpenAI image API (Bearer key, server-side only).
 * Docs: https://developers.openai.com/api/docs/guides/image-generation
 * Researched: generation + edit endpoints with mask support; output priced by
 * size/quality tier (gpt-image-1 page showed $0.011/$0.042/$0.167 per 1024px
 * image low/med/high but is labelled deprecated — re-check live pricing).
 */
export function createOpenAIAdapter(): GenerationProvider {
  const p = base('openai', 'OpenAI image API', ['text-to-image', 'variation', 'region-edit'])
  return {
    ...p,
    estimateCost: (capability, opts) => ({
      amount: null,
      currency: 'USD',
      breakdown: `OpenAI prices ${capability} outputs by size/quality tier plus input-image and text tokens for ${opts.count} image(s). Re-check the live pricing page before enabling.`,
    }),
  }
}

/**
 * Stability AI API (key + credits; ~$0.01/credit and 25 starter credits per
 * indexed pricing — VERIFY, pages were not fully readable in research).
 * Docs: https://platform.stability.ai/docs/api-reference
 * Researched: Inpaint and Outpaint services documented.
 */
export function createStabilityAdapter(): GenerationProvider {
  const p = base('stability', 'Stability AI', ['text-to-image', 'variation', 'region-edit', 'outpaint'])
  return {
    ...p,
    estimateCost: (capability, opts) => ({
      amount: null,
      currency: 'USD',
      breakdown: `Stability bills ${capability} in credits (Ultra reported at 8 credits/output — unverified). ${opts.count} image(s): re-check live pricing before enabling.`,
    }),
    editRegion: async () => {
      guard('stability')
      throw new Error('unreachable')
    },
  }
}

/**
 * FLUX via fal (key, per-megapixel billing).
 * Docs: https://fal.ai/models/fal-ai/flux/schnell
 * Researched: FLUX.1 [schnell] $0.003/MP rounded up; commercial-use eligible
 * per the endpoint page. Newer image-edit endpoint supports local edits.
 */
export function createFluxFalAdapter(): GenerationProvider {
  const p = base('flux-fal', 'FLUX via fal', ['text-to-image', 'variation', 'region-edit'])
  return {
    ...p,
    estimateCost: (capability, opts) => {
      const mp = Math.max(1, Math.ceil(((opts.width * opts.height) / 1e6) * 10) / 10)
      const perImage = Math.ceil(mp) * 0.003
      return {
        amount: Math.round(perImage * opts.count * 1000) / 1000,
        currency: 'USD',
        breakdown: `${opts.count} image(s) × ~${mp.toFixed(1)} MP × $0.003/MP (${capability}). Verify live fal pricing before enabling.`,
      }
    },
    editRegion: async () => {
      guard('flux-fal')
      throw new Error('unreachable')
    },
  }
}

/**
 * Adobe Firefly Services (OAuth server-to-server, 24h bearer tokens).
 * Docs: https://developer.adobe.com/firefly-services/docs/firefly-api/
 * Researched: async Fill Image and Expand Image APIs (inpaint/outpaint
 * equivalents). No verified public per-image API price — do NOT substitute
 * consumer generative-credit pricing.
 */
export function createFireflyAdapter(): GenerationProvider {
  const p = base('firefly', 'Adobe Firefly Services', ['text-to-image', 'region-edit', 'outpaint'])
  return {
    ...p,
    estimateCost: (capability, opts) => ({
      amount: null,
      currency: 'USD',
      breakdown: `No verified public per-image API price for ${capability} (${opts.count} image(s)). Obtain the Adobe service agreement and plan terms before enabling.`,
    }),
    editRegion: async () => {
      guard('firefly')
      throw new Error('unreachable')
    },
  }
}

export const REAL_ADAPTERS = [createOpenAIAdapter, createStabilityAdapter, createFluxFalAdapter, createFireflyAdapter]

export type { GeneratedCandidate, GenerationRequest, RegionEditRequest }
