import { brushTip, ctx2d, makeCanvas } from './engine'
import type { ToolOptions } from './types'
const assets = new Map<string, HTMLCanvasElement>()
const tips = new Map<string, HTMLCanvasElement>()
export async function loadTip(url: string) {
  if (assets.has(url)) return assets.get(url)!
  const img = new Image()
  img.src = url
  await img.decode()
  const c = makeCanvas(Math.min(512, img.width), Math.min(512, img.height))
  ctx2d(c).drawImage(img, 0, 0, c.width, c.height)
  if (assets.size >= 16) assets.delete(Array.from(assets.keys())[0])
  assets.set(url, c)
  return c
}
export function texturedTip(size: number, hardness: number, color: string, o: ToolOptions) {
  const sizeLimit = Math.min(1024, size),
    name = o.tip ?? 'round',
    asset = o.tipAsset
  if (name === 'round' && !asset && !(o.angle || (o.roundness && o.roundness !== 1)))
    return brushTip(sizeLimit, hardness, color)
  const key = [Math.round(sizeLimit), hardness.toFixed(2), color, name, asset, o.angle, o.roundness].join(
      '|',
    ),
    hit = tips.get(key)
  if (hit) return hit
  const c = makeCanvas(sizeLimit + 2, sizeLimit + 2),
    x = ctx2d(c),
    r = sizeLimit / 2
  x.translate(c.width / 2, c.height / 2)
  x.rotate(((o.angle ?? 0) * Math.PI) / 180)
  x.scale(1, Math.max(0.05, o.roundness ?? 1))
  if (asset && assets.has(asset)) {
    x.drawImage(assets.get(asset)!, -r, -r, sizeLimit, sizeLimit)
  } else if (name === 'chalk' || name === 'scatter') {
    let seed = 17
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return (seed >>> 0) / 4294967296
    }
    const n = name === 'chalk' ? 450 : 35
    x.fillStyle = '#fff'
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2,
        d = Math.sqrt(rand()) * r,
        sz = (name === 'chalk' ? 0.012 : 0.035) * sizeLimit * (0.5 + rand())
      x.globalAlpha = 0.3 + rand() * 0.7
      x.beginPath()
      x.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.5, sz), 0, Math.PI * 2)
      x.fill()
    }
  } else if (name === 'flat') {
    x.fillStyle = '#fff'
    x.fillRect(-r, -r * 0.18, sizeLimit, r * 0.36)
  } else x.drawImage(brushTip(sizeLimit, hardness, '#ffffff'), -c.width / 2, -c.height / 2)
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  if (tips.size >= 32) tips.clear()
  tips.set(key, c)
  return c
}
export interface BrushPreset {
  name: string
  options: Partial<ToolOptions>
}
export const DEFAULT_BRUSHES: BrushPreset[] = [
  {
    name: 'Soft round',
    options: { tip: 'round', tipAsset: undefined, hardness: 0, spacing: 0.12, roundness: 1, angle: 0 },
  },
  {
    name: 'Chalk',
    options: {
      tip: 'chalk',
      tipAsset: undefined,
      hardness: 1,
      spacing: 0.08,
      flow: 0.65,
      roundness: 1,
      angle: 0,
    },
  },
  {
    name: 'Dry scatter',
    options: { tip: 'scatter', tipAsset: undefined, spacing: 0.2, flow: 0.4, roundness: 1, angle: 0 },
  },
  {
    name: 'Flat ink',
    options: { tip: 'flat', tipAsset: undefined, spacing: 0.06, roundness: 1, angle: -35 },
  },
]
export function readBrushes(): BrushPreset[] {
  try {
    const value = JSON.parse(localStorage.getItem('vc-brush-presets') ?? '[]')
    return Array.isArray(value)
      ? value
          .filter((p) => typeof p?.name === 'string' && p?.options && typeof p.options === 'object')
          .slice(0, 24)
      : []
  } catch {
    return []
  }
}
export function saveBrushes(list: BrushPreset[]) {
  localStorage.setItem('vc-brush-presets', JSON.stringify(list.slice(0, 24)))
}
