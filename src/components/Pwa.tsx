'use client'

import { useEffect } from 'react'

/** Registers the offline service worker in production. */
export function Pwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const go = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true })
  }, [])
  return null
}
