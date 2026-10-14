/**
 * GEN-A provider architecture — extends the C2 contract (mock-provider.ts)
 * without replacing it. Providers advertise only the capabilities they
 * actually implement; the UI must never show an unimplemented capability
 * as working. Real providers are disabled by default (see policy.ts) and
 * build no network traffic until explicitly enabled with user credentials.
 */

export type GenerationCapability =
  | 'text-to-image'
  | 'variation'
  | 'region-edit'
  | 'outpaint'

export type Aspect = 'square' | 'portrait' | 'landscape'

export interface GenerationRequest {
  prompt: string
  aspect: Aspect
  count: number
  capability: 'text-to-image' | 'variation'
  referenceAssetId?: string
}

/** Source pixels + selected region for region-edit / outpaint. */
export interface RegionEditRequest {
  /** PNG bytes of the source crop actually sent (never the whole document). */
  image: Blob
  /** PNG mask bytes (white = change), same dimensions as image. */
  mask: Blob
  width: number
  height: number
  prompt: string
  /** Outpaint only: pixels to grow on each side. */
  expand?: { top: number; right: number; bottom: number; left: number }
  seed?: number
  /** Provider-specific strength; null when unsupported. */
  strength?: number | null
}

export interface GeneratedCandidate {
  id: string
  blob: Blob
  mime: 'image/png'
  width: number
  height: number
  name: string
  /** False only for outputs of a real, authorised provider. */
  mock: boolean
  /** Lineage back to the request that produced this candidate. */
  recipeId?: string | null
}

export interface CostEstimate {
  /**
   * Exact decimal amount + currency, or null when the provider does not
   * publish a stable unit price (the breakdown says how to verify).
   * Null is never rendered as free — the UI must show "verify pricing".
   */
  amount: number | null
  currency: string
  /** Human explanation, e.g. "2 images × $0.003/MP". */
  breakdown: string
}

export type Availability =
  | { available: true }
  | { available: false; reason: string }

export interface GenerationProvider {
  readonly id: string
  /** True for local/demo adapters; false only for authorised remote ones. */
  readonly mock: boolean
  readonly remote: boolean
  readonly displayName: string
  readonly capabilities: readonly GenerationCapability[]
  availability(): Availability
  estimateCost(
    capability: GenerationCapability,
    opts: { count: number; width: number; height: number },
  ): CostEstimate
  generate(
    request: GenerationRequest,
    options?: { signal?: AbortSignal; onProgress?: (fraction: number) => void },
  ): Promise<GeneratedCandidate[]>
  editRegion?(
    request: RegionEditRequest,
    options?: { signal?: AbortSignal; onProgress?: (fraction: number) => void },
  ): Promise<GeneratedCandidate[]>
}

/** Consent record shown BEFORE any remote request; stored with the task. */
export interface ConsentRecord {
  providerId: string
  providerName: string
  operation: string
  /** Exact payload inventory, e.g. ["1024x768 source crop", "1024x768 mask"]. */
  dataSent: string[]
  sharesCanvasContext: boolean
  cost: CostEstimate
  licenceNote: string
  retentionNote: string
  confirmed: boolean
  confirmedAt: number | null
}

export function buildConsentRecord(args: {
  provider: GenerationProvider
  operation: string
  dataSent: string[]
  sharesCanvasContext: boolean
  cost: CostEstimate
  licenceNote: string
  retentionNote: string
}): ConsentRecord {
  return {
    providerId: args.provider.id,
    providerName: args.provider.displayName,
    operation: args.operation,
    dataSent: args.dataSent,
    sharesCanvasContext: args.sharesCanvasContext,
    cost: args.cost,
    licenceNote: args.licenceNote,
    retentionNote: args.retentionNote,
    confirmed: false,
    confirmedAt: null,
  }
}

export function confirmConsent(record: ConsentRecord): ConsentRecord {
  return { ...record, confirmed: true, confirmedAt: Date.now() }
}

/** A disabled adapter must refuse BEFORE any network, with its reason. */
export class ProviderDisabledError extends Error {
  readonly providerId: string
  readonly reason: string
  constructor(providerId: string, reason: string) {
    super(`${providerId} is disabled: ${reason}`)
    this.name = 'ProviderDisabledError'
    this.providerId = providerId
    this.reason = reason
  }
}
