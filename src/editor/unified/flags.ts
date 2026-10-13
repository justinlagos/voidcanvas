// Sprint B vertical slice flags. Off by default; enable per-browser with
// ?unified=1 (remembered). Docs-only Sprint A changed nothing; Sprint B runtime
// stays inert unless explicitly enabled, so production is unaffected.
const KEY = 'vc.unified'
export function unifiedEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const p = new URLSearchParams(window.location.search).get('unified')
    if (p === '1') window.localStorage.setItem(KEY, '1')
    if (p === '0') window.localStorage.removeItem(KEY)
    return window.localStorage.getItem(KEY) === '1'
  } catch { return false }
}
export function unifiedSnapshot(): { enabled: boolean } { return { enabled: unifiedEnabled() } }
