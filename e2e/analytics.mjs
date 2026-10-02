// Analytics: what is sent, and what never is. Every request to the events and feedback tables is caught here and
// never reaches Supabase. Counting is off on localhost unless `vc-usage-dev` is set, and off in automated browsers
// (this one included) unless `vc-usage-test` is set, so each check sets exactly the switches it needs.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const wait = ms => new Promise(r => setTimeout(r, ms))

async function open(flags) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const rows = []
  await ctx.route('**/rest/v1/events', async r => { try { rows.push(...JSON.parse(r.request().postData() || '[]')) } catch { /* ignore */ } await r.fulfill({ status: 201, body: '' }) })
  await ctx.route('**/rest/v1/feedback', r => r.fulfill({ status: 201, body: '' }))
  await ctx.addInitScript(f => { for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v) }, flags)
  const p = await ctx.newPage()
  return { ctx, p, rows }
}
const named = (rows, n) => rows.filter(r => r.name === n)
const leave = p => p.evaluate(() => dispatchEvent(new Event('pagehide')))
const E = (p, f, a) => p.evaluate(f, a)

// 1. An automated browser sends nothing, even with counting allowed on localhost.
{
  const { ctx, p, rows } = await open({ 'vc-usage-dev': '1' })
  await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
  await p.mouse.move(300, 300); await p.mouse.move(400, 300)
  await p.getByText('Instagram post', { exact: true }).click(); await wait(800)
  await leave(p); await wait(800)
  ok('automated: a test browser sends nothing', rows.length === 0, `${rows.length} rows`)
  await ctx.close()
}

// 2 to 13 run as a person would, with the test switch on.
const { ctx, p, rows } = await open({ 'vc-usage-dev': '1', 'vc-usage-test': '1' })
const pageErrors = []; p.on('pageerror', e => { if (!/vc-e2e-check/.test(e.message)) pageErrors.push(e.message) })

// 2. A page nobody touches sends nothing, even when it is left.
await p.goto(`${BASE}/about`); await wait(4000)
ok('crawlers: nothing is sent before any input', rows.length === 0, `${rows.length} rows: ${rows.map(r => r.name).join(',')}`)
await leave(p); await wait(500)
ok('crawlers: leaving without input sends nothing', rows.length === 0)

// 3. The first real input sends what was held, with the version and the build.
await p.mouse.move(200, 200); await wait(600)
const start = named(rows, 'session.start')[0]
ok('input: held events go once the person moves the pointer', !!start && named(rows, 'page.view').length > 0, rows.map(r => r.name).join(','))
ok('every row: carries the app version', rows.length > 0 && rows.every(r => /^\d+\.\d+\.\d+$/.test(r.ver)), JSON.stringify(rows.map(r => r.ver)))
ok('every row: says web or desktop, and not internal', rows.every(r => r.app === 'web' && r.internal === false))

// 4. The Editor: ready time, a new design, a quick undo.
await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
await p.mouse.move(500, 400)
await p.getByText('Instagram post', { exact: true }).click()
await p.waitForFunction(() => !!window.__voidEditor?.getState().doc)
await E(p, () => { const s = window.__voidEditor.getState(); window.__voidEditor.setState({ doc: { ...s.doc, name: 'PRIVATE-NAME-QQ' } }); s.addText(120, 160); const t = window.__voidEditor.getState().layers.at(-1); window.__voidEditor.setState({ editingTextId: null }); window.__voidEditor.getState().updateLayer(t.id, { text: 'SECRET-HEADLINE-XYZ' }, 'Edit text') })
await E(p, () => window.__voidEditor.getState().addShape('rect', 300, 300, 200, 200))
await E(p, () => window.__voidEditor.getState().undo())
await wait(3800)
const ready = named(rows, 'perf').find(r => r.props.what === 'editor.ready')
ok('speed: the Editor reports when it was ready', !!ready && ready.props.ms > 0, JSON.stringify(ready?.props))
ok('editor: a new design is counted', named(rows, 'doc.new').length > 0)
const quick = named(rows, 'undo.quick')[0]
ok('friction: an undo straight after a change is counted, by kind only', !!quick && quick.props.kind === 'layer' && Object.keys(quick.props).length === 1, JSON.stringify(quick?.props))

// 5. The export dialog opened and closed with nothing done.
await p.getByRole('button', { name: 'Export', exact: true }).first().click()
await p.waitForSelector('[role=dialog][aria-label="Export"]'); await p.mouse.move(700, 450)
await p.keyboard.press('Escape'); await wait(3800)
const ab = named(rows, 'panel.abandon')
ok('friction: closing Export without exporting is counted', ab.some(r => r.props.id === 'export'), JSON.stringify(ab.map(r => r.props)))

// 6. Command search: a miss is sent once, a miss with a number never.
await p.keyboard.press('Control+k'); await p.waitForSelector('[role=dialog][aria-label="Search actions"]')
await p.keyboard.type('zzqx gradient', { delay: 20 }); await wait(2000)
await p.keyboard.press('Control+a'); await p.keyboard.type('call 08031234567', { delay: 10 }); await wait(2000)
await p.keyboard.press('Escape'); await wait(3800)
const misses = named(rows, 'search.none')
ok('search: words that found nothing are sent', misses.some(r => r.props.q === 'zzqx gradient'), JSON.stringify(misses.map(r => r.props)))
ok('search: a miss with a phone number is never sent', !misses.some(r => /0803/.test(JSON.stringify(r.props))))
ok('search: each miss is sent once', misses.filter(r => r.props.q === 'zzqx gradient').length === 1)

// 7. A panel control, then the session summary on leaving.
await E(p, () => { const s = window.__voidEditor.getState(); const t = s.layers.find(l => l.type === 'text'); s.setActive(t.id) }); await wait(300)
const posBtn = p.locator('section[data-section="Position"] button[aria-expanded]').first()
if (await posBtn.count() && (await posBtn.getAttribute('aria-expanded')) === 'false') { await posBtn.click(); await wait(200) }
const xBox = p.locator('input[aria-label^="X, from the left"]').first()
let ctlOk = false
if (await xBox.count()) { await xBox.click(); await xBox.fill('140'); await p.keyboard.press('Enter'); ctlOk = true }
for (let i = 0; i < 8; i++) { await p.mouse.move(600 + i * 10, 420); await wait(400) }
await leave(p); await wait(800)
const summary = named(rows, 'session.summary').at(-1)
ok('summary: sent on leaving, with active seconds', !!summary && summary.props.eng >= 2, JSON.stringify(summary?.props))
ok('summary: undo steps by kind, never by name', !!summary && summary.props.steps && Object.keys(summary.props.steps).every(k => ['text', 'move', 'colour', 'effect', 'paint', 'select', 'layer', 'board', 'other'].includes(k)), JSON.stringify(summary?.props.steps))
ok('summary: the design size in buckets', !!summary && ['0', '1', '2-5', '6-20', '21+'].includes(summary.props.layers) && summary.props.boards !== undefined)
ok('summary: the panel control that changed', ctlOk && (summary?.props.ctl || {}).X >= 1, JSON.stringify(summary?.props.ctl))

// 8. Rage clicks: four fast clicks on one spot.
await p.mouse.move(720, 120)
for (let i = 0; i < 4; i++) { await p.mouse.down(); await p.mouse.up(); await wait(90) }
await wait(3800)
ok('friction: four fast clicks on one spot are counted', named(rows, 'rage').length === 1, JSON.stringify(named(rows, 'rage').map(r => r.props)))

// 9. Errors reach the table.
await E(p, () => { setTimeout(() => { throw new Error('vc-e2e-check') }, 0) }); await wait(1200)
ok('errors: an uncaught error is sent', named(rows, 'error').some(r => /vc-e2e-check/.test(r.props.msg)))

// 10. Nothing the designer made ever leaves the device, and every row fits the 2 KB limit.
const all = JSON.stringify(rows)
ok('privacy: no design name or text in any row', !/PRIVATE-NAME-QQ|SECRET-HEADLINE-XYZ/.test(all))
ok('rows: every props object is under 2 KB', rows.every(r => JSON.stringify(r.props).length < 2000))
ok('rows: every name fits the table rule', rows.every(r => /^[a-z0-9_.:-]{1,64}$/.test(r.name)), [...new Set(rows.map(r => r.name))].join(','))
ok('editor: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
await ctx.close()

// 11. A device marked as the team's own marks every row.
{
  const { ctx, p, rows } = await open({ 'vc-usage-dev': '1', 'vc-usage-test': '1', 'vc-internal': '1' })
  await p.goto(`${BASE}/about`); await p.waitForLoadState('networkidle'); await wait(1000); await p.mouse.move(300, 300); await p.mouse.move(320, 310); await wait(3800)
  ok('internal: rows from a team device are marked', rows.length > 0 && rows.every(r => r.internal === true), JSON.stringify(rows.map(r => [r.name, r.internal])))
  await ctx.close()
}

// 12. /admin: the designers-only view renders, and the device switch marks this browser as the team's own.
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const z = { visitors: 0, visitors_prev: 0, new_visitors: 0, sessions: 0, sessions_prev: 0, exports: 0, exports_prev: 0, errors: 0, errors_prev: 0, feedback: 0, median_session_sec: 0, all_time_visitors: 0, returning_visitors: 0 }
  const dash = { days: 30, generated_at: new Date().toISOString(), event_counts: {}, event_users: {}, totals: z, today: { visitors: 0, sessions: 0, exports: 0 }, daily: [], funnel: { sessions: 0, used_tool: 0, made_something: 0, exported: 0 }, areas: [], actions: [], effects: [], exports: [], imports: [], ai: [], devices: [], browsers: [], timezones: [], referrers: [], hours: [], errors_top: [], retention: { cohort: 0, came_back: 0, came_back_7d: 0 }, feedback_moods: { 1: 0, 2: 0, 3: 0 }, feedback: [] }
  const week = { days: 7, generated_at: new Date().toISOString(), since: new Date().toISOString(), first_real_event: new Date().toISOString(),
    funnel: { visitors: 12, opened_editor: 9, started: 7, worked: 5, exported: 3, came_back: 2 }, funnel_prev: { visitors: 8, started: 4, exported: 1, came_back: 1 },
    time: { sessions: 15, finished_sessions: 4, finished_minutes: 52.5, finished_median_min: 11.2, all_minutes: 80, prev_finished_minutes: 20, prev_finished_sessions: 2 },
    friction: [{ name: 'panel.abandon', what: 'export', n: 5, devices: 3 }, { name: 'undo.quick', what: 'effect', n: 4, devices: 2 }],
    search_misses: [{ q: 'gradient fill', n: 3, devices: 2 }], slow: [{ what: 'editor.ready', n: 10, median_ms: 900, p90_ms: 2400 }],
    saves: { n: 30, slowest_ms: 220, long_tasks: 3, longest_ms: 640 }, controls: [{ id: 'Size', n: 9, devices: 4 }], steps: { text: 12, move: 20 },
    versions: [{ ver: '0.1.29', app: 'web', sessions: 15, started: 7, exported: 3, median_min: 6.5 }], regions: [{ region: 'West Africa', visitors: 9, started: 6, exported: 3 }],
    workflows: { n: 6, designers: 12, prev_n: 2, prev_designers: 8, kinds: { 'create-edit-export': 4, 'open-change-save': 2 } },
    errors: [{ msg: 'Example error', n: 1, devices: 1, before_input: 1 }] }
  await ctx.route('**/rest/v1/rpc/vc_admin_dashboard', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dash) }))
  await ctx.route('**/rest/v1/rpc/vc_admin_week', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(week) }))
  await ctx.addInitScript(() => sessionStorage.setItem('vc-admin-pw', 'test'))
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto(`${BASE}/admin`)
  await p.waitForSelector('text=Where people get stuck', { timeout: 15000 }).catch(() => {})
  const body = await p.textContent('body')
  ok('admin: This week shows designers only', /Designers only/.test(body) && /Workflows finished per designer/.test(body) && /New design, changed, exported/.test(body) && /Closed with nothing done: Export/.test(body) && /gradient fill/.test(body) && /West Africa/.test(body), body.slice(0, 120))
  await p.getByRole('button', { name: 'Mark this device as yours' }).first().click()
  ok('admin: the switch marks this device as the team\'s own', (await p.evaluate(() => localStorage.getItem('vc-internal'))) === '1')
  await p.getByRole('button', { name: 'Everything', exact: true }).click()
  ok('admin: Everything still shows the full history', await p.locator('text=including test runs, crawlers').count() > 0)
  ok('admin: no page errors', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

await b.close()
console.log(out.join('\n'))
console.log(`\n${out.filter(l => l.startsWith('PASS')).length}/${out.length} passed`)
