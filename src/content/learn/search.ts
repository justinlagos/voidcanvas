// Learn search. Pure functions over the light index, shared by the hub's search box and the unit tests.
// Scoring, per query word (stop words removed, light stemming):
//   whole phrase in the guide's answers  +24    whole phrase in the title  +18
//   word in title +10   word in answers +8   word in summary +4   word in headings/keywords +3
//   a related concept (concepts.ts) in title +5, answers +4, summary +2, terms +1.5
// A guide needs at least half the query words (or their concepts) to match. Cornerstones get a small bonus.
import type { LearnEntry, GoalLite } from './index'
import { STOP, related, stem } from './concepts'

export interface Hit extends LearnEntry { score: number; why: 'answers' | 'title' | 'summary' | 'terms' | 'concept' }

const norm = (s: string) => s.toLowerCase().replace(/[’'"]/g, '').replace(/[^a-z0-9+&\s-]/g, ' ').replace(/\s+/g, ' ').trim()
const wordRe = (w: string) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')

export function tokens(q: string): string[] {
  return Array.from(new Set(norm(q).split(' ').filter(w => w.length > 1 && !STOP.has(w))))
}

function hasWord(hay: string, w: string): boolean {
  if (!w) return false
  if (wordRe(w).test(hay)) return true
  const s = stem(w)
  return s !== w && s.length > 2 && wordRe(s).test(hay)
}

export function searchLearn(q: string, index: LearnEntry[], limit = 8): Hit[] {
  const phrase = norm(q)
  const words = tokens(q)
  if (!words.length) return []
  const need = Math.max(1, Math.ceil(words.length / 2))
  const out: Hit[] = []
  for (const a of index) {
    const title = a.title.toLowerCase(), summary = a.summary.toLowerCase()
    let score = 0, matched = 0
    let why: Hit['why'] = 'terms'
    const bump = (w: Hit['why'], rank: number) => { const order = ['answers', 'title', 'summary', 'terms', 'concept']; if (order.indexOf(w) < order.indexOf(why) || rank === 0) why = w }
    if (phrase.length > 6 && a.answers.includes(phrase)) { score += 24; bump('answers', 0) }
    else if (phrase.length > 6 && title.includes(phrase)) { score += 18; bump('title', 0) }
    for (const w of words) {
      let best = 0
      if (hasWord(title, w)) { best = 10; bump('title', 1) }
      else if (hasWord(a.answers, w)) { best = 8; bump('answers', 1) }
      else if (hasWord(summary, w)) { best = 4; bump('summary', 1) }
      else if (hasWord(a.terms, w)) { best = 3; bump('terms', 1) }
      else {
        for (const r of related(w)) {
          const v = hasWord(title, r) ? 5 : hasWord(a.answers, r) ? 4 : hasWord(summary, r) ? 2 : hasWord(a.terms, r) ? 1.5 : 0
          if (v > best) best = v
        }
        if (best) bump('concept', 1)
      }
      if (best) matched++
      score += best
    }
    if (matched < need) continue
    if (a.role === 'cornerstone') score += 2
    if (matched === words.length && words.length > 1) score += 3
    out.push({ ...a, score, why })
  }
  return out.sort((x, y) => y.score - x.score).slice(0, limit)
}

/** Goals whose name, prompt or example searches match the query. */
export function searchGoals(q: string, goals: GoalLite[], limit = 2): GoalLite[] {
  const words = tokens(q)
  if (!words.length) return []
  const phrase = norm(q)
  return goals.map(g => {
    const hay = `${g.name} ${g.prompt} ${g.blurb}`.toLowerCase()
    let s = 0
    if (phrase.length > 6 && g.queries.includes(phrase)) s += 20
    for (const w of words) {
      if (hasWord(hay, w)) s += 6
      else if (hasWord(g.queries, w)) s += 4
      else for (const r of related(w)) if (hasWord(hay, r) || hasWord(g.queries, r)) { s += 1.5; break }
    }
    return { g, s }
  }).filter(x => x.s >= Math.max(6, words.length * 3)).sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.g)
}
