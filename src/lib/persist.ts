// Ask the browser to keep this site's storage, so saved designs are not cleared when space runs low
// or, on Safari, after a few weeks without a visit. Chrome and Safari decide without asking the person;
// Firefox shows a prompt. We ask at most once a day per device, and never in a private session.

const KEY = 'vc-persist-asked'
const DAY = 24 * 60 * 60 * 1000
let inFlight: Promise<boolean | null> | null = null

export function persistSupported() {
  return typeof navigator !== 'undefined' && !!navigator.storage?.persist
}

export async function isPersisted(): Promise<boolean | null> {
  if (!persistSupported()) return null
  try { return await navigator.storage.persisted() } catch { return null }
}

/** Ask for protected storage if we do not have it. Safe to call often. */
export function ensurePersistentStorage(): Promise<boolean | null> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    if (!persistSupported()) return null
    if (await isPersisted()) return true
    try {
      const last = Number(localStorage.getItem(KEY) || 0)
      if (Date.now() - last < DAY) return false
      localStorage.setItem(KEY, String(Date.now()))
    } catch { /* storage blocked: still try once this page load */ }
    try { return await navigator.storage.persist() } catch { return false }
  })()
  return inFlight
}

export interface StorageStatus { persisted: boolean | null; usage?: number; quota?: number }

export async function storageStatus(): Promise<StorageStatus> {
  const persisted = await isPersisted()
  try {
    const e = await navigator.storage?.estimate?.()
    return { persisted, usage: e?.usage, quota: e?.quota }
  } catch { return { persisted } }
}

export function formatBytes(n?: number) {
  if (n == null) return ''
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}
