'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { track } from '@/lib/analytics'
import { buildGrowthUrl } from './attribution'

const href = buildGrowthUrl('/editor', {
  source: 'void-share',
  medium: 'product-loop',
  campaign: 'shared-work',
  content: 'share-page-cta',
})

/**
 * A deliberately separate growth layer for encrypted review/delivery pages.
 * It never reads the share URL fragment, manifest, comments, filenames or file
 * contents. Removing this component cannot affect the sharing workflow.
 */
export function ShareAcquisitionCTA() {
  const path = usePathname()
  if (path !== '/s') return null

  return (
    <aside className="fixed right-3 bottom-3 z-[90] max-w-[260px] rounded-xl border border-white/10 bg-[#15151b]/95 backdrop-blur px-3.5 py-3 text-[#ececf1] shadow-2xl shadow-black/30">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#8e8ea0]">Made and shared with Voidcanvas</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#c9c9d4]">Design, review and deliver work from the browser.</p>
      <Link
        href={href}
        onClick={() => track('share.product_cta', { to: 'editor', placement: 'share-page' })}
        className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white hover:text-[#bcb5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b7cff] rounded"
      >
        Open Voidcanvas <ArrowUpRight size={13} />
      </Link>
    </aside>
  )
}
