'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'
import { readExperiment } from './attribution'

const PREFIX = 'vc-exp-seen:'

/**
 * Records an experiment exposure through the existing privacy-safe analytics
 * pipeline. `track()` still applies the normal DNT/GPC/private-session/crawler
 * rules and holds the event until real human input.
 */
export function ExperimentCapture() {
  const search = useSearchParams()
  const key = search.toString()

  useEffect(() => {
    const { experiment, variant } = readExperiment(`?${key}`)
    if (!experiment || !variant) return
    const seen = `${PREFIX}${experiment}:${variant}`
    try {
      if (sessionStorage.getItem(seen) === '1') return
      sessionStorage.setItem(seen, '1')
    } catch { /* analytics itself still deduplicates by normal session limits */ }
    track('experiment.view', { experiment, variant })
  }, [key])

  return null
}
