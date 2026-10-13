/**
 * SEARCH-A rights records — provenance and licensing for external assets.
 * Every imported external asset carries one of these (embedded in the
 * NativeAsset `rights` field, persisted with the .void document).
 *
 * commercialUse is tri-state on purpose: 'verified' only when the provider's
 * terms explicitly confirm it for this asset, 'unknown' when unverified
 * (the UI warns instead of inventing permission), 'restricted' when the
 * licence forbids commercial use or redistribution.
 */

export type CommercialUse = 'verified' | 'unknown' | 'restricted'

export interface RightsRecord {
  provider: string
  providerDisplayName: string
  creator: string | null
  creatorUrl: string | null
  sourceUrl: string | null
  licence: string
  licenceUrl: string | null
  commercialUse: CommercialUse
  attributionRequired: boolean
  creditText: string | null
  restrictions: string | null
  retrievedAt: number
  sourceId: string
}

export function creditTextFor(r: Pick<RightsRecord, 'creator' | 'providerDisplayName'>): string {
  return r.creator ? `Photo by ${r.creator} / ${r.providerDisplayName}` : `Photo via ${r.providerDisplayName}`
}

/** Short badge for result grids: licence + commercial state. */
export function rightsBadge(r: RightsRecord): { label: string; tone: 'ok' | 'warn' | 'stop' } {
  if (r.commercialUse === 'verified' && !r.attributionRequired) return { label: `${r.licence} · commercial OK`, tone: 'ok' }
  if (r.commercialUse === 'verified') return { label: `${r.licence} · commercial OK · credit required`, tone: 'ok' }
  if (r.commercialUse === 'restricted') return { label: `${r.licence} · restricted`, tone: 'stop' }
  return { label: `${r.licence} · rights unverified`, tone: 'warn' }
}

/** What the UI must tell the designer before commercial use. */
export function commercialWarning(r: RightsRecord): string | null {
  if (r.commercialUse === 'verified') {
    return r.attributionRequired
      ? `Commercial use permitted under ${r.licence}. Credit required: ${r.creditText ?? creditTextFor(r)}.`
      : null
  }
  if (r.commercialUse === 'restricted') {
    return `Not cleared for commercial use (${r.licence}).${r.restrictions ? ' ' + r.restrictions : ''} Do not use in client or paid work.`
  }
  return `Licence not verified for commercial use. Confirm the terms at the source before client or paid work.${r.sourceUrl ? '' : ' No source URL was retained.'}`
}
