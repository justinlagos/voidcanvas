'use client'

import { useEffect, useState } from 'react'
import { track } from '@/lib/analytics'

// The public pages (landing, Learn, Blog, About, Report a bug) share one dark or light choice.
// The app itself (Editor, Studio, Effects) always stays dark, so the attribute is removed when a public page unmounts.

import { THEME_KEY } from './theme-script'

export function useLpTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(THEME_KEY) } catch { /* private mode */ }
    const t = saved === 'light' ? 'light' : 'dark'
    if (t === 'light') document.documentElement.setAttribute('data-lp-theme', 'light')
    setTheme(t)
    return () => { document.documentElement.removeAttribute('data-lp-theme') }
  }, [])
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') document.documentElement.setAttribute('data-lp-theme', 'light'); else document.documentElement.removeAttribute('data-lp-theme')
    try { localStorage.setItem(THEME_KEY, next) } catch { /* private mode */ }
    track('landing.theme', { theme: next })
  }
  return { theme, flip }
}
