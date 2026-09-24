import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/analytics'

export interface DayRow { dt: string; visitors: number; new_visitors: number; sessions: number; exports: number; started: number; errors: number; feedback: number }
export interface FeedbackRow { id: number; ts: string; mood: 1 | 2 | 3 | null; message: string | null; email: string | null; area: string | null; path: string | null; context: Record<string, any>; status: 'new' | 'read' | 'done' }
export interface Dash {
  days: number
  generated_at: string
  event_counts: Record<string, number>
  event_users: Record<string, number>
  totals: { visitors: number; visitors_prev: number; new_visitors: number; sessions: number; sessions_prev: number; exports: number; exports_prev: number; errors: number; errors_prev: number; feedback: number; median_session_sec: number; all_time_visitors: number; returning_visitors: number }
  today: { visitors: number; sessions: number; exports: number }
  daily: DayRow[]
  funnel: { sessions: number; used_tool: number; made_something: number; exported: number }
  areas: { area: string; sessions: number; visitors: number }[]
  actions: { id: string; n: number; users: number }[]
  effects: { id: string; n: number; users: number }[]
  exports: { format: string; area: string; n: number }[]
  imports: { kind: string; n: number }[]
  ai: { tool: string; n: number; failed: number; median_ms: number | null }[]
  devices: { device: string; n: number }[]
  browsers: { browser: string; os: string; n: number }[]
  timezones: { tz: string; n: number }[]
  referrers: { source: string; n: number }[]
  hours: { dow: number; hour: number; n: number }[]
  errors_top: { msg: string; area: string | null; n: number; users: number; last: string }[]
  retention: { cohort: number; came_back: number; came_back_7d: number }
  feedback_moods: { '1': number; '2': number; '3': number }
  feedback: FeedbackRow[]
}

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Request failed (${r.status})`)
  const j = await r.json()
  if (j && j.error) throw new Error(j.error)
  return j as T
}

export const loadDashboard = (password: string, days: number) => rpc<Dash>('vc_admin_dashboard', { p_password: password, p_days: days })
export const setFeedbackStatus = (password: string, id: number, status: FeedbackRow['status']) => rpc('vc_admin_feedback_status', { p_password: password, p_id: id, p_status: status })
export const changePassword = (password: string, next: string) => rpc('vc_admin_set_password', { p_password: password, p_new: next })

export const pct = (a: number, b: number) => (b > 0 ? a / b : 0)
export const fmtPct = (x: number) => `${Math.round(x * 100)}%`
export function change(cur: number, prev: number): number | null { if (!prev) return cur ? null : 0; return (cur - prev) / prev }

const TZ_PLACE: Record<string, string> = {
  'Africa/Lagos': 'Nigeria (and West/Central Africa)', 'Europe/London': 'UK', 'Africa/Accra': 'Ghana', 'Africa/Nairobi': 'Kenya / East Africa', 'Africa/Johannesburg': 'South Africa',
  'America/New_York': 'US East', 'America/Chicago': 'US Central', 'America/Los_Angeles': 'US West', 'Europe/Paris': 'France', 'Europe/Berlin': 'Germany', 'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India', 'Africa/Cairo': 'Egypt', 'America/Toronto': 'Canada East',
}
export const place = (tz: string) => TZ_PLACE[tz] || tz.replace(/_/g, ' ')

export const AREA_LABEL: Record<string, string> = { home: 'Home page', studio: 'Studio', editor: 'Editor', effects: 'Effects', tools: 'Single tools' }
export const FORMAT_LABEL: Record<string, string> = { png: 'PNG', jpg: 'JPG', jpeg: 'JPG', webp: 'WebP', pdf: 'PDF', zip: 'Boards zip', void: 'Editable .void', clipboard: 'Copied to clipboard', svg: 'SVG', css: 'CSS', json: 'JSON', ase: 'Swatches (ASE)', html: 'HTML' }
export const IMPORT_LABEL: Record<string, string> = { image: 'Image', psd: 'PSD', pdf: 'PDF', void: '.void project', 'from-effects': 'Sent from Effects', 'from-studio': 'Sent from Studio', 'from-editor': 'From Editor', other: 'Other file' }
export const AI_LABEL: Record<string, string> = { 'subject-person': 'Select person / remove background', 'subject-any': 'Select any subject (GPU model)', inpaint: 'Remove object / AI fill' }
