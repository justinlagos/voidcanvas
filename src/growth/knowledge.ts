export type GrowthRisk = 'low' | 'medium' | 'high'

export interface CapabilityTruth {
  id: string
  label: string
  summary: string
  routes: string[]
  advantages: string[]
  risk: GrowthRisk
  claimNotes?: string[]
}

/**
 * Canonical product truths for owned growth surfaces.
 * Keep this intentionally conservative: marketing copy may simplify these
 * statements but must not claim capabilities that are not represented here.
 */
export const CAPABILITIES: CapabilityTruth[] = [
  {
    id: 'local-first',
    label: 'Private, local-first editing',
    summary: 'Core editing happens in the browser and project data is stored on the user\'s device unless they deliberately use a sharing or connected feature.',
    routes: ['/', '/editor', '/effects', '/tools'],
    advantages: ['no mandatory account for core work', 'creative files do not need to be uploaded for core editing'],
    risk: 'medium',
    claimNotes: ['Avoid absolute privacy claims for future cloud/share features; describe the specific workflow being discussed.'],
  },
  {
    id: 'cascade',
    label: 'Cascade multi-format production',
    summary: 'A board can be adapted into multiple selected output formats from one working design.',
    routes: ['/editor'],
    advantages: ['campaign-production wedge', 'agency and social-production relevance', 'high demonstration value'],
    risk: 'low',
  },
  {
    id: 'void-format',
    label: '.void editable project format',
    summary: 'VoidCanvas can save a complete editable project as a portable .void file.',
    routes: ['/editor'],
    advantages: ['portable editable artefact', 'user ownership', 'future sharing primitive'],
    risk: 'low',
  },
  {
    id: 'void-png',
    label: 'Editable .void.png',
    summary: 'VoidCanvas can export a PNG preview that also carries the editable VoidCanvas project data.',
    routes: ['/editor'],
    advantages: ['shareable preview plus editable source', 'novel distribution primitive'],
    risk: 'low',
    claimNotes: ['Editing the PNG in another app may strip embedded project data.'],
  },
  {
    id: 'quick-tools',
    label: 'Single-purpose browser tools',
    summary: 'Dedicated tool pages provide focused image effects with immediate controls, local processing, download and a route into the full editor.',
    routes: ['/tools', '/tools/halftone', '/tools/dither', '/tools/glitch', '/tools/grain', '/tools/pixel-sort'],
    advantages: ['search acquisition', 'low-friction first value', 'natural editor handoff'],
    risk: 'low',
  },
  {
    id: 'professional-editor',
    label: 'Layered professional editor',
    summary: 'The editor supports layered image, text, shape and adjustment workflows with masks, blend modes, selections, retouching, filters and professional layout controls.',
    routes: ['/editor'],
    advantages: ['professional trust', 'browser-editor positioning', 'workflow depth'],
    risk: 'medium',
    claimNotes: ['Do not claim full Photoshop parity. Capability-specific pages should state exact support.'],
  },
  {
    id: 'psd-import',
    label: 'PSD import',
    summary: 'VoidCanvas imports PSD documents and preserves supported layered structure and editable properties while reporting unsupported or rasterised content.',
    routes: ['/editor'],
    advantages: ['migration/discovery wedge', 'professional workflow relevance'],
    risk: 'medium',
    claimNotes: ['Never imply perfect PSD fidelity or support for every Photoshop feature.'],
  },
  {
    id: 'brand-system',
    label: 'Brand guideline builder',
    summary: 'VoidCanvas can build and export a structured brand system including colour, typography, logo-use guidance and developer handoff formats.',
    routes: ['/studio', '/brand'],
    advantages: ['brand-designer acquisition', 'shareable handoff opportunity'],
    risk: 'low',
  },
  {
    id: 'shared-work',
    label: 'Encrypted review and delivery links',
    summary: 'VoidCanvas can share work for client review or delivery through links whose content is decrypted in the recipient browser.',
    routes: ['/s'],
    advantages: ['product-led referral surface', 'client and collaborator exposure', 'delivery workflow proof'],
    risk: 'medium',
    claimNotes: ['Do not expose share-link fragments, decrypted manifests, comments, filenames or file contents to growth instrumentation.'],
  },
  {
    id: 'open-gateway',
    label: 'Open in Voidcanvas gateway',
    summary: 'A stable VoidCanvas-owned redirect maps approved partner links to known internal product destinations with canonical attribution.',
    routes: ['/open'],
    advantages: ['resource-site integration', 'education and creator distribution', 'stable integration contract'],
    risk: 'low',
    claimNotes: ['Version 1 does not fetch or import a remote asset and must never become an arbitrary external redirect.'],
  },
]

export const capabilityById = (id: string) => CAPABILITIES.find(c => c.id === id)
