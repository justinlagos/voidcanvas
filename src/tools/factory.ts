import type { Metadata } from 'next'
import type { ToolDef } from './ToolPage'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface ToolValidationResult {
  ok: boolean
  errors: string[]
}

export function validateToolDef(def: ToolDef): ToolValidationResult {
  const errors: string[] = []
  if (!SLUG.test(def.slug)) errors.push('slug must be lower-case kebab-case')
  if (def.name.trim().length < 6) errors.push('name is too short')
  if (def.tagline.trim().length < 24) errors.push('tagline is too short to explain the job')
  if (def.about.trim().length < 120) errors.push('about copy must explain the effect, use case and privacy')
  if (!Array.isArray(def.faqs) || def.faqs.length < 2) errors.push('at least two FAQs are required')
  if (def.faqs.some(f => f.q.trim().length < 8 || f.a.trim().length < 24)) errors.push('FAQ questions and answers must be substantive')
  const joined = `${def.tagline} ${def.about} ${def.faqs.map(f => `${f.q} ${f.a}`).join(' ')}`.toLowerCase()
  if (!/browser|device|local/.test(joined)) errors.push('copy must explain local/browser processing')
  if (!/editor/.test(joined)) errors.push('copy must contain a continuation path into the Editor')
  return { ok: errors.length === 0, errors }
}

export function validateToolRegistry(tools: Record<string, ToolDef>): ToolValidationResult {
  const errors: string[] = []
  const slugs = new Set<string>()
  for (const [key, def] of Object.entries(tools)) {
    if (key !== def.slug) errors.push(`${key}: registry key must equal slug ${def.slug}`)
    if (slugs.has(def.slug)) errors.push(`${key}: duplicate slug ${def.slug}`)
    slugs.add(def.slug)
    const r = validateToolDef(def)
    errors.push(...r.errors.map(e => `${key}: ${e}`))
  }
  return { ok: errors.length === 0, errors }
}

export function metadataForTool(def: ToolDef): Metadata {
  return {
    title: `${def.name} — free, private browser tool · Voidcanvas`,
    description: def.tagline,
    alternates: { canonical: `/tools/${def.slug}` },
    openGraph: {
      title: `${def.name} · Voidcanvas`,
      description: def.tagline,
      url: `/tools/${def.slug}`,
      type: 'website',
    },
  }
}

/** Related links are generated from the registry instead of a manually maintained list. */
export function relatedTools(tools: Record<string, ToolDef>, current: string, limit = 4) {
  return Object.values(tools).filter(t => t.slug !== current).slice(0, Math.max(0, limit)).map(t => ({ slug: t.slug, name: t.name.replace(/\s+(Image\s+)?Generator$/i, '') }))
}
