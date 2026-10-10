// The V2 guideline renderer is on for everyone (switched on 10 Oct 2026). One browser can go back to the
// previous renderer with ?brandv2=0 (remembered) and return with ?brandv2=1. Kept while V2 settles;
// remove it together with the previous renderer.

const KEY = 'vc.brandV2'

export function brandV2Enabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const param = new URLSearchParams(window.location.search).get('brandv2')
    if (param === '0') window.localStorage.setItem(KEY, '0')
    if (param === '1') window.localStorage.removeItem(KEY)
    return window.localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}
