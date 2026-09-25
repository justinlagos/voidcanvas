// The "Make Something" machine: every visit gets a different brief.
// Everything here is plain data so the pages, the Editor overlay and the tests share one source.

export type ChallengeKind = 'make' | '60' | 'five' | 'rescue' | 'brief' | 'one-image' | 'psd' | 'remix'

export interface Brief {
  id: string
  /** The dare, in one line. */
  text: string
  /** Seconds on the clock; 0 means no clock. */
  seconds: number
  /** Which starter image to drop in, or 'own' to ask for one first, or 'blank' for an empty board. */
  starter: StarterId | 'own' | 'blank'
}

export type StarterId = 'portrait' | 'receipt' | 'street' | 'product' | 'flat' | 'landscape'

export const BRIEFS: Brief[] = [
  { id: 'no-signal', text: 'Turn this photo into a poster for an imaginary nightclub called NO SIGNAL.', seconds: 90, starter: 'street' },
  { id: 'second-sun', text: 'Make a poster for a fictional record called SECOND SUN.', seconds: 90, starter: 'landscape' },
  { id: 'editorial-70s', text: 'Turn this portrait into a 1970s editorial cover.', seconds: 90, starter: 'portrait' },
  { id: 'expensive', text: 'Make this ugly photo look expensive.', seconds: 60, starter: 'product' },
  { id: 'one-colour', text: 'Make an album cover using only black and one colour.', seconds: 90, starter: 'portrait' },
  { id: 'type-only', text: 'Make a poster using only type.', seconds: 60, starter: 'blank' },
  { id: 'tokyo-2040', text: 'Make something that looks like it belongs in Tokyo in 2040.', seconds: 90, starter: 'street' },
  { id: 'nostalgic', text: 'Make this image feel nostalgic without using a retro filter.', seconds: 60, starter: 'landscape' },
  { id: 'festival', text: 'Make a fake festival poster.', seconds: 90, starter: 'landscape' },
  { id: 'nobody-wants', text: 'Make an advertisement for something nobody wants.', seconds: 90, starter: 'product' },
  { id: 'receipt', text: 'Make a boring receipt beautiful.', seconds: 60, starter: 'receipt' },
  { id: 'weird', text: 'Make it weird. That is the whole brief.', seconds: 60, starter: 'portrait' },
  { id: 'break-fix', text: 'Break this image. Then fix it.', seconds: 90, starter: 'street' },
  { id: 'push', text: 'Push one effect further than is sensible.', seconds: 60, starter: 'landscape' },
  { id: 'three-words', text: 'Add three words. Make them the whole design.', seconds: 60, starter: 'flat' },
  { id: 'quiet', text: 'Make the quietest poster you can.', seconds: 90, starter: 'flat' },
  { id: 'menu', text: 'Turn this into a menu for a restaurant that does not exist.', seconds: 90, starter: 'product' },
  { id: 'warning', text: 'Make a warning sign for a feeling.', seconds: 60, starter: 'blank' },
  { id: 'stamp', text: 'Make a postage stamp from another planet.', seconds: 90, starter: 'landscape' },
  { id: 'wrong', text: 'Crop it wrong on purpose. Make it work.', seconds: 60, starter: 'portrait' },
]

/** Client from hell: the lines that arrive after you thought you were done. */
export const CLIENT_LINES = [
  'Can you make it feel more premium?',
  'Can you make it pop?',
  'Can you make it less blue?',
  'Can we have 14 versions?',
  'Can you make the logo bigger?',
  'Can it be more fun but also serious?',
  'My nephew says the font is wrong.',
  'Can we see it in every colour?',
  'Story size too.',
  'A4 please.',
  'Actually can you make it black?',
  'Just one more version.',
  'Can you make it look like the other one, but different?',
  'Can we add a QR code? Big.',
  'Can you make the white whiter?',
  'The CEO wants it by 5.',
  'Love it. Can we start again?',
  'Can it feel more like a movie?',
  'Make it timeless. And on trend.',
  'Can the text be bigger and also fit?',
]

/** Client from hell: the job that came before the lines. */
export const CLIENT_JOBS = [
  { text: 'A launch poster for an oat milk that tastes of nothing.', starter: 'product' as const },
  { text: 'A recruitment ad for a company that has not decided what it does.', starter: 'flat' as const },
  { text: 'A concert flyer. The band has no name yet.', starter: 'street' as const },
  { text: 'A luxury property listing for a flat with no windows.', starter: 'landscape' as const },
  { text: 'A dating app splash screen. Must feel "trustworthy".', starter: 'portrait' as const },
  { text: 'A wellness brand. The founder likes purple and hates purple.', starter: 'flat' as const },
]

/** One image, ten lives. */
export const DIRECTIONS = [
  { id: 'editorial', name: 'Editorial', hint: 'A magazine cover. Masthead, one line of type, restraint.' },
  { id: 'poster', name: 'Poster', hint: 'Big type, one message, made to be seen from across a street.' },
  { id: 'album', name: 'Album cover', hint: 'Square. A title and an artist. Nothing else needs to make sense.' },
  { id: 'social', name: 'Social', hint: 'Portrait crop, a headline that reads in a second.' },
  { id: 'experimental', name: 'Experimental', hint: 'Stack effects. Break it. Keep the accident.' },
  { id: 'luxury', name: 'Luxury', hint: 'Space, serif, one colour, nothing loud.' },
  { id: 'brutalist', name: 'Brutalist', hint: 'Raw type, hard edges, no decoration, black and white.' },
  { id: 'retro', name: 'Retro', hint: 'Halftone, grain, a palette from a decade you did not live in.' },
  { id: 'minimal', name: 'Minimal', hint: 'Remove things until it stops working. Put one back.' },
  { id: 'stupid', name: 'Completely stupid', hint: 'No rules. Make yourself laugh.' },
]

/** Deterministic pick so the same seed gives the same brief (share links, tests). */
export function pick<T>(list: readonly T[], seed?: number): T {
  const n = list.length
  if (seed === undefined) return list[Math.floor(Math.random() * n)]
  let x = Math.abs(Math.floor(seed)) % 2147483647 || 1
  x = (x * 48271) % 2147483647
  return list[x % n]
}

/** Pick something other than the last one, so "Try another" always changes. */
export function pickNext<T extends { id?: string; text?: string }>(list: readonly T[], last?: T | null): T {
  if (list.length < 2 || !last) return pick(list)
  let next = pick(list)
  for (let i = 0; i < 8 && ((next.id && next.id === last.id) || (next.text && next.text === last.text)); i++) next = pick(list)
  return next
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
