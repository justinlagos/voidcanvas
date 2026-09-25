// Runs Void effects off the main thread. One message in (image + effect + params), one message out (image).
import { applyEffect } from './effects'
import type { EffectParams, EffectType } from '@/store/useStore'

export interface EffectJob { id: number; width: number; height: number; data: ArrayBuffer; effect: EffectType; params: EffectParams }
export interface EffectResult { id: number; width: number; height: number; data: ArrayBuffer; ms: number }

self.onmessage = (e: MessageEvent<EffectJob>) => {
  const { id, width, height, data, effect, params } = e.data
  const t0 = performance.now()
  const img = new ImageData(new Uint8ClampedArray(data), width, height)
  const out = applyEffect(null, img, effect, params)
  const buf = out.data.buffer as ArrayBuffer
  const msg: EffectResult = { id, width, height, data: buf, ms: performance.now() - t0 }
  ;(self as unknown as Worker).postMessage(msg, [buf])
}
