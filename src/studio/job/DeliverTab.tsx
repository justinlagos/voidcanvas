'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Link2, Package } from 'lucide-react'
import { downloadBlob, zipFiles } from '@/editor/io'
import { colorSpecLine } from '../brand/export'
import { fileName, slug, useJobs, type ClientBrand, type Deliverable, type Job } from '../jobs'
import { boardCanvas, boardsOf, loadDesign, toBlob, type LoadedDesign } from '../render'
import { printPdf } from '../pdf'
import { Btn, Empty, Panel, focusRing, fmtDate } from '../ui'
import type { TabProps } from './JobView'
import { LinkBox, SignInToShare, useCanShare } from './LinkBox'

type Kind = 'png' | 'jpg' | 'webp' | 'pdf'
const KIND_LABEL: Record<Kind, string> = { png: 'PNG', jpg: 'JPG', webp: 'WebP', pdf: 'Print PDF' }
const defaults = (d: Deliverable): Kind[] => (d.group === 'Print' || d.group === 'Outdoor' ? ['pdf', 'jpg'] : ['png', 'jpg'])

export function DeliverTab({ job, update, toast }: TabProps) {
  const [design, setDesign] = useState<LoadedDesign | null>(null)
  const [loading, setLoading] = useState(true)
  const [pick, setPick] = useState<Record<string, Kind[]>>({})
  const [withBrand, setWithBrand] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const brand = useJobs(s => s.brands.find(b => b.id === job.brandId))
  useEffect(() => { loadDesign(job.designId).then(d => { setDesign(d); setLoading(false) }) }, [job.designId])
  const version = Math.max(1, job.versions.length)
  const boards = design ? boardsOf(design) : []
  const frameFor = (d: Deliverable) => boards.find(f => f.deliverableId === d.id) ?? (d.id === job.masterDeliverableId ? boards.find(f => !f.linkedFrom) : undefined)
  const rows = job.deliverables.map(d => ({ d, f: frameFor(d), kinds: pick[d.id] ?? defaults(d) }))
  const ready = rows.filter(r => r.f)
  const fileList = useMemo(() => ready.flatMap(r => r.kinds.map(k => fileName(job, r.d, version, k === 'jpg' ? 'jpg' : k))), [ready, job, version])

  const canShare = useCanShare()
  const [signIn, setSignIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const build = async (asLink = false) => {
    if (!design) return
    if (asLink && !canShare) { setSignIn(true); return }
    const files: { name: string; blob: Blob }[] = []
    setError(null)
    try {
      for (const { d, f, kinds } of ready) {
        setBusy(`Rendering ${d.label}…`)
        // Formats render at their full size; a print sheet gets its bleed from the edges.
        const c = boardCanvas(design, f!, Math.min(1, 12000 / Math.max(f!.width, f!.height)))
        for (const k of kinds) {
          const name = fileName(job, d, version, k)
          if (k === 'pdf') {
            const mm = d.mm ?? { w: Math.round((d.width / 300) * 25.4), h: Math.round((d.height / 300) * 25.4) }
            files.push({ name, blob: await printPdf(c, mm, `${job.client ? job.client + ' - ' : ''}${job.name} - ${d.label} - v${version} - Trim ${mm.w} x ${mm.h} mm - Bleed 3 mm - RGB, convert with your printer's profile`) })
          } else files.push({ name, blob: await toBlob(c, k === 'jpg' ? 'image/jpeg' : k === 'webp' ? 'image/webp' : 'image/png', k === 'png' ? undefined : 0.92) })
        }
        c.width = 0; c.height = 0
      }
      if (withBrand && brand) files.push({ name: `${slug(brand.name)}_brand-sheet.html`, blob: new Blob([brandSheet(brand)], { type: 'text/html' }) })
      files.push({ name: `${slug(job.client || 'client')}_${slug(job.name)}_delivery-note.html`, blob: new Blob([deliveryNote(job, version, files.map(f => ({ name: f.name, size: f.blob.size })), design)], { type: 'text/html' }) })
      let link = null
      if (asLink) {
        setBusy('Encrypting…')
        const { createDeliveryShare } = await import('@/lib/share')
        const ref = await createDeliveryShare({ client: job.client, job: job.name, label: `v${version}`, notes: '', workspaceId: job.workspaceId }, files, (d, t) => setBusy(`Uploading ${Math.min(d + 1, t)} of ${t}…`))
        link = { ...ref, at: Date.now() }
      } else {
        setBusy('Packing…')
        downloadBlob(await zipFiles(files), `${slug(job.client || 'client')}_${slug(job.name)}_v${version}_delivery.zip`)
      }
      update(j => ({ status: 'delivered', deliveries: [...(j.deliveries ?? []), { at: Date.now(), files: files.map(f => f.name), link }], deliverables: j.deliverables.map(x => (ready.some(r => r.d.id === x.id) ? { ...x, done: true } : x)) }))
      toast(asLink ? `Link ready with ${files.length} files. Copy it below. The job is marked delivered.` : `Packed ${files.length} files. The job is marked delivered.`)
    } catch (e) { console.error(e); const m = (e as Error).message; if (asLink && m) setError(m); else toast('Could not build the package. Try fewer formats at once.') }
    finally { setBusy(null) }
  }
  const stopLink = async (at: number, id: string) => {
    const { deleteShare } = await import('@/lib/share')
    await deleteShare(id)
    update(j => ({ deliveries: (j.deliveries ?? []).map(d => (d.at === at ? { ...d, link: null } : d)) }))
  }

  if (loading) return <p className="p-6 text-[13px] text-void-400">Loading…</p>
  if (!design) return <div className="p-6 max-w-3xl mx-auto"><Empty title="Nothing to deliver yet">Design the key visual and build its formats first. Every format you owe is rendered at full size, named properly and zipped here, with print PDFs set up for the printer.</Empty></div>
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Panel title={`Package v${version}`} action={<span className="text-[11.5px] text-void-500">{ready.length} of {job.deliverables.length} formats ready</span>}>
          <div className="rounded-xl border border-void-800 overflow-hidden divide-y divide-void-800">
            {rows.map(({ d, f, kinds }) => (
              <div key={d.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 bg-void-950 ${f ? '' : 'opacity-50'}`}>
                <span className="min-w-0 flex-1"><span className="block text-[13px]">{d.label}</span><span className="block text-[11.5px] text-void-500">{f ? `${d.width} × ${d.height}${d.mm ? ` · ${d.mm.w} × ${d.mm.h} mm` : ''}` : 'Not built yet: build it on the Key visual and formats tab'}</span></span>
                {f && (Object.keys(KIND_LABEL) as Kind[]).map(k => (
                  <label key={k} className="flex items-center gap-1.5 text-[12px] text-void-300 cursor-pointer">
                    <input type="checkbox" checked={kinds.includes(k)} onChange={e => setPick(p => ({ ...p, [d.id]: e.target.checked ? [...kinds, k] : kinds.filter(x => x !== k) }))} className="accent-[#8b7cff]" />{KIND_LABEL[k]}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {brand && <label className="flex items-center gap-2 text-[12.5px] text-void-300 cursor-pointer"><input type="checkbox" checked={withBrand} onChange={e => setWithBrand(e.target.checked)} className="accent-[#8b7cff]" />Include {brand.name} brand sheet</label>}
            <span className="flex-1" />
            {busy && <span className="text-[12.5px] text-accent-light">{busy}</span>}
            <Btn onClick={() => build(true)} disabled={!ready.length || !!busy} className="!h-10"><Link2 size={15} />Send as a link</Btn>
            <Btn primary onClick={() => build()} disabled={!ready.length || !!busy} className="!h-10"><Package size={15} />Build the package</Btn>
          </div>
          {error && <p role="alert" className="mt-2 text-[12px] text-rose-400">{error}</p>}
          {signIn && !canShare && <div className="mt-4"><SignInToShare what="delivery" /></div>}
        </Panel>
        <Panel title="What goes in the zip">
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px] font-mono text-void-300">
            {fileList.map(n => <li key={n} className="truncate">{n}</li>)}
            {withBrand && brand && <li className="truncate">{slug(brand.name)}_brand-sheet.html</li>}
            <li className="truncate">{slug(job.client || 'client')}_{slug(job.name)}_delivery-note.html</li>
          </ul>
          <p className="mt-3 text-[12px] text-void-500 leading-relaxed">Names follow client_job_format_version. Print PDFs are at trim size with 3 mm bleed from the edges, crop marks outside the bleed, and TrimBox and BleedBox set. Images are RGB: ask the printer to convert with their profile.</p>
        </Panel>
        {job.deliveries?.length ? (
          <Panel title="Delivered before">
            <ul className="space-y-3 text-[12.5px]">{job.deliveries.slice().reverse().map(d => (
              <li key={d.at} className="space-y-1.5">
                <span className="flex items-center gap-2"><Check size={13} className="text-emerald-400" />{fmtDate(d.at)} · {d.files.length} files{d.link ? ' · sent as a link' : ''}</span>
                {d.link && <div className="pl-5"><LinkBox link={d.link} onStop={() => stopLink(d.at, d.link!.id)} what="delivery" /></div>}
              </li>
            ))}</ul>
          </Panel>
        ) : null}
      </div>
    </div>
  )
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const PAGE = `body{font:15px/1.5 system-ui,sans-serif;max-width:860px;margin:48px auto;padding:0 24px;color:#111}h1{font-size:28px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 8px}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;font-size:13px}small{color:#666}`

function deliveryNote(job: Job, v: number, files: { name: string; size: number }[], d: LoadedDesign) {
  const fonts = Array.from(new Set(d.layers.filter(l => l.type === 'text').map(l => (l as any).fontFamily as string)))
  const approved = job.versions.filter(x => x.status === 'approved').map(x => x.label)
  return `<!doctype html><html><head><meta charset="utf-8"><title>Delivery: ${esc(job.name)}</title><style>${PAGE}</style></head><body>
<small>${esc(job.client || '')}</small><h1>${esc(job.name)}</h1><small>Delivered ${new Date().toLocaleDateString()} · version ${v}${approved.length ? ` · approved: ${approved.join(', ')}` : ''}</small>
<h2>Files</h2><table><tr><th>File</th><th>Size</th></tr>${files.map(f => `<tr><td>${esc(f.name)}</td><td>${kb(f.size)}</td></tr>`).join('')}</table>
<h2>Formats</h2><table><tr><th>Format</th><th>Size</th></tr>${job.deliverables.map(x => `<tr><td>${esc(x.label)}</td><td>${x.width} × ${x.height} px${x.mm ? ` · ${x.mm.w} × ${x.mm.h} mm` : ''}</td></tr>`).join('')}</table>
${fonts.length ? `<h2>Fonts used</h2><p>${fonts.map(esc).join(', ')}. Make sure these are installed before editing.</p>` : ''}
<h2>Print notes</h2><p>Print PDFs are at trim size with 3 mm bleed and crop marks. Colour is RGB; ask your printer to convert with their profile and send a proof for important colours.</p>
</body></html>`
}

function brandSheet(b: ClientBrand) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(b.name)} brand sheet</title><style>${PAGE}.sw{display:flex;gap:12px;flex-wrap:wrap}.c{width:180px}.c div{height:90px;border-radius:10px;border:1px solid #0001}</style></head><body>
<small>${esc(b.client)}</small><h1>${esc(b.name)}</h1>
<h2>Colours</h2><div class="sw">${b.colors.map(c => `<div class="c"><div style="background:${c.hex}"></div><b>${c.role}</b><br><small>${c.hex.toUpperCase()}<br>${colorSpecLine(c.hex)}</small></div>`).join('')}</div>
<h2>Type</h2><p><b>Headlines:</b> ${esc(b.display)}<br><b>Text:</b> ${esc(b.body)}</p>
<h2>Logo</h2><p>Minimum ${b.logoMin} px wide on a 1080 px design. Keep clear space of ${Math.round(b.clearSpace * 100)}% of the logo's height on every side.</p>
${b.voice.length ? `<h2>Voice</h2><p>${b.voice.map(esc).join(', ')}</p>` : ''}
${b.dos.length ? `<h2>Do</h2><ul>${b.dos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${b.donts.length ? `<h2>Don't</h2><ul>${b.donts.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
</body></html>`
}
