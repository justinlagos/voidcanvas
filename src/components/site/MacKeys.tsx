'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Learn writes shortcuts the Windows way. On a Mac, show the keys that are actually on the keyboard.
const MAC: Record<string, string> = { Ctrl: '⌘ Cmd', Alt: '⌥ Option' }

export function MacKeys() {
  const path = usePathname()
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) return
    document.querySelectorAll<HTMLElement>('kbd[data-k]').forEach(k => { const m = MAC[k.dataset.k!]; if (m) k.textContent = m })
  }, [path])
  return null
}
