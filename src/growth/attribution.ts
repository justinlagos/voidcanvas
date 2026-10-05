export const GROWTH_SOURCES = ['google', 'bing', 'pinterest', 'linkedin', 'instagram', 'tiktok', 'youtube', 'reddit', 'creator', 'agency', 'education', 'resource', 'void-share', 'internal'] as const
export type GrowthSourceId = (typeof GROWTH_SOURCES)[number]

export interface GrowthLink {
  source: GrowthSourceId
  medium: string
  campaign: string
  content?: string
  experiment?: string
  variant?: string
}

const SAFE = /^[a-z0-9][a-z0-9._-]{0,39}$/

export function safeGrowthTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export function validateGrowthLink(link: GrowthLink): string[] {
  const errors: string[] = []
  const pairs: [string, string | undefined][] = [
    ['source', link.source], ['medium', link.medium], ['campaign', link.campaign], ['content', link.content], ['experiment', link.experiment], ['variant', link.variant],
  ]
  for (const [name, value] of pairs) {
    if (value == null || value === '') continue
    if (!SAFE.test(value)) errors.push(`${name} must be a lower-case growth id (letters, numbers, dot, dash, underscore; max 40).`)
  }
  if ((link.experiment && !link.variant) || (!link.experiment && link.variant)) errors.push('experiment and variant must be supplied together.')
  return errors
}

/**
 * Canonical campaign URL builder. The existing analytics client already reads
 * utm_source, utm_medium, utm_campaign and utm_content. Experiment data rides in
 * vc_exp/vc_var so it can be introduced without changing existing attribution.
 */
export function buildGrowthUrl(path: string, raw: GrowthLink): string {
  const link: GrowthLink = {
    ...raw,
    medium: safeGrowthTag(raw.medium),
    campaign: safeGrowthTag(raw.campaign),
    content: raw.content ? safeGrowthTag(raw.content) : undefined,
    experiment: raw.experiment ? safeGrowthTag(raw.experiment) : undefined,
    variant: raw.variant ? safeGrowthTag(raw.variant) : undefined,
  }
  const errors = validateGrowthLink(link)
  if (errors.length) throw new Error(errors.join(' '))
  const [base, existing = ''] = path.split('?')
  const q = new URLSearchParams(existing)
  q.set('utm_source', link.source)
  q.set('utm_medium', link.medium)
  q.set('utm_campaign', link.campaign)
  if (link.content) q.set('utm_content', link.content)
  if (link.experiment && link.variant) { q.set('vc_exp', link.experiment); q.set('vc_var', link.variant) }
  return `${base}?${q.toString()}`
}

export function readExperiment(search: string): { experiment?: string; variant?: string } {
  const q = new URLSearchParams(search)
  const clean = (k: string) => {
    const v = (q.get(k) || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40)
    return v || undefined
  }
  const experiment = clean('vc_exp'), variant = clean('vc_var')
  return experiment && variant ? { experiment, variant } : {}
}
