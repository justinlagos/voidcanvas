// The V2 guideline renderer stays off for designers until Phase 2 passes its release gates.
// It can be switched on in one browser with ?brandv2=1 (remembered) and off again with ?brandv2=0.

const KEY = 'vc.brandV2'

export function brandV2Enabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const param = new URLSearchParams(window.location.search).get('brandv2')
    if (param === '1') window.localStorage.setItem(KEY, '1')
    if (param === '0') window.localStorage.removeItem(KEY)
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
