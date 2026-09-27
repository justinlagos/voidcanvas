'use client'

// Loads an interactive example only on the page that uses it, so text-only guides stay as light as they are.
import dynamic from 'next/dynamic'
import type { DemoKind } from '@/content/types'

const Loading = () => <div className="not-prose rounded-[24px] border border-lp-line bg-lp-card min-h-[280px] flex items-center justify-center text-[13px] text-lp-dim" aria-busy>Loading the example…</div>

const EffectDemo = dynamic(() => import('./EffectDemo'), { ssr: false, loading: Loading })
const PrintSetupDemo = dynamic(() => import('./PrintSetupDemo'), { ssr: false, loading: Loading })
const SizeCalculator = dynamic(() => import('./SizeCalculator'), { ssr: false, loading: Loading })
const TypeScaleDemo = dynamic(() => import('./TypeScaleDemo'), { ssr: false, loading: Loading })
const BeforeAfter = dynamic(() => import('./BeforeAfter'), { ssr: false, loading: Loading })
const SafeZonesDemo = dynamic(() => import('./SafeZonesDemo'), { ssr: false, loading: Loading })

export function Demo({ kind, effect, caption, before, after, alt }: { kind: DemoKind; effect?: string; caption?: string; before?: string; after?: string; alt?: string }) {
  switch (kind) {
    case 'effect': return <EffectDemo effect={effect ?? 'halftone'} caption={caption} />
    case 'print-setup': return <PrintSetupDemo caption={caption} />
    case 'size-calculator': return <SizeCalculator caption={caption} />
    case 'type-scale': return <TypeScaleDemo caption={caption} />
    case 'before-after': return before && after ? <BeforeAfter before={before} after={after} alt={alt} caption={caption} /> : null
    case 'safe-zones': return <SafeZonesDemo caption={caption} />
  }
}
