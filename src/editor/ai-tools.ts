import { subjectMask } from './ai'
import { cloneCanvas, ctx2d, healRegion, makeCanvas, maskBounds } from './engine'
import { combineSelection, composite } from './ops'
import { useEditor } from './store'
import { useUi } from './ui-store'
import { track } from '@/lib/analytics'

// Every AI feature runs on this device. Nothing is uploaded, nothing is charged, and the first use of each
// model says how big the download is before it starts. The models are cached so later uses work offline.

export interface ModelInfo { id: string; name: string; use: string; sizeMB: number; licence: string; needsGpu?: boolean }
export const MODELS: ModelInfo[] = [
  { id: 'modnet', name: 'MODNet', use: 'Remove background, select subject (people)', sizeMB: 26, licence: 'Apache-2.0' },
  { id: 'birefnet', name: 'BiRefNet lite', use: 'Remove background and object select (any subject)', sizeMB: 115, licence: 'MIT', needsGpu: true },
  { id: 'lama', name: 'LaMa', use: 'Remove object, expand with AI fill', sizeMB: 208, licence: 'Apache-2.0' },
]

const s = () => useEditor.getState()

/** Ask once per model before a large download. Returns false if the person says no. */
export function consent(model: string): boolean {
  const ui = useUi.getState()
  if (ui.aiConsent[model]) return true
  const m = MODELS.find(x => x.id === model); if (!m) return true
  const ok = window.confirm(`${m.name} runs on your device. Nothing is uploaded and it is free.\n\nThe first use downloads the model once (about ${m.sizeMB} MB). After that it works offline.\n\nDownload now?`)
  if (ok) ui.setPref('aiConsent', { ...ui.aiConsent, [model]: true })
  track(ok ? 'ai.download' : 'ai.declined', { model, mb: m.sizeMB })
  return ok
}

const status = (m: string | null) => s().setBusy(m)

// ─── Subject and background ────────────────────────────────────────

export async function removeBackgroundLayer(layerId: string, mode: 'person' | 'any' = 'person') {
  const l = s().layers.find(x => x.id === layerId)
  if (!l || l.type !== 'raster') return
  if (!consent(mode === 'any' ? 'birefnet' : 'modnet')) return
  try {
    const mask = await subjectMask(l.canvas, status, mode)
    s().updateLayer(l.id, { mask, maskEnabled: true }, 'Remove background')
    s().notify('Background hidden with a mask. Paint on the mask to fine-tune the edges.')
  } catch (e) { console.error(e); s().notify('Could not load the background remover. Check your connection and try again.') }
  finally { status(null) }
}

/** Select the main subject of the whole visible image. */
export async function selectSubject(mode: 'person' | 'any' = 'person') {
  const c = composite(); if (!c) return
  if (!consent(mode === 'any' ? 'birefnet' : 'modnet')) return
  try {
    const m = await subjectMask(c, status, mode)
    combineSelection(m, useEditor.getState().options.selMode ?? 'new', 'Select subject')
    s().notify('Subject selected. Use Select and mask to refine hair and soft edges.')
  } catch (e) { console.error(e); s().notify('Could not load the subject model. Check your connection and try again.') }
  finally { status(null) }
}

/** Object select: find the subject inside a box the person drew. */
export async function objectSelect(rect: { x: number; y: number; w: number; h: number }, mode: 'new' | 'add' | 'sub' | 'intersect' = 'new') {
  const doc = s().doc; const c = composite(); if (!doc || !c) return
  const pad = Math.round(Math.max(rect.w, rect.h) * 0.08)
  const x0 = Math.max(0, Math.floor(rect.x - pad)), y0 = Math.max(0, Math.floor(rect.y - pad))
  const x1 = Math.min(doc.width, Math.ceil(rect.x + rect.w + pad)), y1 = Math.min(doc.height, Math.ceil(rect.y + rect.h + pad))
  if (x1 - x0 < 8 || y1 - y0 < 8) return
  const crop = makeCanvas(x1 - x0, y1 - y0); ctx2d(crop).drawImage(c, -x0, -y0)
  const useAny = !!(navigator as any).gpu
  if (!consent(useAny ? 'birefnet' : 'modnet')) return
  try {
    const m = await subjectMask(crop, status, useAny ? 'any' : 'person')
    const full = makeCanvas(doc.width, doc.height), fx = ctx2d(full)
    fx.drawImage(m, x0, y0)
    // Keep only what is inside the box the person drew.
    fx.globalCompositeOperation = 'destination-in'; fx.fillStyle = '#fff'; fx.fillRect(rect.x, rect.y, rect.w, rect.h)
    combineSelection(full, mode, 'Object select')
  } catch (e) { console.error(e); s().notify('Could not load the object model. Check your connection and try again.') }
  finally { status(null) }
}

// ─── Inpainting (LaMa, 512 x 512, ONNX Runtime Web) ─────────────────

const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/'
const LAMA_URL = 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx'
let lama: Promise<any> | null = null

async function fetchCached(url: string, onProgress: (p: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try { cache = await caches.open('vc-models') ; const hit = await cache.match(url); if (hit) return await hit.arrayBuffer() } catch { cache = null }
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('Model download failed')
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader(); const parts: Uint8Array[] = []; let got = 0
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; if (total) onProgress(got / total) }
  const buf = new Uint8Array(got); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length }
  try { await cache?.put(url, new Response(buf.slice().buffer, { headers: { 'content-type': 'application/octet-stream' } })) } catch { /* storage full: still works this time */ }
  return buf.buffer
}

async function loadLama() {
  if (!lama) {
    lama = (async () => {
      status('Loading the object remover (first time only)')
      const ort: any = await import(/* webpackIgnore: true */ ORT + 'ort.all.min.mjs')
      ort.env.wasm.wasmPaths = ORT
      const buf = await fetchCached(LAMA_URL, p => status(`Downloading the object remover ${Math.round(p * 100)}%`))
      status('Starting the object remover')
      const providers = (navigator as any).gpu ? [['webgpu', 'wasm'], ['wasm']] : [['wasm']]
      let lastErr: any
      for (const ep of providers) {
        try { return { ort, session: await ort.InferenceSession.create(buf, { executionProviders: ep, graphOptimizationLevel: 'all' }) } } catch (e) { lastErr = e }
      }
      throw lastErr
    })()
    lama.catch(() => { lama = null })
  }
  return lama
}

/**
 * Fill the masked area of `src` (both the same size). Works on a square crop around the hole, scaled to 512,
 * then pastes back only the hole with a soft edge so the rest of the image keeps full resolution.
 */
export async function inpaint(src: HTMLCanvasElement, hole: HTMLCanvasElement): Promise<HTMLCanvasElement | null> {
  const t0 = performance.now()
  try { const r = await inpaintRaw(src, hole); track('ai.run', { tool: 'inpaint', ok: !!r, ms: Math.round(performance.now() - t0), gpu: !!(navigator as any).gpu }); return r }
  catch (e) { track('ai.run', { tool: 'inpaint', ok: false, ms: Math.round(performance.now() - t0), gpu: !!(navigator as any).gpu, msg: String((e as Error)?.message || e).slice(0, 120) }); throw e }
}

async function inpaintRaw(src: HTMLCanvasElement, hole: HTMLCanvasElement): Promise<HTMLCanvasElement | null> {
  const b = maskBounds(hole); if (!b) return null
  const side = Math.min(Math.max(src.width, src.height), Math.max(128, Math.round(Math.max(b.w, b.h) * 2.2)))
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2
  const x0 = Math.round(Math.max(0, Math.min(src.width - side, cx - side / 2))), y0 = Math.round(Math.max(0, Math.min(src.height - side, cy - side / 2)))
  const cw = Math.min(side, src.width), ch = Math.min(side, src.height)
  const { ort, session } = await loadLama()
  status('Removing')
  const N = 512
  const img = makeCanvas(N, N), ix = ctx2d(img, true); ix.imageSmoothingQuality = 'high'; ix.drawImage(src, x0, y0, cw, ch, 0, 0, N, N)
  const msk = makeCanvas(N, N), mx = ctx2d(msk, true); mx.drawImage(hole, x0, y0, cw, ch, 0, 0, N, N)
  const id = ix.getImageData(0, 0, N, N).data, md = mx.getImageData(0, 0, N, N).data
  const imageT = new Float32Array(3 * N * N), maskT = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) {
    imageT[i] = id[i * 4] / 255; imageT[N * N + i] = id[i * 4 + 1] / 255; imageT[2 * N * N + i] = id[i * 4 + 2] / 255
    maskT[i] = md[i * 4 + 3] > 20 ? 1 : 0
  }
  const out = await session.run({ image: new ort.Tensor('float32', imageT, [1, 3, N, N]), mask: new ort.Tensor('float32', maskT, [1, 1, N, N]) })
  const o = (out.output ?? out[session.outputNames[0]]).data as Float32Array
  const res = makeCanvas(N, N), rx = ctx2d(res), rimg = rx.createImageData(N, N)
  // Some exports return 0..1, others 0..255.
  let mxv = 0; for (let i = 0; i < 2000; i++) mxv = Math.max(mxv, o[i * 97 % o.length])
  const k = mxv <= 1.5 ? 255 : 1
  for (let i = 0; i < N * N; i++) { rimg.data[i * 4] = o[i] * k; rimg.data[i * 4 + 1] = o[N * N + i] * k; rimg.data[i * 4 + 2] = o[2 * N * N + i] * k; rimg.data[i * 4 + 3] = 255 }
  rx.putImageData(rimg, 0, 0)
  // Soft-edged hole, grown a little so no fringe of the old object remains.
  const soft = makeCanvas(src.width, src.height), sx = ctx2d(soft)
  const off = src.width + 40
  sx.shadowColor = '#fff'; sx.shadowBlur = Math.max(2, Math.min(b.w, b.h) * 0.04); sx.shadowOffsetX = off
  sx.drawImage(hole, -off, 0); sx.shadowColor = 'transparent'; sx.drawImage(hole, 0, 0)
  const patch = makeCanvas(src.width, src.height), px = ctx2d(patch)
  px.imageSmoothingQuality = 'high'; px.drawImage(res, 0, 0, N, N, x0, y0, cw, ch)
  px.globalCompositeOperation = 'destination-in'; px.drawImage(soft, 0, 0)
  const result = cloneCanvas(src); ctx2d(result).drawImage(patch, 0, 0)
  return result
}

/** Remove whatever is painted in `hole` from the active layer. Falls back to patch healing if the model cannot load. */
export async function removeObject(hole: HTMLCanvasElement) {
  const l = s().ensurePaintable(); if (!l || l.type !== 'raster') return
  const src = l.canvas
  let out: HTMLCanvasElement | null = null
  if (consent('lama')) {
    try { out = await inpaint(src, hole) } catch (e) { console.error(e); s().notify('The AI remover could not start in this browser, so a simpler fill was used.') }
    finally { status(null) }
  }
  if (!out) out = healRegion(src, hole)
  if (!out) { s().notify('That area is too large to fill. Try a smaller area.'); return }
  s().updateLayer(l.id, { canvas: out }, 'Remove object')
}

/** Fill transparent areas of the flattened image (after enlarging the canvas) using the inpainting model. */
export async function aiFillTransparent() {
  const doc = s().doc; if (!doc) return
  const c = composite({ transparent: true }); if (!c) return
  const d = ctx2d(c, true).getImageData(0, 0, c.width, c.height).data
  const hole = makeCanvas(c.width, c.height), hx = ctx2d(hole), himg = hx.createImageData(c.width, c.height)
  let any = false
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { himg.data[i] = 255; any = true }
  if (!any) { s().notify('There is no empty area to fill.'); return }
  hx.putImageData(himg, 0, 0)
  if (!consent('lama')) return
  try {
    // Fill a flattened copy, then add only the new pixels as a layer beneath everything.
    const out = await inpaint(c, hole)
    if (!out) return
    const x = ctx2d(out); x.globalCompositeOperation = 'destination-in'; x.drawImage(hole, 0, 0)
    const st = s()
    const { base } = await import('./store')
    const layer = { ...base('AI fill'), type: 'raster' as const, canvas: out }
    useEditor.setState({ layers: [layer, ...st.layers], docRev: st.docRev + 1 })
    st.commit('Expand with AI fill')
    st.notify('New area filled on its own layer at the bottom. Hide or paint on it to adjust.')
  } catch (e) { console.error(e); s().notify('The AI fill could not start in this browser.') }
  finally { status(null) }
}

export async function clearModelCache() {
  try { await caches.delete('vc-models') } catch { /* ignore */ }
  try { const keys = await caches.keys(); for (const k of keys) if (/transformers/i.test(k)) await caches.delete(k) } catch { /* ignore */ }
  useUi.getState().setPref('aiConsent', {})
}
