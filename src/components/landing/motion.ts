// Scripted product demonstrations for the landing page. Each scene is one looping timeline; every element in it
// is given a class whose keyframes are generated here from seconds on that timeline, so a whole scene stays in
// sync from one shared clock. Only opacity, transform, clip-path and filter are animated (cheap to composite).
// Scenes run only while `.lp-play` is on an ancestor (the panel is on screen) and collapse to their finished
// state when the person prefers reduced motion.

type Step = { at: [number, number]; from?: string; to?: string; ease?: string; loop?: number; rest?: string }

const pct = (t: number, loop: number) => `${Math.max(0, Math.min(100, (t / loop) * 100)).toFixed(3)}%`

/** One keyframe rule. `from` is the state before/after, `to` the state while the step holds. */
function frames(name: string, s: Step, loop: number, d: number) {
  const from = s.from ?? 'opacity:0;transform:translateY(0.6cqw)'
  const to = s.to ?? 'opacity:1;transform:none'
  const [t0, t1] = s.at
  const ease = s.ease ? `animation-timing-function:${s.ease};` : ''
  const parts = [`0%{${from}}`, `${pct(t0, loop)}{${from};${ease}}`, `${pct(t0 + d, loop)}{${to}}`]
  if (t1 < loop) { parts.push(`${pct(t1, loop)}{${to}}`, `${pct(t1 + d, loop)}{${from}}`) }
  parts.push(`100%{${t1 < loop ? from : to}}`)
  return `@keyframes ${name}{${parts.join('')}}`
}

export class Scene {
  private css: string[] = []
  private names = new Set<string>()
  constructor(public id: string, public loop: number) {}

  /** Visible from `at[0]` to `at[1]` seconds; entering and leaving over `d` seconds. Returns the class name. */
  show(key: string, at: [number, number], opts: Partial<Step> & { d?: number; final?: 'shown' | 'hidden' } = {}) {
    const name = `${this.id}-${key}`
    if (this.names.has(name)) return name
    this.names.add(name)
    const d = opts.d ?? 0.45
    const s: Step = { at, from: opts.from, to: opts.to, ease: opts.ease }
    // Under reduced motion the element sits in its finished state: shown, unless it is a transient (caret, toast).
    const final = opts.final ?? 'shown'
    const rest = final === 'shown' ? (s.to ?? 'opacity:1;transform:none') : (s.from ?? 'opacity:0')
    this.css.push(frames(name, s, this.loop, d), `.${name}{animation:${name} ${this.loop}s linear infinite;animation-play-state:paused}`, `@media (prefers-reduced-motion:reduce){.${name}{animation:none;${rest}}}`)
    return name
  }

  /** Tween between two states from `at[0]` to `at[1]`, then hold `to` until `until` (default: end of loop). */
  tween(key: string, at: [number, number], from: string, to: string, opts: { ease?: string; until?: number; rest?: string } = {}) {
    const name = `${this.id}-${key}`
    if (this.names.has(name)) return name
    this.names.add(name)
    const [t0, t1] = at
    const until = opts.until ?? this.loop
    const ease = opts.ease ? `animation-timing-function:${opts.ease};` : ''
    const parts = [`0%{${from}}`, `${pct(t0, this.loop)}{${from};${ease}}`, `${pct(t1, this.loop)}{${to}}`]
    if (until < this.loop) parts.push(`${pct(until, this.loop)}{${to}}`, `${pct(Math.min(this.loop, until + 0.4), this.loop)}{${from}}`, `100%{${from}}`)
    else parts.push(`100%{${to}}`)
    this.css.push(`@keyframes ${name}{${parts.join('')}}`, `.${name}{animation:${name} ${this.loop}s linear infinite;animation-play-state:paused}`, `@media (prefers-reduced-motion:reduce){.${name}{animation:none;${opts.rest ?? to}}}`)
    return name
  }

  /** The style text for this scene. Render it once, inside the frame. */
  style() { return this.css.join('\n') + `\n.lp-play .${this.id}-root [class*=${this.id}-]{animation-play-state:running}` }
}
