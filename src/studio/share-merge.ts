// Comments, replies and decisions from a review link, folded into the version they belong to.
// Pure, so the same events can arrive twice (two devices, a retry) without doubling anything.

import type { ShareEvent } from '@/lib/share'
import type { Pin, Version } from './jobs'

export function applyShareEvents(v: Version, events: ShareEvent[]): Version {
  if (!v.share || !events.length) return v
  const pins: Record<string, Pin[]> = Object.fromEntries(Object.entries(v.pins).map(([k, list]) => [k, list.map(p => ({ ...p, replies: p.replies ? [...p.replies] : undefined }))]))
  let status = v.status, decision = v.decision ?? null, todo = v.todo, seen = v.share.seen ?? 0
  const find = (id: string) => { for (const list of Object.values(pins)) { const p = list.find(x => x.id === id); if (p) return p } return null }
  for (const e of events) {
    seen = Math.max(seen, e.eid)
    const at = Date.parse(e.at) || Date.now()
    const by = e.team ? 'Designer' : clip(e.by || 'Client', 60)
    if (e.t === 'pin') {
      if (find(e.id) || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue
      const k = String(Math.max(0, Math.floor(e.img) || 0))
      pins[k] = [...(pins[k] ?? []), { id: e.id, x: clamp01(e.x), y: clamp01(e.y), text: clip(e.text, 2000), done: false, at, by, shared: true, replies: [] }]
    } else if (e.t === 'reply') {
      const p = find(e.pin); if (!p || p.replies?.some(r => r.id === e.id)) continue
      p.replies = [...(p.replies ?? []), { id: e.id, by, text: clip(e.text, 2000), at, team: e.team }]
    } else if (e.t === 'done') {
      const p = find(e.pin); if (p) p.done = !!e.done
    } else if (e.t === 'decision') {
      if (decision && decision.at > at) continue
      decision = { value: e.value === 'approved' ? 'approved' : 'changes', note: clip(e.note, 2000), by, at }
      status = decision.value
      if (decision.value === 'changes' && decision.note.trim() && !todo.some(t => t.id === e.id)) todo = [...todo, { id: e.id, text: `${by}: ${decision.note}`, done: false }]
    }
  }
  return { ...v, pins, status, decision, todo, share: { ...v.share, seen } }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n)
