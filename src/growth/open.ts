import { GROWTH_SOURCES, buildGrowthUrl, safeGrowthTag, type GrowthSourceId } from './attribution'
import { TOOLS } from '@/tools/defs'

export type OpenDestination = 'editor' | 'effects' | 'studio' | 'brand' | 'tools'

export interface OpenRequest {
  to?: string | null
  tool?: string | null
  source?: string | null
  medium?: string | null
  campaign?: string | null
  content?: string | null
}

const SAFE_SOURCES = new Set<string>(GROWTH_SOURCES)

export interface ResolvedOpen {
  destination: string
  source: GrowthSourceId
  href: string
}

/**
 * Stable, deliberately narrow contract for external “Open in Voidcanvas” links.
 * Query values can choose only known internal destinations. There is no arbitrary
 * URL redirect and v1 does not fetch/import a remote asset.
 */
export function resolveOpenRequest(input: OpenRequest): ResolvedOpen {
  const to: OpenDestination = ['editor', 'effects', 'studio', 'brand', 'tools'].includes(input.to || '') ? input.to as OpenDestination : 'editor'
  let destination = `/${to}`
  if (to === 'tools') {
    const slug = safeGrowthTag(input.tool || '')
    destination = slug && TOOLS[slug] ? `/tools/${slug}` : '/tools'
  }

  const rawSource = safeGrowthTag(input.source || '')
  const source = (SAFE_SOURCES.has(rawSource) ? rawSource : 'resource') as GrowthSourceId
  const medium = safeGrowthTag(input.medium || '') || 'referral'
  const campaign = safeGrowthTag(input.campaign || '') || 'open-in-voidcanvas'
  const content = safeGrowthTag(input.content || '') || undefined

  return {
    destination,
    source,
    href: buildGrowthUrl(destination, { source, medium, campaign, content }),
  }
}
