'use client'

import { useCallback, useEffect, useState } from 'react'
import { Funnel, Ranked } from './charts'
import { fmtPct, loadWeek, pct, type Week } from './data'
import { Card, Delta, Kpi, focus } from './ui'

// "This week": designers only. Rows come from builds that send their version (from 2 Oct 2026), and never from
// devices marked as the team's own. Automated browsers and pages nobody touched send nothing at all.

const DIALOG: Record<string, string> = {
  export: 'Export', 'resize-formats': 'Resize for other formats', 'image-size': 'Image size', 'canvas-size': 'Canvas size',
  'ai-expand': 'Expand with AI fill', fill: 'Fill', add: 'Add to your design', filters: 'Filters and adjustments',
  'layer-style': 'Layer style', 'fx-scope': 'One image or each layer',
}
const KIND: Record<string, string> = {
  text: 'Text and type', move: 'Moving and sizing', colour: 'Colour and fill', effect: 'Effects and adjustments', paint: 'Painting',
  select: 'Selections and masks', layer: 'Layers', board: 'Boards and formats', other: 'Other',
}
const FLOW: Record<string, string> = {
  'create-edit-export': 'New design, changed, exported', 'open-change-save': 'Opened again, changed, saved',
  'master-formats-export': 'Master, formats, exported', 'template-new-design': 'New design from a template',
}
const SLOW: Record<string, string> = { 'editor.ready': 'Editor ready after opening the page', 'doc.open': 'Design opened from storage' }

function frictionLabel(name: string, what: string) {
  if (name === 'undo.quick') return `Undone within 3 seconds: ${(KIND[what] || what).toLowerCase()}`
  if (name === 'panel.abandon') return `Closed with nothing done: ${DIALOG[what] || what}`
  if (name === 'rage') return `Clicked again and again: ${what === 'canvas' ? 'the canvas' : what}`
  if (name === 'save.failed') return 'A save failed'
  if (name === 'export.failed') return 'An export failed'
  return `${name} ${what}`
}

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`)

export function WeekView({ pw, onAuthFail }: { pw: string; onAuthFail: () => void }) {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<Week | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(async (d: number) => {
    setErr('')
    try { setData(await loadWeek(pw, d)) }
    catch (x) { const m = (x as Error).message; if (m === 'wrong_password') onAuthFail(); else setErr(m === 'locked' ? 'Locked for 15 minutes after wrong passwords.' : 'Could not load. Check your connection.') }
  }, [pw, onAuthFail])
  useEffect(() => { load(days) }, [days, load])

  if (err) return <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-200">{err}</p>
  if (!data) return <p className="text-[13px] text-void-500">Loading</p>

  const f = data.funnel, p = data.funnel_prev, t = data.time
  const v = (x?: number) => x ?? 0
  const finishedRate = pct(v(f.exported), v(f.started))
  const empty = !data.first_real_event
  const wf = data.workflows ?? { n: 0, designers: 0, prev_n: 0, prev_designers: 0, kinds: {} }
  const perDesigner = wf.designers ? wf.n / wf.designers : 0
  const perDesignerPrev = wf.prev_designers ? wf.prev_n / wf.prev_designers : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-void-400 flex-1 min-w-[16rem]">
          Designers only. Counting started {data.first_real_event ? new Date(data.first_real_event).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'with the 2 Oct release'}.
          Test runs, crawlers and your own devices are left out. Each number is compared with the {days} days before.
        </p>
        <div className="flex items-center gap-1 rounded-lg bg-void-900 p-0.5 border border-void-800">
          {[7, 30].map(d => <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`px-2.5 h-7 rounded-md text-[12px] ${focus} ${days === d ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{d} days</button>)}
        </div>
      </div>

      {empty && <Card title="Nothing yet" sub="The first designers' visits since the new counting show here."><p className="text-[13px] text-void-400">A visit counts once the person moves the pointer, taps or types. Mark this device as yours (top right) so your own work stays out.</p></Card>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Workflows finished per designer" value={perDesigner.toFixed(2)} foot={<><Delta cur={perDesigner} prev={perDesignerPrev} /> <span>{wf.n} in all</span></>} />
        <Kpi label="Designers" value={v(f.visitors).toLocaleString()} foot={<><Delta cur={v(f.visitors)} prev={v(p.visitors)} /> <span>vs before</span></>} />
        <Kpi label="Started a design" value={v(f.started).toLocaleString()} foot={<><Delta cur={v(f.started)} prev={v(p.started)} /> <span>vs before</span></>} />
        <Kpi label="Started and exported" value={v(f.started) ? fmtPct(finishedRate) : 'n/a'} foot={`${v(f.exported)} exported`} />
        <Kpi label="Came back another day" value={v(f.came_back).toLocaleString()} foot={<><Delta cur={v(f.came_back)} prev={v(p.came_back)} /> <span>vs before</span></>} />
        <Kpi label="Minutes of work that finished" value={t.finished_minutes.toLocaleString()} foot={<><Delta cur={t.finished_minutes} prev={t.prev_finished_minutes} /> <span>of {t.all_minutes} active</span></>} />
        <Kpi label="Typical finished visit" value={`${t.finished_median_min} min`} foot={`active minutes, median of ${t.finished_sessions}`} />
        <Kpi label="Saves" value={data.saves.n.toLocaleString()} foot={data.saves.slowest_ms ? `slowest ${ms(data.saves.slowest_ms)}` : 'none slow'} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="From arrival to export" sub="People at each step">
          <Funnel steps={[
            { label: 'Arrived', v: v(f.visitors) }, { label: 'Opened the Editor', v: v(f.opened_editor) },
            { label: 'Started a design', v: v(f.started) }, { label: 'Changed something', v: v(f.worked) }, { label: 'Exported', v: v(f.exported) },
          ]} />
        </Card>
        <Card title="Workflows finished" sub="Each counted once per design per visit: the north star">
          <Ranked rows={Object.entries(wf.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, label: FLOW[k] || k, v: n }))} empty="None finished yet" />
        </Card>
        <Card title="Where people get stuck" sub="Fix the top one first">
          <Ranked rows={data.friction.map(x => ({ key: x.name + x.what, label: frictionLabel(x.name, x.what), v: x.n, sub: people(x.devices) }))} empty="No friction recorded" max={15} />
        </Card>
        <Card title="Searched for and not found" sub="Words typed into command search that matched nothing">
          <Ranked rows={data.search_misses.map(x => ({ key: x.q, label: `“${x.q}”`, v: x.n, sub: people(x.devices) }))} empty="Every search found something" max={25} />
        </Card>
        <Card title="Slow moments" sub="Typical time, and the slowest one in ten">
          <Ranked rows={data.slow.map(x => ({ key: x.what, label: SLOW[x.what] || x.what, v: x.p90_ms, sub: `typical ${ms(x.median_ms)}, ${x.n} times` }))} suffix={n => ms(n)} empty="Nothing measured yet" />
          {data.saves.long_tasks > 0 && <p className="mt-3 text-[12.5px] text-void-400">The page froze for over 0.2 s {data.saves.long_tasks} times; the longest was {ms(data.saves.longest_ms)}.</p>}
        </Card>
        <Card title="Panel controls people use" sub="Changes per control, to order the panels by real use">
          <Ranked rows={data.controls.map(x => ({ key: x.id, label: x.id, v: x.n, sub: people(x.devices) }))} empty="No panel changes yet" max={25} />
        </Card>
        <Card title="What people change" sub="Undo steps by kind">
          <Ranked rows={Object.entries(data.steps).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, label: KIND[k] || k, v: n }))} empty="No changes yet" />
        </Card>
        <Card title="By version" sub="Did the last release move the numbers?">
          {data.versions.length ? (
            <div className="overflow-x-auto"><table className="w-full text-[12.5px] tabular-nums">
              <thead className="text-void-500 text-left"><tr><th className="py-1.5 pr-3 font-normal">Version</th><th className="py-1.5 px-2 font-normal text-right">Visits</th><th className="py-1.5 px-2 font-normal text-right">Started</th><th className="py-1.5 px-2 font-normal text-right">Exported</th><th className="py-1.5 pl-2 font-normal text-right">Active min</th></tr></thead>
              <tbody>{data.versions.map(x => <tr key={x.ver + x.app} className="border-t border-void-800/60"><td className="py-1.5 pr-3">{x.ver}{x.app === 'desktop' ? ' desktop' : ''}</td><td className="py-1.5 px-2 text-right">{x.sessions}</td><td className="py-1.5 px-2 text-right">{x.started}</td><td className="py-1.5 px-2 text-right">{x.exported}</td><td className="py-1.5 pl-2 text-right">{x.median_min}</td></tr>)}</tbody>
            </table></div>
          ) : <p className="text-[13px] text-void-500">Nothing yet</p>}
        </Card>
        <Card title="By region" sub="From the device time zone">
          <Ranked rows={data.regions.map(x => ({ key: x.region, label: x.region, v: x.visitors, sub: `${x.started} started, ${x.exported} exported` }))} empty="Nothing yet" />
        </Card>
        <Card title="Errors" sub="Before any input means the page failed before the person touched it" className="md:col-span-2">
          <Ranked rows={data.errors.map(x => ({ key: x.msg, label: x.msg, v: x.n, sub: `${people(x.devices)}${x.before_input ? `, ${x.before_input} before any input` : ''}` }))} empty="No errors" max={12} />
        </Card>
      </div>
    </div>
  )
}
