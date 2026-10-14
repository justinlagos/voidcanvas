/**
 * GEN-A provider policy — central enablement + emergency off-switch.
 * Default-deny: no remote provider runs unless ALL of these hold:
 * 1. The global kill-switch is off (enabled).
 * 2. The provider id is explicitly enabled in config.
 * 3. The provider reports availability (e.g. credentials present).
 *
 * Flags come from server-provided config only. Nothing here reads keys from
 * client bundles, and enabling never happens implicitly.
 */

export interface ProviderPolicy {
  /** Global emergency off-switch. When true, every remote provider refuses. */
  killSwitch: boolean
  /** Explicitly enabled provider ids. Empty = none. */
  enabled: readonly string[]
}

export const DEFAULT_POLICY: ProviderPolicy = Object.freeze({
  killSwitch: false,
  enabled: [],
})

let active: ProviderPolicy = { ...DEFAULT_POLICY }

/** Replace the active policy (server config load, tests). Unknown ids are dropped, never enabled. */
export function setPolicy(next: Partial<ProviderPolicy>): ProviderPolicy {
  active = {
    killSwitch: !!next.killSwitch,
    enabled: Array.isArray(next.enabled) ? next.enabled.filter(e => typeof e === 'string') : [],
  }
  return active
}

export function getPolicy(): ProviderPolicy {
  return { ...active, enabled: [...active.enabled] }
}

export function resetPolicy(): void {
  active = { ...DEFAULT_POLICY }
}

/** Local/mock adapters bypass the kill-switch (no network, no cost). */
export function isProviderAllowed(providerId: string, mock: boolean): { ok: boolean; reason: string | null } {
  if (mock) return { ok: true, reason: null }
  if (active.killSwitch) return { ok: false, reason: 'Generation is switched off (emergency off-switch).' }
  if (!active.enabled.includes(providerId)) {
    return { ok: false, reason: `${providerId} is not enabled. Add it to the server provider policy first.` }
  }
  return { ok: true, reason: null }
}
