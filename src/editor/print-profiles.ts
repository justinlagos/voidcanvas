export type PrintRegion = 'uk-europe' | 'nigeria' | 'custom'

export interface PrintProfileRecommendation {
  id: string
  region: PrintRegion
  label: string
  profileName: string
  description: string
  preferred: boolean
  maxInk?: number
  /** A recommendation is never enough for conversion: the matching ICC bytes must still be loaded. */
  requiresProfileFile: true
}

/**
 * Starting points only. The printer-supplied ICC profile always wins because paper, press and RIP condition matter
 * more than geography. VoidCanvas never silently converts through a guessed regional profile.
 */
export const PRINT_PROFILE_RECOMMENDATIONS: PrintProfileRecommendation[] = [
  {
    id: 'uk-coated-pso-v3',
    region: 'uk-europe',
    label: 'UK / Europe · coated offset',
    profileName: 'PSO Coated v3 (FOGRA51)',
    description: 'Modern coated-sheet offset starting point. Use the printer’s own ICC when they provide one.',
    preferred: true,
    requiresProfileFile: true,
  },
  {
    id: 'uk-unknown-iso-v2',
    region: 'uk-europe',
    label: 'UK / Europe · printing condition unknown',
    profileName: 'ISO Coated v2 (FOGRA39)',
    description: 'Broad exchange/prepress fallback when the exact coated-print condition is not known.',
    preferred: false,
    requiresProfileFile: true,
  },
  {
    id: 'ng-commercial-iso-v2-300',
    region: 'nigeria',
    label: 'Nigeria · commercial press fallback',
    profileName: 'ISO Coated v2 300% (FOGRA39)',
    description: 'Conservative coated-offset fallback only when the printer cannot supply a profile. Confirm paper, TAC and RIP requirements with the printer.',
    preferred: true,
    maxInk: 300,
    requiresProfileFile: true,
  },
]

export function recommendationsFor(region: PrintRegion) {
  return PRINT_PROFILE_RECOMMENDATIONS.filter(x => x.region === region)
}

export function preferredRecommendation(region: PrintRegion) {
  return recommendationsFor(region).find(x => x.preferred) ?? null
}
