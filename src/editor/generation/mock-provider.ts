/**
 * C2 provider contract — LOCAL MOCK ONLY.
 * No network, no credentials, no model, no paid usage. Outputs are deterministic
 * sample artwork to exercise the real C1 ingest/placement and task pipeline.
 * Never advertise this adapter as genuine AI image generation.
 */
export type GenerationCapability = 'text-to-image' | 'variation'
export type Aspect = 'square' | 'portrait' | 'landscape'
export interface GenerationRequest {
  prompt: string
  aspect: Aspect
  count: number
  capability: GenerationCapability
  referenceAssetId?: string
}
export interface GeneratedCandidate {
  id: string
  blob: Blob
  mime: 'image/png'
  width: number
  height: number
  name: string
  mock: true
}
export interface GenerationProvider {
  readonly id: 'mock-test-provider'
  readonly mock: true
  readonly remote: false
  readonly price: 0
  readonly capabilities: readonly GenerationCapability[]
  generate(request: GenerationRequest, options?: { signal?: AbortSignal; onProgress?: (fraction: number) => void }): Promise<GeneratedCandidate[]>
}
export function validateGenerationRequest(req: GenerationRequest): string | null {
  if (req.prompt.trim().length < 3) return 'Please describe the image in at least three characters.'
  if (req.prompt.length > 1200) return 'The description is too long (maximum 1,200 characters).'
  if (!['square', 'portrait', 'landscape'].includes(req.aspect)) return 'Unsupported aspect ratio.'
  if (!Number.isInteger(req.count) || req.count < 1 || req.count > 4) return 'Choose between one and four candidates.'
  if (!['text-to-image', 'variation'].includes(req.capability)) return 'Unsupported generation capability.'
  if (req.capability === 'variation' && !req.referenceAssetId) return 'Select an existing asset for a variation.'
  return null
}
export function dimensionsFor(aspect: Aspect): { width: number; height: number } {
  return aspect === 'portrait' ? { width: 768, height: 1024 } : aspect === 'landscape' ? { width: 1024, height: 768 } : { width: 1024, height: 1024 }
}
export function aborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError')
}
export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  aborted(signal)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
    function onAbort() { clearTimeout(timer); reject(new DOMException('Generation cancelled.', 'AbortError')) }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
/** Deliberately recognisable geometric TEST artwork, not a fake model output. */
export async function renderMockPng(req: GenerationRequest, index: number): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('Mock rendering requires a browser canvas.')
  const { width, height } = dimensionsFor(req.aspect)
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas rendering is unavailable.')
  const palettes = [['#182b3a','#f0aa62'],['#263342','#8bc5cb'],['#1e3640','#e4c17a'],['#322d42','#a4b8d4']]
  const [dark, accent] = palettes[index % palettes.length]
  ctx.fillStyle = dark; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.arc(width * .5, height * .43, Math.min(width, height) * .22, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = dark; ctx.fillRect(width * .2, height * .52, width * .6, height * .18)
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
  ctx.font = 'bold 32px sans-serif'; ctx.fillText('MOCK IMAGE — NOT AI', width / 2, height * .83)
  ctx.font = '20px sans-serif'; ctx.fillText('Local demonstration candidate ' + (index + 1), width / 2, height * .88)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'))
}
export function createMockGenerationProvider(renderer: (req: GenerationRequest, index: number) => Promise<Blob> = renderMockPng): GenerationProvider {
  return {
    id: 'mock-test-provider', mock: true, remote: false, price: 0,
    capabilities: ['text-to-image', 'variation'],
    async generate(req, options = {}) {
      const error = validateGenerationRequest(req)
      if (error) throw new Error(error)
      const results: GeneratedCandidate[] = []
      const { width, height } = dimensionsFor(req.aspect)
      for (let index = 0; index < req.count; index++) {
        aborted(options.signal)
        await sleepWithSignal(100, options.signal)
        const blob = await renderer(req, index)
        aborted(options.signal)
        if (blob.type !== 'image/png' || !blob.size) throw new Error('Mock provider returned an invalid PNG.')
        results.push({
          id: 'mock-' + index + '-' + Date.now().toString(36),
          blob, mime: 'image/png', width, height,
          name: 'Mock candidate ' + (index + 1), mock: true,
        })
        options.onProgress?.((index + 1) / req.count)
      }
      return results
    },
  }
}
