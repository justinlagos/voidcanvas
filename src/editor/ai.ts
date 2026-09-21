import { ctx2d, makeCanvas } from './engine'

// Background removal runs fully in the browser: no upload, no API key, no per-image cost.
// transformers.js (Apache-2.0) is loaded from a CDN at first use so it never weighs on the main bundle.
// Model: MODNet (Apache-2.0). It is trained on people, so it is strongest on portraits.
// Swap MODEL for a general-subject model or a hosted API when product shots matter.

const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0'
const MODEL = 'Xenova/modnet'

let ready: Promise<{ T: any; model: any; processor: any }> | null = null

function load(onStatus: (s: string) => void) {
  if (!ready) {
    ready = (async () => {
      onStatus('Loading the background remover (first time only)')
      const T: any = await import(/* webpackIgnore: true */ LIB)
      const progress_callback = (p: any) => { if (p.status === 'progress' && p.file?.endsWith('.onnx')) onStatus(`Downloading model ${Math.round(p.progress)}%`) }
      const model = await T.AutoModel.from_pretrained(MODEL, { dtype: 'fp32', progress_callback })
      const processor = await T.AutoProcessor.from_pretrained(MODEL)
      return { T, model, processor }
    })()
    ready.catch(() => { ready = null })
  }
  return ready
}

/** Returns an alpha mask (opaque = subject) the same size as the input. */
export async function subjectMask(src: HTMLCanvasElement, onStatus: (s: string) => void): Promise<HTMLCanvasElement> {
  const { T, model, processor } = await load(onStatus)
  onStatus('Finding the subject')
  const image = T.RawImage.fromCanvas(src)
  const { pixel_values } = await processor(image)
  const { output } = await model({ input: pixel_values })
  const matte = await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(src.width, src.height)
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
