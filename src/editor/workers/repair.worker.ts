import { healPixels } from '../healing'
import { liquifyPixels } from '../liquify'
const port = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}
port.onmessage = (e: MessageEvent) => {
  try {
    const d = e.data,
      result =
        d.kind === 'heal'
          ? healPixels(d.src, d.hole, d.excluded, d.w, d.h)
          : liquifyPixels(d.src, d.w, d.h, d.strokes)
    port.postMessage({ result }, result ? [result.buffer as ArrayBuffer] : [])
  } catch (err) {
    port.postMessage({ error: String(err) })
  }
}
