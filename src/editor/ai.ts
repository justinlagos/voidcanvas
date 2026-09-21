import { ctx2d, makeCanvas } from './engine'

// Background removal runs fully in the browser: no upload, no API key, no per-image cost.
// transformers.js (Apache-2.0) is loaded from a CDN at first use so it never weighs on the main bundle.
// Model: MODNet (Apache-2.0). It is trained on people, so it is strongest on portraits.
// Swap MODEL for a general-subject model or a hosted API when product shots matter.

const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0'

// person: MODNet, 26 MB, fast, runs anywhere. Trained on people.
// any:    BiRefNet lite (MIT), 115 MB, handles products, animals, objects. Needs WebGPU to run at a usable speed.
const MODELS = {
  person: { id: 'Xenova/modnet', options: { dtype: 'fp32' } },
  any: { id: 'onnx-community/BiRefNet_lite-ONNX', options: { dtype: 'fp16', device: 'webgpu' } },
} as const
type Mode = keyof typeof MODELS

const ready: Partial<Record<Mode, Promise<{ T: any; model: any; processor: any }>>> = {}

function load(mode: Mode, onStatus: (s: string) => void) {
  if (!ready[mode]) {
    const p = (async () => {
      onStatus('Loading the background remover (first time only)')
      const T: any = await import(/* webpackIgnore: true */ LIB)
      const progress_callback = (x: any) => { if (x.status === 'progress' && x.file?.endsWith('.onnx')) onStatus(`Downloading model ${Math.round(x.progress)}%`) }
      const model = await T.AutoModel.from_pretrained(MODELS[mode].id, { ...MODELS[mode].options, progress_callback })
      const processor = await T.AutoProcessor.from_pretrained(MODELS[mode].id)
      return { T, model, processor }
    })()
    ready[mode] = p
    p.catch(() => { delete ready[mode] })
  }
  return ready[mode]!
}

/** Returns an alpha mask (opaque = subject) the same size as the input. */
export async function subjectMask(src: HTMLCanvasElement, onStatus: (s: string) => void, mode: Mode = 'person'): Promise<HTMLCanvasElement> {
  if (mode === 'any' && !(navigator as any).gpu) {
    onStatus('This browser cannot run the any-subject model. Using the standard one.')
    mode = 'person'
  }
  let loaded
  try { loaded = await load(mode, onStatus) } catch (e) { if (mode === 'person') throw e; mode = 'person'; loaded = await load(mode, onStatus) }
  const { T, model, processor } = loaded
  onStatus('Finding the subject')
  const image = T.RawImage.fromCanvas(src)
  const { pixel_values } = await processor(image)
  let tensor
  if (mode === 'any') { const { output_image } = await model({ input_image: pixel_values }); tensor = output_image[0].sigmoid().mul(255).to('uint8') }
  else { const { output } = await model({ input: pixel_values }); tensor = output[0].mul(255).to('uint8') }
  const matte = await T.RawImage.fromTensor(tensor).resize(src.width, src.height)
  const out = makeCanvas(src.width, src.height)
  const x = ctx2d(out)
  const img = x.createImageData(src.width, src.height)
  const ch = matte.channels
  for (let i = 0, p = 0; i < img.data.length; i += 4, p += ch) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
    img.data[i + 3] = matte.data[p]
  }
  x.putImageData(img, 0, 0)
  return out
}
