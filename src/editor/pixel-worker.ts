import type { LiquifyDab } from './liquify'
export function runPixels(job: {
  kind: 'heal' | 'liquify'
  src: Uint8ClampedArray
  w: number
  h: number
  hole?: Uint8ClampedArray
  excluded?: Uint8ClampedArray
  strokes?: LiquifyDab[]
}) {
  return new Promise<Uint8ClampedArray | null>((resolve, reject) => {
    const worker = new Worker(new URL('./workers/repair.worker.ts', import.meta.url))
    const timer = setTimeout(() => {
      worker.terminate()
      reject(Error('This repair exceeded the processing limit. Try a smaller area.'))
    }, 60000)
    worker.onmessage = (e) => {
      clearTimeout(timer)
      worker.terminate()
      if (e.data.error) reject(Error(e.data.error))
      else resolve(e.data.result)
    }
    worker.onerror = (e) => {
      clearTimeout(timer)
      worker.terminate()
      reject(Error(e.message || 'Pixel worker could not start.'))
    }
    worker.postMessage(job)
  })
}
