import { CAPABILITIES } from './knowledge'
import { OPPORTUNITIES } from './opportunities'
import { invalidToolLinks } from './contentGraph'
import { TOOLS } from '@/tools/defs'
import { validateToolRegistry } from '@/tools/factory'

export interface GrowthValidation {
  blockers: string[]
  warnings: string[]
  ok: boolean
}

const duplicates = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)

/**
 * Deterministic gate for owned-surface automation. Future publishers should call
 * this before generating or publishing anything. A blocker means stop; a warning
 * means keep the work in an approval-gated autonomy level.
 */
export function validateGrowthState(): GrowthValidation {
  const blockers: string[] = []
  const warnings: string[] = []

  const capabilityIds = CAPABILITIES.map(c => c.id)
  const opportunityIds = OPPORTUNITIES.map(o => o.id)
  for (const id of new Set(duplicates(capabilityIds))) blockers.push(`duplicate capability id: ${id}`)
  for (const id of new Set(duplicates(opportunityIds))) blockers.push(`duplicate opportunity id: ${id}`)

  const known = new Set(capabilityIds)
  for (const o of OPPORTUNITIES) {
    if (!known.has(o.capability)) blockers.push(`${o.id}: unknown capability ${o.capability}`)
    if (o.autonomy === 'A3' && o.risk !== 'low') warnings.push(`${o.id}: A3 requires explicit review because risk is ${o.risk}`)
  }

  const tools = validateToolRegistry(TOOLS)
  blockers.push(...tools.errors.map(x => `tool registry: ${x}`))
  blockers.push(...invalidToolLinks().map(x => `stale Learn link: ${x}`))

  const quick = CAPABILITIES.find(c => c.id === 'quick-tools')
  if (!quick) blockers.push('quick-tools capability truth is missing')
  else {
    const routes = new Set(quick.routes)
    if (!routes.has('/tools')) blockers.push('quick-tools capability must include /tools hub')
    for (const slug of Object.keys(TOOLS)) if (!routes.has(`/tools/${slug}`)) blockers.push(`quick-tools product truth missing /tools/${slug}`)
  }

  return { blockers, warnings, ok: blockers.length === 0 }
}
