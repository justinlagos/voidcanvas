import { AI_LABEL, AREA_LABEL, change, fmtPct, pct, place, type Dash } from './data'

export type Tone = 'good' | 'warn' | 'bad' | 'info'
export interface Insight { tone: Tone; title: string; detail: string; weight: number }

const DAYS = ['', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays']
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`

/**
 * Plain-English findings from the numbers, ranked by how much they should change what gets built next.
 * Rules are simple on purpose so each one can be checked against the charts below it.
 */
export function buildInsights(d: Dash, labels: Record<string, string>): Insight[] {
  const out: Insight[] = []
  const t = d.totals, f = d.funnel
  const period = d.days === 1 ? 'today' : `the last ${d.days} days`
  const prevPeriod = d.days === 1 ? 'yesterday' : `the ${d.days} days before`

  if (f.sessions < 30) out.push({ tone: 'info', weight: 100, title: 'Still early data', detail: `${f.sessions} visit${f.sessions === 1 ? '' : 's'} so far in ${period}. Treat the findings below as hints until there are at least 50 visits.` })

  // Growth
  const vc = change(t.visitors, t.visitors_prev)
  if (vc !== null && t.visitors_prev >= 10 && Math.abs(vc) >= 0.2) out.push({ tone: vc > 0 ? 'good' : 'warn', weight: 60 + Math.min(30, Math.abs(vc) * 30), title: `Visitors ${vc > 0 ? 'up' : 'down'} ${fmtPct(Math.abs(vc))}`, detail: `${t.visitors} people in ${period} against ${t.visitors_prev} in ${prevPeriod}. ${vc > 0 ? 'Check Where people come from to see what drove it, and do more of that.' : 'Check Where people come from for a source that dried up.'}` })

  // Funnel: biggest drop
  if (f.sessions >= 10) {
    const steps = [
      { from: 'arrived', to: 'opened a tool', a: f.sessions, b: f.used_tool, fix: 'The home page is not moving people into a tool. Make the first click more obvious or send links straight to /editor or /effects.' },
      { from: 'opened a tool', to: 'started a design or loaded an image', a: f.used_tool, b: f.made_something, fix: 'People look but do not start. Make the empty state do the work: a sample image, templates, or drag and drop that is impossible to miss.' },
      { from: 'started', to: 'exported', a: f.made_something, b: f.exported, fix: 'People start but do not finish. Look at errors, the export dialog, and feedback marked Not good for what stops them.' },
    ].filter(s => s.a >= 5)
    if (steps.length) {
      const worst = steps.reduce((m, s) => (pct(s.b, s.a) < pct(m.b, m.a) ? s : m))
      const lost = 1 - pct(worst.b, worst.a)
      out.push({ tone: lost > 0.6 ? 'bad' : lost > 0.4 ? 'warn' : 'good', weight: 85, title: `Biggest drop: ${fmtPct(lost)} leave between "${worst.from}" and "${worst.to}"`, detail: lost > 0.4 ? worst.fix : 'No step loses most people. Growth will come from more visitors rather than fixing the flow.' })
    }
    const conv = pct(f.exported, f.sessions)
    out.push({ tone: conv >= 0.2 ? 'good' : conv >= 0.08 ? 'info' : 'warn', weight: 70, title: `${fmtPct(conv)} of visits end with an export`, detail: 'This is the number that says Voidcanvas did its job. Watch it after every release; a drop means something broke or got harder.' })
  }

  // Retention
  if (d.retention.cohort >= 15) {
    const r = pct(d.retention.came_back, d.retention.cohort)
    out.push({ tone: r >= 0.25 ? 'good' : r >= 0.12 ? 'info' : 'warn', weight: 65, title: `${fmtPct(r)} of new visitors came back on another day`, detail: r < 0.12 ? 'Most people try it once. Give them a reason to return: saved projects on the start screen, installing the app, or a follow-up after export.' : 'People are returning. Ask returning users what they come back for.' })
  }

  // Devices
  const devTotal = d.devices.reduce((s, x) => s + x.n, 0)
  const mobile = d.devices.filter(x => x.device === 'mobile').reduce((s, x) => s + x.n, 0)
  if (devTotal >= 10 && mobile / devTotal >= 0.35) out.push({ tone: 'warn', weight: 72, title: `${fmtPct(mobile / devTotal)} use a phone`, detail: 'A big share of people are on small screens. Test the Editor and Effects on a mid-range Android phone before building more desktop features.' })

  // Audience
  const tzTotal = d.timezones.reduce((s, x) => s + x.n, 0)
  if (tzTotal >= 10 && d.timezones[0]) {
    const top = d.timezones[0]
    out.push({ tone: 'info', weight: 40, title: `Largest group: ${place(top.tz)} (${fmtPct(top.n / tzTotal)})`, detail: 'Based on device time zone, not location tracking. Use it to choose examples, templates and fonts that fit this audience.' })
  }

  // Busiest time
  if (d.hours.length && f.sessions >= 20) {
    const best = d.hours.reduce((m, h) => (h.n > m.n ? h : m))
    out.push({ tone: 'info', weight: 30, title: `Busiest time: ${DAYS[best.dow]} around ${hourLabel(best.hour)} (Lagos time)`, detail: 'Post updates and ship releases shortly before this so the most people see them working.' })
  }

  // Errors
  const errUsers = d.event_users['error'] || 0
  const users = t.visitors || 1
  if (t.errors > 0) {
    const share = errUsers / users
    const top = d.errors_top[0]
    out.push({ tone: share > 0.1 ? 'bad' : share > 0.03 ? 'warn' : 'info', weight: share > 0.1 ? 95 : 55, title: `${fmtPct(share)} of people hit an error`, detail: top ? `Most common: "${top.msg}" (${top.users} ${top.users === 1 ? 'person' : 'people'}, ${AREA_LABEL[top.area || ''] || top.area || 'unknown area'}). Fix this first.` : 'See the Errors table.' })
  }
  const failedExports = d.event_counts['export.failed'] || 0
  if (failedExports >= 3) out.push({ tone: 'bad', weight: 90, title: `${failedExports} exports failed`, detail: 'People finished a design and could not get it out. Check which sizes fail; big canvases on phones run out of memory.' })

  // AI
  for (const a of d.ai) {
    if (a.n < 5) continue
    const fail = pct(a.failed, a.n)
    const secs = (a.median_ms || 0) / 1000
    if (fail > 0.15) out.push({ tone: 'bad', weight: 75, title: `${AI_LABEL[a.tool] || a.tool} fails ${fmtPct(fail)} of the time`, detail: 'Usually the model could not download or the device ran out of memory. Offer the simpler fallback sooner and show a clearer message.' })
    else if (secs > 12) out.push({ tone: 'warn', weight: 50, title: `${AI_LABEL[a.tool] || a.tool} takes ${Math.round(secs)}s on a typical device`, detail: 'Slow enough that people may give up. Consider a smaller model on phones, or process at a lower resolution first.' })
  }
  const declined = d.event_counts['ai.declined'] || 0, dl = d.event_counts['ai.download'] || 0
  if (declined + dl >= 5 && declined / (declined + dl) > 0.4) out.push({ tone: 'warn', weight: 58, title: `${fmtPct(declined / (declined + dl))} say no to the AI model download`, detail: 'The download size is putting people off, likely on mobile data. Show the size in MB earlier and offer a smaller model.' })

  // Features
  const areaTotal = d.areas.reduce((s, a) => s + a.sessions, 0)
  const tools = d.areas.filter(a => a.area !== 'home')
  if (areaTotal >= 20 && tools.length) {
    const top = tools[0]
    const low = tools[tools.length - 1]
    out.push({ tone: 'info', weight: 45, title: `${AREA_LABEL[top.area] || top.area} is the most used part`, detail: `${top.sessions} visits${low && low !== top ? ` against ${low.sessions} for ${AREA_LABEL[low.area] || low.area}` : ''}. Put the next round of polish where people already are.` })
  }
  if (d.actions.length >= 5) {
    const a = d.actions[0]
    out.push({ tone: 'info', weight: 35, title: `Most used command: ${labels[a.id] || a.id}`, detail: `${a.n} times by ${a.users} ${a.users === 1 ? 'person' : 'people'}. Make sure it has a shortcut and sits where it is easy to reach.` })
  }
  const known = Object.keys(labels)
  if (known.length && f.sessions >= 50) {
    const used = new Set(d.actions.map(a => a.id))
    const unused = known.filter(k => !used.has(k) && !/^(scale|density|ws|panel|fx)\./.test(k))
    if (unused.length > 20) out.push({ tone: 'info', weight: 25, title: `${unused.length} menu commands were never used`, detail: 'Nobody reached for them in this period. Before building more features, check whether these are hard to find or not needed. The full list is under Commands.' })
  }

  // Feedback
  const m = d.feedback_moods, mt = m['1'] + m['2'] + m['3']
  if (mt >= 5) {
    const bad = m['1'] / mt
    out.push({ tone: bad > 0.3 ? 'bad' : m['3'] / mt > 0.6 ? 'good' : 'info', weight: bad > 0.3 ? 80 : 50, title: `${fmtPct(m['3'] / mt)} of ratings say Love it, ${fmtPct(bad)} say Not good`, detail: bad > 0.3 ? 'Read the Not good messages below. They usually name the exact thing to fix.' : 'Sentiment is healthy. Ask happy users to share the link.' })
  }
  const unread = d.feedback.filter(x => x.status === 'new').length
  if (unread) out.push({ tone: 'info', weight: 20, title: `${unread} new feedback message${unread === 1 ? '' : 's'} to read`, detail: 'Scroll to Feedback. Mark each one Read or Done so this stays useful.' })

  const opened = d.event_counts['feedback.open'] || 0, sent = d.event_counts['feedback.sent'] || 0
  if (opened >= 10 && sent / opened < 0.3) out.push({ tone: 'warn', weight: 22, title: 'Most people close the feedback box without sending', detail: `${sent} sent out of ${opened} opened. Keep it to the three faces; the text box is optional.` })

  return out.sort((a, b) => b.weight - a.weight)
}
