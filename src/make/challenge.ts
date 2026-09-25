// Challenge state: what the person was dared to do, the clock, the click count, and what they made.
// The pages under /make, /60, /five, /rescue, /brief, /one-image and /psd start one; the Editor runs it.
import { create } from 'zustand'
import { BRIEFS, CLIENT_JOBS, CLIENT_LINES, DIRECTIONS, pick, pickNext, type Brief, type ChallengeKind, type StarterId } from './briefs'
import { starterBlob } from './starters'

export interface Challenge {
  kind: ChallengeKind
  /** The dare, shown in the Editor. */
  text: string
  /** Seconds on the clock; 0 means none. */
  seconds: number
  /** Edits allowed before the round ends (the five-click test); 0 means unlimited. */
  clicks: number
  /** Client from hell: messages that arrive while you work. */
  lines?: string[]
  /** One image, ten lives: the directions to work through. */
  directions?: { id: string; name: string; hint: string }[]
  starter?: StarterId | 'own' | 'blank'
  briefId?: string
}

interface ChallengeState {
  active: Challenge | null
  startedAt: number
  /** Edits made since the round started. */
  edits: number
  /** Client lines shown so far. */
  linesShown: number
  /** One image, ten lives: which life is on the board. */
  life: number
  /** Snapshots of finished lives (data URLs), for the end screen. */
  lives: string[]
  /** The round is over and the end screen is up. */
  done: boolean
  begin: (c: Challenge) => void
  end: () => void
  clear: () => void
}

export const useChallenge = create<ChallengeState>((set) => ({
  active: null, startedAt: 0, edits: 0, linesShown: 0, life: 0, lives: [], done: false,
  begin: c => set({ active: c, startedAt: Date.now(), edits: 0, linesShown: 0, life: 0, lives: [], done: false }),
  end: () => set({ done: true }),
  clear: () => set({ active: null, done: false, edits: 0, lives: [], life: 0, linesShown: 0 }),
}))

const LAST_KEY = 'vc-last-brief'

/** Build the challenge for a campaign page. Random where the page is random, fixed where it is not. */
export function buildChallenge(kind: ChallengeKind, opts: { seed?: number; last?: Brief | null; briefId?: string | null } = {}): Challenge {
  const fixed = opts.briefId ? BRIEFS.find(b => b.id === opts.briefId) : undefined
  switch (kind) {
    case 'make': {
      const b = fixed ?? (opts.seed !== undefined ? pick(BRIEFS, opts.seed) : pickNext(BRIEFS, opts.last))
      return { kind, text: b.text, seconds: b.seconds, clicks: 0, starter: b.starter, briefId: b.id }
    }
    case '60': {
      const b = fixed ?? (opts.seed !== undefined ? pick(BRIEFS, opts.seed) : pickNext(BRIEFS, opts.last))
      return { kind, text: b.text, seconds: 60, clicks: 0, starter: b.starter === 'own' ? 'street' : b.starter, briefId: b.id }
    }
    case 'five':
      return { kind, text: 'Make something worth keeping in five clicks.', seconds: 0, clicks: 5, starter: 'landscape' }
    case 'rescue':
      return { kind, text: 'This image is terrible. Please improve it.', seconds: 0, clicks: 0, starter: 'product' }
    case 'brief': {
      const job = pick(CLIENT_JOBS, opts.seed)
      const lines: string[] = []
      while (lines.length < 5) { const l = pick(CLIENT_LINES); if (!lines.includes(l)) lines.push(l) }
      return { kind, text: job.text, seconds: 120, clicks: 0, lines, starter: job.starter }
    }
    case 'one-image':
      return { kind, text: 'One image. Ten lives.', seconds: 0, clicks: 0, directions: DIRECTIONS, starter: 'own' }
    case 'psd':
      return { kind, text: 'Your PSD is not trapped.', seconds: 0, clicks: 0, starter: 'own' }
    case 'remix':
      return { kind, text: 'Make your version.', seconds: 0, clicks: 0, starter: 'own' }
  }
}

/** ?brief=<id> on a campaign page pins the brief (links from posts, tests, screen recordings). */
export function briefFromUrl(): string | null { try { return new URLSearchParams(window.location.search).get('brief') } catch { return null } }

export function rememberBrief(c: Challenge) { try { sessionStorage.setItem(LAST_KEY, c.briefId ?? '') } catch { /* ignore */ } }
export function lastBrief(): Brief | null { try { const id = sessionStorage.getItem(LAST_KEY); return BRIEFS.find(b => b.id === id) ?? null } catch { return null } }

/**
 * Start a challenge: write the starter image and the dare to the Editor's inbox and go there.
 * `own` is the person's image (or PSD) when the page asked for one.
 */
export async function startChallenge(c: Challenge, own?: File | Blob | null): Promise<void> {
  const { sendHandoff } = await import('@/editor/io')
  const { track } = await import('@/lib/analytics')
  track('challenge.start', { kind: c.kind, brief: c.briefId ?? null, seconds: c.seconds, clicks: c.clicks })
  rememberBrief(c)
  const images: { name: string; blob: Blob }[] = []
  const files: { name: string; blob: Blob }[] = []
  if (own) {
    const name = (own as File).name || 'Image'
    if (/\.psd$/i.test(name)) files.push({ name, blob: own }); else images.push({ name, blob: own })
  } else if (c.starter && c.starter !== 'own' && c.starter !== 'blank') {
    images.push({ name: 'Starter', blob: await starterBlob(c.starter) })
  }
  const id = await sendHandoff({ from: 'make', name: nameFor(c), images, files, size: { width: 1080, height: 1350 }, background: c.starter === 'blank' ? '#f2f0ea' : null, challenge: c })
  window.location.assign(`/editor?inbox=${id}`)
}

function nameFor(c: Challenge) {
  const t: Record<ChallengeKind, string> = { make: 'Make something', '60': '60 seconds', five: 'Five clicks', rescue: 'Rescue', brief: 'Client from hell', 'one-image': 'Ten lives', psd: 'From PSD', remix: 'Remix' }
  return t[c.kind]
}

/** Share the result: the OS share sheet when it takes files, else the clipboard, else a download. */
export async function shareBlob(blob: Blob, name: string): Promise<'shared' | 'copied' | 'downloaded'> {
  const file = new File([blob], `${name}.png`, { type: 'image/png' })
  const n = navigator as any
  if (n.share && n.canShare?.({ files: [file] })) {
    try { await n.share({ files: [file], title: name, text: 'Made with Voidcanvas' }); return 'shared' } catch { /* cancelled or refused; fall through */ }
  }
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); return 'copied' } catch { /* no clipboard */ }
  const { downloadBlob } = await import('@/editor/io')
  downloadBlob(blob, `${name}.png`)
  return 'downloaded'
}
