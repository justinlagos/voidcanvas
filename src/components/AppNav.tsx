'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MODULES = [
  { href: '/studio', label: 'Studio', hint: 'Jobs: direction, formats, sign-off, delivery' },
  { href: '/editor', label: 'Editor', hint: 'Layers, retouching, type' },
  { href: '/effects', label: 'Effects', hint: 'One-click image effects' },
]

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" aria-label="Voidcanvas home">
      <span className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
        <span className="text-void-950 font-bold text-sm tracking-tight">V</span>
      </span>
      {!compact && <span className="hidden sm:block text-[15px] font-semibold tracking-tight">Void<span className="text-void-500">canvas</span></span>}
    </Link>
  )
}

/** The switch between the three modules. Each one works alone, and they pass work to each other. */
export function AppNav() {
  const path = usePathname() ?? ''
  return (
    <nav aria-label="Modules" className="flex items-center rounded-lg bg-void-900 p-0.5 border border-void-800/70">
      {MODULES.map(m => {
        const on = path.startsWith(m.href)
        return (
          <Link
            key={m.href} href={m.href} title={m.hint} aria-current={on ? 'page' : undefined}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-[12px] sm:text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${on ? 'bg-void-700/70 text-white' : 'text-void-400 hover:text-white'}`}
          >
            {m.label}
          </Link>
        )
      })}
    </nav>
  )
}
