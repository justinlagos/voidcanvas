'use client'

import { useEffect } from 'react'

/** Registers the offline service worker in production. */
export function Pwa() {
  useEffect(() => {
    // The desktop app serves its own files offline; it has no use for a service worker.
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DESKTOP || !('serviceWorker' in navigator)) return
    const go = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true })
  }, [])
  return null
}
