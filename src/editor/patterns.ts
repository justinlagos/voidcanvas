import type { PatternOverlayStyle } from './types'
const tiles = new Map<string, HTMLCanvasElement>()
function mk(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
export async function preparePattern(data: string) {
  if (tiles.has(data)) return
  const im = new Image()
  im.src = data
  await im.decode()
  const c = mk(im.width, im.height)
  c.getContext('2d')!.drawImage(im, 0, 0)
  tiles.set(data, c)
}
export function patternTile(e: PatternOverlayStyle) {
  const key = e.asset ?? e.pattern,
    hit = tiles.get(key)
  if (hit) return hit
  if (e.asset) {
    preparePattern(e.asset)
      .then(() => window.dispatchEvent(new Event('vc:pattern-ready')))
      .catch(() => {})
    return null
  }
  const c = mk(24, 24),
    x = c.getContext('2d')!
  x.fillStyle = '#ece9df'
  x.fillRect(0, 0, 24, 24)
  x.strokeStyle = '#777080'
  x.fillStyle = '#777080'
  x.lineWidth = 2
  if (e.pattern === 'dots') {
    x.beginPath()
    x.arc(12, 12, 3, 0, Math.PI * 2)
    x.fill()
  } else if (e.pattern === 'grid') {
    x.strokeRect(0, 0, 24, 24)
  } else {
    for (let i = -24; i <= 24; i += 12) {
      x.beginPath()
      x.moveTo(i, 0)
      x.lineTo(i + 24, 24)
      x.stroke()
    }
  }
  tiles.set(key, c)
  return c
}
export function paintPattern(
  x: CanvasRenderingContext2D,
  e: PatternOverlayStyle,
  w: number,
  h: number,
  renderScale = 1,
) {
  const tile = patternTile(e)
  if (!tile) return
  const p = x.createPattern(tile, 'repeat')
  if (!p) return
  p.setTransform(
    new DOMMatrix()
      .translate(e.offsetX * renderScale, e.offsetY * renderScale)
      .rotate(e.angle)
      .scale((e.scale / 100) * renderScale),
  )
  x.fillStyle = p
  x.fillRect(0, 0, w, h)
}
