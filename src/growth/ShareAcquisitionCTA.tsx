'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { track } from '@/lib/analytics'
import { buildGrowthUrl } from './attribution'

const campaign = {
  source: 'void-share' as const,
  medium: 'product-loop',
  campaign: 'shared-work',
  content: 'share-page-cta',
}
const href = buildGrowthUrl('/editor', campaign)

/**
 * A deliberately separate growth layer for encrypted review/delivery pages.
 * It never reads the share URL fragment, manifest, comments, filenames or file
 * contents. Removing this component cannot affect the sharing workflow.
 */
export function ShareAcquisitionCTA() {
  const path = usePathname()
  if (path !== '/s') return null

  const touch = () => {
    // `growth.touch` handles same-session assisted attribution. The UTM query on
    // the destination still covers visits that become a new analytics session.
    track('growth.touch', { ...campaign, to: '/editor' })
    track('share.product_cta', { to: 'editor', placement: 'share-page' })
  }

  return (
    <aside className="fixed right-3 bottom-3 z-[90] rounded-full border border-white/10 bg-[#15151b]/95 backdrop-blur px-3 py-2 text-[#ececf1] shadow-xl shadow-black/25">
      <Link
        href={href}
        onClick={touch}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#d9d9e2] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b7cff] rounded"
        aria-label="Open Voidcanvas. This shared work was made and delivered with Voidcanvas."
      >
        <span className="text-[#8e8ea0]">Made with</span> Voidcanvas <ArrowUpRight size={12} />
      </Link>
    </aside>
  )
}
