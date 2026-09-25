'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react'
import { Logo } from '@/components/AppNav'
import { track } from '@/lib/analytics'
import { useLpTheme } from './theme'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const SITE_LINKS: [string, string][] = [['/learn', 'Learn'], ['/blog', 'Blog'], ['/about', 'About'], ['/report-a-bug', 'Report a bug']]

/** Header for the public content pages. Same height and ground as the landing page header. */
export function SiteHeader() {
  const path = usePathname() ?? ''
  const { theme, flip } = useLpTheme()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  useEffect(() => { const on = () => setScrolled(scrollY > 8); on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on) }, [])
  useEffect(() => { setMenu(false) }, [path])
  useEffect(() => {
    if (!menu) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    addEventListener('keydown', esc); return () => removeEventListener('keydown', esc)
  }, [menu])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color] duration-300 ${menu ? 'bg-lp-bg border-lp-line' : scrolled ? 'bg-[var(--lp-nav)] border-lp-line' : 'bg-transparent border-transparent'}`}>
      <div className="max-w-[1120px] mx-auto h-12 px-4 sm:px-8 flex items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Site" className="hidden md:flex items-center gap-6 text-[13px] text-lp-dim">
          {SITE_LINKS.map(([href, label]) => {
            const on = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`relative py-1 rounded transition-colors ${on ? 'text-lp-fg' : 'hover:text-lp-fg'} ${focus}`}>
                {label}<span className={`absolute left-0 right-0 -bottom-[13px] h-[2px] rounded-full bg-accent transition-transform duration-300 ${on ? 'scale-x-100' : 'scale-x-0'}`} />
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <button onClick={flip} aria-label={theme === 'dark' ? 'Switch to the light version' : 'Switch to the dark version'} title={theme === 'dark' ? 'Light version' : 'Dark version'} className={`w-9 h-9 rounded-full flex items-center justify-center text-lp-dim hover:text-lp-fg hover:bg-lp-panel ${focus}`}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <Link href="/editor" onClick={() => track('landing.cta', { where: 'site.nav', href: '/editor' })} className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-lp-btn text-lp-btn-fg text-[13px] font-medium hover:bg-lp-btn-hover ${focus}`}>Start designing</Link>
          <button onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-controls="site-menu" aria-label={menu ? 'Close menu' : 'Open menu'} className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center text-lp-fg hover:bg-lp-panel ${focus}`}>{menu ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {menu && (
        <nav id="site-menu" aria-label="Site" className="md:hidden border-t border-lp-line px-4 pb-5 pt-2 animate-[fadein_.2s_ease]">
          <ul className="text-[22px] font-semibold tracking-tight">
            {[['/', 'Home'], ...SITE_LINKS].map(([href, label]) => (
              <li key={href}><Link href={href} className={`flex items-center h-12 rounded-lg ${path === href || (href !== '/' && path.startsWith(href)) ? 'text-lp-fg' : 'text-lp-dim'} ${focus}`}>{label}</Link></li>
            ))}
          </ul>
          <Link href="/editor" onClick={() => track('landing.cta', { where: 'site.menu', href: '/editor' })} className={`mt-3 flex items-center justify-center gap-2 h-12 rounded-full bg-lp-btn text-lp-btn-fg text-[16px] font-medium ${focus}`}>Start designing <ArrowRight size={17} /></Link>
        </nav>
      )}
    </header>
  )
}
