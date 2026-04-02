import { EffectType, EffectParams } from '@/store/useStore'

type ImageDataType = ImageData

// ─── Utility helpers ───────────────────────────────────────────────

function clamp(v: number): number { return Math.max(0, Math.min(255, v)) }
function clampInt(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.floor(v))) }

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 0, g: 0, b: 0 }
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getGray(data: Uint8ClampedArray, i: number): number {
  return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
}

function sampleBilinear(data: Uint8ClampedArray, w: number, h: number, fx: number, fy: number, c: number): number {
  const x0 = clampInt(Math.floor(fx), 0, w - 1)
  const y0 = clampInt(Math.floor(fy), 0, h - 1)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const dx = fx - x0, dy = fy - y0
  const tl = data[(y0 * w + x0) * 4 + c]
  const tr = data[(y0 * w + x1) * 4 + c]
  const bl = data[(y1 * w + x0) * 4 + c]
  const br = data[(y1 * w + x1) * 4 + c]
  return tl * (1 - dx) * (1 - dy) + tr * dx * (1 - dy) + bl * (1 - dx) * dy + br * dx * dy
}

// ─── Main effect dispatcher ────────────────────────────────────────

export function applyEffect(
  ctx: CanvasRenderingContext2D,
  imageData: ImageDataType,
  effect: EffectType,
  params: EffectParams
): ImageDataType {
  const { width: w, height: h } = imageData
  const data = new Uint8ClampedArray(imageData.data)
  const output = ctx.createImageData(w, h)
  const out = output.data

  // Copy original as base
  for (let i = 0; i < data.length; i++) out[i] = data[i]

  switch (effect) {
    case 'none': break

    // ═══════════════════════════════════════════════
    //  ARTISTIC
    // ═══════════════════════════════════════════════

    case 'halftone': {
      const dotSize = Math.max(2, Math.floor(params.scale / 8))
      const contrast = params.intensity / 50
      for (let i = 0; i < out.length; i += 4) { out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 255 }
      for (let y = 0; y < h; y += dotSize) {
        for (let x = 0; x < w; x += dotSize) {
          const idx = (y * w + x) * 4
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          const radius = ((255 - gray) / 255) * (dotSize / 2) * contrast
          for (let dy = -dotSize; dy <= dotSize; dy++) {
            for (let dx = -dotSize; dx <= dotSize; dx++) {
              if (dx * dx + dy * dy <= radius * radius) {
                const px = x + dx, py = y + dy
                if (px >= 0 && px < w && py >= 0 && py < h) {
                  const pidx = (py * w + px) * 4
                  out[pidx] = 0; out[pidx + 1] = 0; out[pidx + 2] = 0
                }
              }
            }
          }
        }
      }
      break
    }

    case 'dither': {
      const thresh = params.threshold * 2.55
      const grayData = new Float32Array(w * h)
      for (let i = 0; i < w * h; i++) { const idx = i * 4; grayData[i] = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x
          const oldP = grayData[i], newP = oldP > thresh ? 255 : 0, err = oldP - newP
          grayData[i] = newP
          if (x + 1 < w) grayData[i + 1] += err * 7 / 16
          if (y + 1 < h) {
            if (x > 0) grayData[i + w - 1] += err * 3 / 16
            grayData[i + w] += err * 5 / 16
            if (x + 1 < w) grayData[i + w + 1] += err / 16
          }
        }
      }
      for (let i = 0; i < w * h; i++) {
        const v = clamp(grayData[i]); const idx = i * 4
        out[idx] = v; out[idx + 1] = v; out[idx + 2] = v
      }
      break
    }

    case 'ascii': {
      const chars = ' .:-=+*#%@'
      const cellSize = Math.max(4, Math.floor(params.scale / 6))
      for (let i = 0; i < out.length; i += 4) { out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 255 }
      for (let y = 0; y < h; y += cellSize) {
        for (let x = 0; x < w; x += cellSize) {
          let br = 0, cnt = 0
          for (let dy = 0; dy < cellSize && y + dy < h; dy++) for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4; br += (data[idx] + data[idx + 1] + data[idx + 2]) / 3; cnt++
          }
          br /= cnt
          const ci = Math.floor((br / 255) * (chars.length - 1))
          const v = ci > 3 ? 255 : 0
          for (let dy = 0; dy < cellSize && y + dy < h; dy++) for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4; out[idx] = v; out[idx + 1] = v; out[idx + 2] = v
          }
        }
      }
      break
    }

    case 'mosaic': {
      const ts = Math.max(4, Math.floor(params.scale / 3))
      for (let ty = 0; ty < h; ty += ts) {
        for (let tx = 0; tx < w; tx += ts) {
          let r = 0, g = 0, b = 0, c = 0
          for (let dy = 0; dy < ts && ty + dy < h; dy++) for (let dx = 0; dx < ts && tx + dx < w; dx++) {
            const idx = ((ty + dy) * w + (tx + dx)) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++
          }
          r = Math.floor(r / c); g = Math.floor(g / c); b = Math.floor(b / c)
          for (let dy = 0; dy < ts && ty + dy < h; dy++) for (let dx = 0; dx < ts && tx + dx < w; dx++) {
            const idx = ((ty + dy) * w + (tx + dx)) * 4
            const border = dx === 0 || dy === 0
            out[idx] = border ? r * 0.6 : r; out[idx + 1] = border ? g * 0.6 : g; out[idx + 2] = border ? b * 0.6 : b
          }
        }
      }
      break
    }

    case 'oilPaint': {
      const rad = Math.max(1, Math.floor(params.radius / 15))
      const levels = Math.max(4, Math.floor(params.intensity / 5))
      for (let y = rad; y < h - rad; y++) {
        for (let x = rad; x < w - rad; x++) {
          const bins = new Array(levels).fill(0)
          const bR = new Array(levels).fill(0), bG = new Array(levels).fill(0), bB = new Array(levels).fill(0)
          for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4
            const gr = Math.floor(((data[idx] + data[idx + 1] + data[idx + 2]) / 3) / 255 * (levels - 1))
            bins[gr]++; bR[gr] += data[idx]; bG[gr] += data[idx + 1]; bB[gr] += data[idx + 2]
          }
          let maxB = 0, maxC = 0
          for (let i = 0; i < levels; i++) if (bins[i] > maxC) { maxC = bins[i]; maxB = i }
          const idx = (y * w + x) * 4
          out[idx] = bR[maxB] / maxC; out[idx + 1] = bG[maxB] / maxC; out[idx + 2] = bB[maxB] / maxC
        }
      }
      break
    }

    case 'crosshatch': {
      const cellSize = Math.max(3, Math.floor(params.scale / 8))
      const levels = 4
      // White background
      for (let i = 0; i < out.length; i += 4) { out[i] = 245; out[i + 1] = 240; out[i + 2] = 230; out[i + 3] = 255 }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          const gray = getGray(data, idx) / 255
          const dark = 1 - gray
          const level = Math.floor(dark * levels)
          let draw = false
          // Level 1: diagonal lines /
          if (level >= 1 && (x + y) % cellSize === 0) draw = true
          // Level 2: diagonal lines \
          if (level >= 2 && (x - y + 1000) % cellSize === 0) draw = true
          // Level 3: horizontal
          if (level >= 3 && y % cellSize === 0) draw = true
          // Level 4: vertical
          if (level >= 4 && x % cellSize === 0) draw = true
          if (draw) {
            out[idx] = 30; out[idx + 1] = 25; out[idx + 2] = 20
          }
        }
      }
      break
    }

    case 'stipple': {
      const dotDensity = params.density / 10
      const seed = params.seed
      // Light background
      for (let i = 0; i < out.length; i += 4) { out[i] = 245; out[i + 1] = 240; out[i + 2] = 232; out[i + 3] = 255 }
      const cellSize = Math.max(2, Math.floor(params.scale / 15))
      for (let cy = 0; cy < h; cy += cellSize) {
        for (let cx = 0; cx < w; cx += cellSize) {
          let br = 0, cnt = 0
          for (let dy = 0; dy < cellSize && cy + dy < h; dy++) for (let dx = 0; dx < cellSize && cx + dx < w; dx++) {
            const idx = ((cy + dy) * w + (cx + dx)) * 4; br += getGray(data, idx); cnt++
          }
          br /= cnt
          const darkness = 1 - br / 255
          const numDots = Math.floor(darkness * dotDensity * cellSize)
          for (let d = 0; d < numDots; d++) {
            const px = cx + Math.floor(seededRandom(seed + cy * w + cx + d * 7) * cellSize)
            const py = cy + Math.floor(seededRandom(seed + cy * w + cx + d * 13 + 1000) * cellSize)
            if (px < w && py < h) {
              const idx = (py * w + px) * 4
              out[idx] = 25; out[idx + 1] = 20; out[idx + 2] = 18
            }
          }
        }
      }
      break
    }

    case 'watercolor': {
      // Multi-pass blur with color quantization
      const rad = Math.max(2, Math.floor(params.radius / 12))
      const levels = Math.max(8, Math.floor(params.intensity / 4))
      const step = 255 / levels
      // First: box blur
      const blurred = new Uint8ClampedArray(data.length)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, c = 0
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const idx = (ny * w + nx) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++
          }
        }
        const idx = (y * w + x) * 4
        blurred[idx] = r / c; blurred[idx + 1] = g / c; blurred[idx + 2] = b / c; blurred[idx + 3] = 255
      }
      // Second pass: quantize + subtle edge darkening
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        out[idx] = Math.floor(blurred[idx] / step) * step + step * 0.3
        out[idx + 1] = Math.floor(blurred[idx + 1] / step) * step + step * 0.3
        out[idx + 2] = Math.floor(blurred[idx + 2] / step) * step + step * 0.3
        // Edge detection for watercolor boundaries
        if (y > 0 && x > 0 && y < h - 1 && x < w - 1) {
          const diff = Math.abs(getGray(blurred, idx) - getGray(blurred, ((y - 1) * w + x) * 4)) +
                       Math.abs(getGray(blurred, idx) - getGray(blurred, (y * w + (x - 1)) * 4))
          if (diff > 15) {
            out[idx] *= 0.85; out[idx + 1] *= 0.85; out[idx + 2] *= 0.85
          }
        }
      }
      break
    }

    case 'sketch': {
      const strength = params.intensity / 20
      // Edge-based pencil sketch
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4
        let gx = 0, gy = 0
        for (let c = 0; c < 3; c++) {
          const l = data[(y * w + (x - 1)) * 4 + c], r = data[(y * w + (x + 1)) * 4 + c]
          const t = data[((y - 1) * w + x) * 4 + c], b = data[((y + 1) * w + x) * 4 + c]
          gx += r - l; gy += b - t
        }
        const edge = Math.min(255, Math.sqrt(gx * gx + gy * gy) / 3 * strength)
        const v = 255 - edge
        out[idx] = v; out[idx + 1] = v; out[idx + 2] = v
      }
      break
    }

    case 'popart': {
      const colors = [
        [255, 0, 100], [0, 200, 255], [255, 220, 0], [255, 80, 0],
        [0, 255, 130], [200, 0, 255], [255, 150, 200], [0, 100, 255],
      ]
      const levels = Math.max(3, Math.floor(params.intensity / 12))
      const step = 255 / levels
      for (let i = 0; i < data.length; i += 4) {
        const gray = getGray(data, i)
        const level = Math.floor(gray / step)
        const palette = colors[level % colors.length]
        // Blend original hue with pop art palette
        const blend = params.amount / 100
        out[i] = clamp(data[i] * (1 - blend) + palette[0] * blend)
        out[i + 1] = clamp(data[i + 1] * (1 - blend) + palette[1] * blend)
        out[i + 2] = clamp(data[i + 2] * (1 - blend) + palette[2] * blend)
      }
      break
    }

    case 'pointillism': {
      const dotR = Math.max(2, Math.floor(params.scale / 10))
      const spacing = dotR * 2
      const seed = params.seed
      // Fill with dark background
      for (let i = 0; i < out.length; i += 4) { out[i] = 20; out[i + 1] = 18; out[i + 2] = 15; out[i + 3] = 255 }
      for (let cy = 0; cy < h; cy += spacing) {
        for (let cx = 0; cx < w; cx += spacing) {
          // Jitter position
          const jx = cx + Math.floor((seededRandom(seed + cy * 1000 + cx) - 0.5) * spacing * 0.6)
          const jy = cy + Math.floor((seededRandom(seed + cy * 1000 + cx + 500) - 0.5) * spacing * 0.6)
          if (jx < 0 || jx >= w || jy < 0 || jy >= h) continue
          const sIdx = (jy * w + jx) * 4
          // Draw colored dot
          for (let dy = -dotR; dy <= dotR; dy++) for (let dx = -dotR; dx <= dotR; dx++) {
            if (dx * dx + dy * dy <= dotR * dotR) {
              const px = jx + dx, py = jy + dy
              if (px >= 0 && px < w && py >= 0 && py < h) {
                const idx = (py * w + px) * 4
                out[idx] = data[sIdx]; out[idx + 1] = data[sIdx + 1]; out[idx + 2] = data[sIdx + 2]
              }
            }
          }
        }
      }
      break
    }

    case 'woodcut': {
      const thresh = params.threshold * 2.55
      const lineGap = Math.max(2, Math.floor(params.scale / 12))
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const gray = getGray(data, idx)
        const darkness = 1 - gray / 255
        // Wood grain line pattern
        const lineFactor = Math.sin((y + x * 0.3) / lineGap * Math.PI) * 0.5 + 0.5
        const cut = darkness > (lineFactor * 0.6 + 0.2) ? 0 : 240
        out[idx] = cut; out[idx + 1] = cut; out[idx + 2] = cut === 0 ? 5 : 235
      }
      break
    }

    // ═══════════════════════════════════════════════
    //  STYLIZE
    // ═══════════════════════════════════════════════

    case 'pixelate': {
      const size = Math.max(1, Math.floor(params.scale / 5))
      for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
        let r = 0, g = 0, b = 0, c = 0
        for (let dy = 0; dy < size && y + dy < h; dy++) for (let dx = 0; dx < size && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++
        }
        r = Math.floor(r / c); g = Math.floor(g / c); b = Math.floor(b / c)
        for (let dy = 0; dy < size && y + dy < h; dy++) for (let dx = 0; dx < size && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4; out[idx] = r; out[idx + 1] = g; out[idx + 2] = b
        }
      }
      break
    }

    case 'posterize': {
      const levels = Math.max(2, Math.floor(params.intensity / 10))
      const step = 255 / levels
      for (let i = 0; i < data.length; i += 4) {
        out[i] = Math.floor(data[i] / step) * step
        out[i + 1] = Math.floor(data[i + 1] / step) * step
        out[i + 2] = Math.floor(data[i + 2] / step) * step
      }
      break
    }

    case 'edge': {
      const thresh = params.threshold
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4
        let gx = 0, gy = 0
        for (let c = 0; c < 3; c++) {
          const tl = data[((y - 1) * w + (x - 1)) * 4 + c], t = data[((y - 1) * w + x) * 4 + c], tr = data[((y - 1) * w + (x + 1)) * 4 + c]
          const l = data[(y * w + (x - 1)) * 4 + c], r = data[(y * w + (x + 1)) * 4 + c]
          const bl = data[((y + 1) * w + (x - 1)) * 4 + c], b = data[((y + 1) * w + x) * 4 + c], br = data[((y + 1) * w + (x + 1)) * 4 + c]
          gx += (-tl - 2 * l - bl + tr + 2 * r + br)
          gy += (-tl - 2 * t - tr + bl + 2 * b + br)
        }
        const g = Math.min(255, Math.sqrt(gx * gx + gy * gy) / 3)
        const v = g > thresh ? 255 : 0
        out[idx] = v; out[idx + 1] = v; out[idx + 2] = v
      }
      break
    }

    case 'emboss': {
      const strength = params.intensity / 25
      const a = (params.angle / 180) * Math.PI
      const dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a))
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4
        for (let c = 0; c < 3; c++) {
          const prev = data[((y - dy) * w + (x - dx)) * 4 + c]
          const next = data[((y + dy) * w + (x + dx)) * 4 + c]
          out[idx + c] = clamp(128 + (next - prev) * strength)
        }
      }
      break
    }

    case 'threshold': {
      const thresh = params.threshold * 2.55
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
        const v = gray > thresh ? 255 : 0
        out[i] = v; out[i + 1] = v; out[i + 2] = v
      }
      break
    }

    case 'solarize': {
      const thresh = params.threshold * 2.55
      for (let i = 0; i < data.length; i += 4) {
        out[i] = data[i] > thresh ? 255 - data[i] : data[i]
        out[i + 1] = data[i + 1] > thresh ? 255 - data[i + 1] : data[i + 1]
        out[i + 2] = data[i + 2] > thresh ? 255 - data[i + 2] : data[i + 2]
      }
      break
    }

    case 'kaleidoscope': {
      const segs = Math.max(2, Math.round(params.segments))
      const cx = w / 2, cy = h / 2
      const angleStep = (Math.PI * 2) / segs
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let dx = x - cx, dy = y - cy
        let angle = Math.atan2(dy, dx)
        const dist = Math.sqrt(dx * dx + dy * dy)
        // Map angle to first segment
        angle = angle < 0 ? angle + Math.PI * 2 : angle
        let seg = angle / angleStep
        seg = seg - Math.floor(seg)
        // Mirror alternating segments
        if (Math.floor(angle / angleStep) % 2 === 1) seg = 1 - seg
        const mappedAngle = seg * angleStep
        const srcX = clampInt(Math.floor(cx + Math.cos(mappedAngle) * dist), 0, w - 1)
        const srcY = clampInt(Math.floor(cy + Math.sin(mappedAngle) * dist), 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4
        const dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    case 'mirror': {
      const axis = params.angle < 90 ? 'horizontal' : params.angle < 180 ? 'vertical' : params.angle < 270 ? 'quad' : 'diagonal'
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let srcX = x, srcY = y
        if (axis === 'horizontal' && x > w / 2) srcX = w - 1 - x
        else if (axis === 'vertical' && y > h / 2) srcY = h - 1 - y
        else if (axis === 'quad') { if (x > w / 2) srcX = w - 1 - x; if (y > h / 2) srcY = h - 1 - y }
        else if (axis === 'diagonal') { if (x > w / 2) { srcX = w - 1 - x; srcY = h - 1 - y } }
        srcX = clampInt(srcX, 0, w - 1); srcY = clampInt(srcY, 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    case 'tiltShift': {
      // Gradient blur: sharp center band, blurry top and bottom
      const center = h * (params.posY / 100)
      const bandSize = h * (params.scale / 200)
      const maxBlur = Math.max(1, Math.floor(params.intensity / 10))
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dist = Math.abs(y - center)
        const factor = Math.max(0, (dist - bandSize) / (h * 0.3))
        const rad = Math.floor(factor * maxBlur)
        if (rad <= 0) continue
        let r = 0, g = 0, b = 0, c = 0
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const idx = (ny * w + nx) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++
          }
        }
        const idx = (y * w + x) * 4
        out[idx] = r / c; out[idx + 1] = g / c; out[idx + 2] = b / c
      }
      break
    }

    case 'crystallize': {
      const cellSize = Math.max(4, Math.floor(params.scale / 4))
      const seed = params.seed
      // Generate Voronoi-like points
      const numX = Math.ceil(w / cellSize) + 1, numY = Math.ceil(h / cellSize) + 1
      const points: { x: number; y: number; r: number; g: number; b: number }[] = []
      for (let py = 0; py < numY; py++) for (let px = 0; px < numX; px++) {
        const x = clampInt(px * cellSize + Math.floor((seededRandom(seed + py * 1000 + px) - 0.5) * cellSize), 0, w - 1)
        const y = clampInt(py * cellSize + Math.floor((seededRandom(seed + py * 1000 + px + 500) - 0.5) * cellSize), 0, h - 1)
        const idx = (y * w + x) * 4
        points.push({ x, y, r: data[idx], g: data[idx + 1], b: data[idx + 2] })
      }
      // Assign each pixel to nearest point
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let minDist = Infinity, nearest = points[0]
        // Only check nearby points for speed
        const gpx = Math.floor(x / cellSize), gpy = Math.floor(y / cellSize)
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const pi = (gpy + dy) * numX + (gpx + dx)
          if (pi >= 0 && pi < points.length) {
            const p = points[pi]
            const d = (p.x - x) ** 2 + (p.y - y) ** 2
            if (d < minDist) { minDist = d; nearest = p }
          }
        }
        const idx = (y * w + x) * 4
        out[idx] = nearest.r; out[idx + 1] = nearest.g; out[idx + 2] = nearest.b
      }
      break
    }

    case 'lowpoly': {
      // Large triangle-based pixelation
      const ts = Math.max(8, Math.floor(params.scale / 2))
      for (let ty = 0; ty < h; ty += ts) for (let tx = 0; tx < w; tx += ts) {
        // Sample two triangles per cell
        for (let tri = 0; tri < 2; tri++) {
          let r = 0, g = 0, b = 0, c = 0
          for (let dy = 0; dy < ts && ty + dy < h; dy++) for (let dx = 0; dx < ts && tx + dx < w; dx++) {
            const inUpper = dx <= dy
            if ((tri === 0 && inUpper) || (tri === 1 && !inUpper)) {
              const idx = ((ty + dy) * w + (tx + dx)) * 4
              r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++
            }
          }
          if (c === 0) continue
          r = Math.floor(r / c); g = Math.floor(g / c); b = Math.floor(b / c)
          for (let dy = 0; dy < ts && ty + dy < h; dy++) for (let dx = 0; dx < ts && tx + dx < w; dx++) {
            const inUpper = dx <= dy
            if ((tri === 0 && inUpper) || (tri === 1 && !inUpper)) {
              const idx = ((ty + dy) * w + (tx + dx)) * 4
              out[idx] = r; out[idx + 1] = g; out[idx + 2] = b
            }
          }
        }
      }
      break
    }

    // ═══════════════════════════════════════════════
    //  COLOR
    // ═══════════════════════════════════════════════

    case 'duotone': {
      const c1 = hexToRgb(params.color1), c2 = hexToRgb(params.color2)
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255
        out[i] = Math.floor(c1.r * (1 - gray) + c2.r * gray)
        out[i + 1] = Math.floor(c1.g * (1 - gray) + c2.g * gray)
        out[i + 2] = Math.floor(c1.b * (1 - gray) + c2.b * gray)
      }
      break
    }

    case 'sepia': {
      const intens = params.intensity / 100
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const sr = clamp(r * 0.393 + g * 0.769 + b * 0.189)
        const sg = clamp(r * 0.349 + g * 0.686 + b * 0.168)
        const sb = clamp(r * 0.272 + g * 0.534 + b * 0.131)
        out[i] = r + (sr - r) * intens; out[i + 1] = g + (sg - g) * intens; out[i + 2] = b + (sb - b) * intens
      }
      break
    }

    case 'invert':
      for (let i = 0; i < data.length; i += 4) {
        out[i] = 255 - data[i]; out[i + 1] = 255 - data[i + 1]; out[i + 2] = 255 - data[i + 2]
      }
      break

    case 'channelMixer': {
      const rM = params.mixR / 100, gM = params.mixG / 100, bM = params.mixB / 100
      for (let i = 0; i < data.length; i += 4) {
        out[i] = clamp(data[i] * rM); out[i + 1] = clamp(data[i + 1] * gM); out[i + 2] = clamp(data[i + 2] * bM)
      }
      break
    }

    case 'thermal': {
      for (let i = 0; i < data.length; i += 4) {
        const t = getGray(data, i) / 255
        if (t < 0.25) { const s = t / 0.25; out[i] = 0; out[i + 1] = 0; out[i + 2] = clamp(s * 255) }
        else if (t < 0.5) { const s = (t - 0.25) / 0.25; out[i] = clamp(s * 255); out[i + 1] = 0; out[i + 2] = clamp((1 - s) * 255) }
        else if (t < 0.75) { const s = (t - 0.5) / 0.25; out[i] = 255; out[i + 1] = clamp(s * 255); out[i + 2] = 0 }
        else { const s = (t - 0.75) / 0.25; out[i] = 255; out[i + 1] = 255; out[i + 2] = clamp(s * 255) }
      }
      break
    }

    case 'nightVision': {
      for (let i = 0; i < data.length; i += 4) {
        const gray = getGray(data, i) / 255
        const noise = (seededRandom(params.seed + i) - 0.5) * 30
        out[i] = clamp(gray * 40 + noise)        // R low
        out[i + 1] = clamp(gray * 255 + noise)    // G bright
        out[i + 2] = clamp(gray * 40 + noise)     // B low
        // Subtle vignette
        const x = (i / 4) % w, y = Math.floor(i / 4 / w)
        const vDist = Math.sqrt(((x - w / 2) / w) ** 2 + ((y - h / 2) / h) ** 2) * 2
        const vFade = Math.max(0, 1 - vDist * 0.6)
        out[i] *= vFade; out[i + 1] *= vFade; out[i + 2] *= vFade
      }
      break
    }

    case 'infrared': {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        // Infrared simulation: greens become bright white, reds become dark
        out[i] = clamp(255 - r + g * 0.5)
        out[i + 1] = clamp(g * 1.5)
        out[i + 2] = clamp(b * 0.3 + g * 0.5)
      }
      break
    }

    case 'cyberpunk': {
      const intens = params.intensity / 100
      for (let i = 0; i < data.length; i += 4) {
        const gray = getGray(data, i)
        // Neon color grade: cyan shadows, magenta highlights
        const t = gray / 255
        const cr = clamp(t * 255 * 0.3 + (1 - t) * 200 + data[i] * 0.3)
        const cg = clamp(t * 50 + (1 - t) * 255 * 0.8 + data[i + 1] * 0.2)
        const cb = clamp(t * 255 + (1 - t) * 200 + data[i + 2] * 0.3)
        out[i] = data[i] + (cr - data[i]) * intens
        out[i + 1] = data[i + 1] + (cg - data[i + 1]) * intens
        out[i + 2] = data[i + 2] + (cb - data[i + 2]) * intens
      }
      break
    }

    case 'vintage': {
      const intens = params.intensity / 100
      for (let i = 0; i < data.length; i += 4) {
        // Warm yellow cast + reduced contrast + slight fade
        let r = data[i], g = data[i + 1], b = data[i + 2]
        // Reduce contrast
        r = r * 0.8 + 30; g = g * 0.75 + 25; b = b * 0.65 + 20
        // Warm tint
        r = clamp(r * 1.1); g = clamp(g * 1.0); b = clamp(b * 0.85)
        out[i] = data[i] + (r - data[i]) * intens
        out[i + 1] = data[i + 1] + (g - data[i + 1]) * intens
        out[i + 2] = data[i + 2] + (b - data[i + 2]) * intens
      }
      // Add subtle vignette
      const cx = w / 2, cy = h / 2, maxD = Math.sqrt(cx * cx + cy * cy)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        const f = 1 - Math.pow(d / maxD, 1.8) * 0.5 * intens
        const idx = (y * w + x) * 4
        out[idx] *= f; out[idx + 1] *= f; out[idx + 2] *= f
      }
      break
    }

    case 'gradientMap': {
      const c1 = hexToRgb(params.color1), c2 = hexToRgb(params.color2), c3 = hexToRgb(params.color3)
      for (let i = 0; i < data.length; i += 4) {
        const t = getGray(data, i) / 255
        if (t < 0.5) {
          const s = t * 2
          out[i] = c1.r + (c2.r - c1.r) * s
          out[i + 1] = c1.g + (c2.g - c1.g) * s
          out[i + 2] = c1.b + (c2.b - c1.b) * s
        } else {
          const s = (t - 0.5) * 2
          out[i] = c2.r + (c3.r - c2.r) * s
          out[i + 1] = c2.g + (c3.g - c2.g) * s
          out[i + 2] = c2.b + (c3.b - c2.b) * s
        }
      }
      break
    }

    case 'hueShift': {
      const shift = (params.angle / 360) * 6 // 0-6 hue range
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
        let hue = 0, sat = max === 0 ? 0 : d / max, val = max
        if (d > 0) {
          if (max === r) hue = ((g - b) / d + 6) % 6
          else if (max === g) hue = (b - r) / d + 2
          else hue = (r - g) / d + 4
        }
        hue = (hue + shift) % 6
        // HSV to RGB
        const f = hue - Math.floor(hue), p = val * (1 - sat), q = val * (1 - f * sat), t2 = val * (1 - (1 - f) * sat)
        let or = 0, og = 0, ob = 0
        switch (Math.floor(hue)) {
          case 0: or = val; og = t2; ob = p; break
          case 1: or = q; og = val; ob = p; break
          case 2: or = p; og = val; ob = t2; break
          case 3: or = p; og = q; ob = val; break
          case 4: or = t2; og = p; ob = val; break
          default: or = val; og = p; ob = q
        }
        out[i] = or * 255; out[i + 1] = og * 255; out[i + 2] = ob * 255
      }
      break
    }

    case 'colorBalance': {
      // Shadows -> color1, Highlights -> color2
      const shadow = hexToRgb(params.color1), highlight = hexToRgb(params.color2)
      const intens = params.intensity / 100
      for (let i = 0; i < data.length; i += 4) {
        const lum = getGray(data, i) / 255
        // shadows affect dark tones, highlights affect bright tones
        const sr = (shadow.r - 128) / 128 * (1 - lum) * intens
        const sg = (shadow.g - 128) / 128 * (1 - lum) * intens
        const sb = (shadow.b - 128) / 128 * (1 - lum) * intens
        const hr = (highlight.r - 128) / 128 * lum * intens
        const hg = (highlight.g - 128) / 128 * lum * intens
        const hb = (highlight.b - 128) / 128 * lum * intens
        out[i] = clamp(data[i] + (sr + hr) * 128)
        out[i + 1] = clamp(data[i + 1] + (sg + hg) * 128)
        out[i + 2] = clamp(data[i + 2] + (sb + hb) * 128)
      }
      break
    }

    // ═══════════════════════════════════════════════
    //  DISTORTION
    // ═══════════════════════════════════════════════

    case 'glitch': {
      const sliceH = Math.max(1, Math.floor(params.scale / 2))
      const maxOff = Math.floor(params.intensity * 2)
      const seed = params.seed
      for (let y = 0; y < h; y++) {
        const si = Math.floor(y / sliceH)
        const rnd = seededRandom(seed + si)
        const off = rnd > 0.7 ? Math.floor((rnd - 0.5) * maxOff) : 0
        for (let x = 0; x < w; x++) {
          const srcX = clampInt(x + off, 0, w - 1)
          const srcIdx = (y * w + srcX) * 4, dstIdx = (y * w + x) * 4
          out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
        }
      }
      break
    }

    case 'rgbShift': {
      const shift = Math.floor(params.intensity / 5)
      const a = (params.angle / 180) * Math.PI
      const sx = Math.round(Math.cos(a) * shift), sy = Math.round(Math.sin(a) * shift)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const rX = clampInt(x + sx, 0, w - 1), rY = clampInt(y + sy, 0, h - 1)
        const bX = clampInt(x - sx, 0, w - 1), bY = clampInt(y - sy, 0, h - 1)
        out[idx] = data[(rY * w + rX) * 4]
        out[idx + 1] = data[idx + 1]
        out[idx + 2] = data[(bY * w + bX) * 4 + 2]
      }
      break
    }

    case 'chromatic': {
      const spread = Math.floor(params.intensity / 3)
      const a = (params.angle / 180) * Math.PI
      const dx = Math.round(Math.cos(a) * spread), dy = Math.round(Math.sin(a) * spread)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const rx = clampInt(x + dx, 0, w - 1), ry = clampInt(y + dy, 0, h - 1)
        const bx = clampInt(x - dx, 0, w - 1), by = clampInt(y - dy, 0, h - 1)
        const gx = clampInt(x + Math.round(Math.cos(a + Math.PI / 2) * spread * 0.5), 0, w - 1)
        const gy = clampInt(y + Math.round(Math.sin(a + Math.PI / 2) * spread * 0.5), 0, h - 1)
        out[idx] = data[(ry * w + rx) * 4]
        out[idx + 1] = data[(gy * w + gx) * 4 + 1]
        out[idx + 2] = data[(by * w + bx) * 4 + 2]
      }
      break
    }

    case 'wave': {
      const freq = params.frequency / 10, amp = params.amplitude / 5
      const a = (params.angle / 180) * Math.PI
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const proj = x * Math.cos(a) + y * Math.sin(a)
        const ox = Math.sin(proj / freq) * amp, oy = Math.cos(proj / freq) * amp
        const srcX = clampInt(Math.floor(x + ox), 0, w - 1), srcY = clampInt(Math.floor(y + oy), 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    case 'displacement': {
      const scale = params.intensity * 0.5
      const freq = params.frequency / 15
      const seed = params.seed
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = Math.sin(y / freq + seed) * scale + Math.cos((x + y) / (freq * 2) + seed * 0.7) * scale * 0.5
        const dy = Math.cos(x / freq + seed) * scale + Math.sin((x - y) / (freq * 2) + seed * 1.3) * scale * 0.5
        const srcX = clampInt(Math.floor(x + dx), 0, w - 1), srcY = clampInt(Math.floor(y + dy), 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    case 'crt': {
      const bulge = params.intensity / 200
      const scanGap = Math.max(3, Math.floor(params.scale / 12))
      const cx = w / 2, cy = h / 2
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let nx = (x - cx) / cx, ny = (y - cy) / cy
        const r2 = nx * nx + ny * ny
        nx *= 1 + bulge * r2; ny *= 1 + bulge * r2
        const srcX = clampInt(Math.floor(nx * cx + cx), 0, w - 1), srcY = clampInt(Math.floor(ny * cy + cy), 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        const scanDark = (y % scanGap < 1) ? 0.6 : 1.0
        const sub = x % 3
        out[dstIdx] = sub === 0 ? clamp(data[srcIdx] * scanDark * 1.2) : data[srcIdx] * scanDark * 0.8
        out[dstIdx + 1] = sub === 1 ? clamp(data[srcIdx + 1] * scanDark * 1.2) : data[srcIdx + 1] * scanDark * 0.8
        out[dstIdx + 2] = sub === 2 ? clamp(data[srcIdx + 2] * scanDark * 1.2) : data[srcIdx + 2] * scanDark * 0.8
        const edgeDist = Math.max(Math.abs(nx), Math.abs(ny))
        if (edgeDist > 0.95) {
          const fade = Math.max(0, 1 - (edgeDist - 0.95) * 20)
          out[dstIdx] *= fade; out[dstIdx + 1] *= fade; out[dstIdx + 2] *= fade
        }
      }
      break
    }

    case 'swirl': {
      const cx = w / 2, cy = h / 2
      const maxR = Math.min(w, h) / 2
      const twist = (params.intensity / 50) * Math.PI * 2
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)
        const factor = Math.max(0, 1 - dist / maxR)
        const newAngle = angle + twist * factor * factor
        const srcX = clampInt(Math.floor(cx + Math.cos(newAngle) * dist), 0, w - 1)
        const srcY = clampInt(Math.floor(cy + Math.sin(newAngle) * dist), 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    case 'fisheye': {
      const strength = params.intensity / 50
      const cx = w / 2, cy = h / 2
      const maxR = Math.sqrt(cx * cx + cy * cy)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let nx = (x - cx) / cx, ny = (y - cy) / cy
        const r = Math.sqrt(nx * nx + ny * ny)
        if (r > 0) {
          const nr = Math.pow(r, strength) / r
          nx *= nr; ny *= nr
        }
        const srcX = clampInt(Math.floor(nx * cx + cx), 0, w - 1)
        const srcY = clampInt(Math.floor(ny * cy + cy), 0, h - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    case 'motionBlur': {
      const length = Math.max(1, Math.floor(params.intensity / 5))
      const a = (params.angle / 180) * Math.PI
      const dx = Math.cos(a), dy = Math.sin(a)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0
        for (let s = 0; s < length; s++) {
          const sx = clampInt(Math.floor(x + dx * s), 0, w - 1)
          const sy = clampInt(Math.floor(y + dy * s), 0, h - 1)
          const idx = (sy * w + sx) * 4
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]
        }
        const idx = (y * w + x) * 4
        out[idx] = r / length; out[idx + 1] = g / length; out[idx + 2] = b / length
      }
      break
    }

    case 'radialBlur': {
      const strength = Math.max(1, Math.floor(params.intensity / 8))
      const cx = w * (params.posX / 100), cy = h * (params.posY / 100)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const samples = Math.max(1, Math.floor(dist / w * strength))
        let r = 0, g = 0, b = 0
        for (let s = 0; s < samples; s++) {
          const t = s / samples
          const sx = clampInt(Math.floor(cx + dx * (1 - t * 0.1)), 0, w - 1)
          const sy = clampInt(Math.floor(cy + dy * (1 - t * 0.1)), 0, h - 1)
          const idx = (sy * w + sx) * 4
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]
        }
        const idx = (y * w + x) * 4
        out[idx] = r / samples; out[idx + 1] = g / samples; out[idx + 2] = b / samples
      }
      break
    }

    case 'pixelSort': {
      // Sort pixels by brightness in horizontal bands
      const thresh = params.threshold * 2.55
      const seed = params.seed
      for (let y = 0; y < h; y++) {
        // Find sort ranges based on threshold
        const row: { r: number; g: number; b: number; gray: number }[] = []
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          row.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], gray: getGray(data, idx) })
        }
        // Sort segments where brightness > threshold
        let start = -1
        for (let x = 0; x <= w; x++) {
          const aboveThresh = x < w && row[x].gray > thresh
          if (aboveThresh && start === -1) start = x
          else if (!aboveThresh && start !== -1) {
            // Sort this segment
            const seg = row.slice(start, x).sort((a, b) => a.gray - b.gray)
            for (let i = 0; i < seg.length; i++) row[start + i] = seg[i]
            start = -1
          }
        }
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          out[idx] = row[x].r; out[idx + 1] = row[x].g; out[idx + 2] = row[x].b
        }
      }
      break
    }

    case 'sliceShift': {
      const numSlices = Math.max(2, Math.floor(params.density / 3))
      const maxShift = Math.floor(params.intensity * 3)
      const seed = params.seed
      const vertical = params.angle > 45 && params.angle < 135
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sliceIdx = vertical ? Math.floor(x / (w / numSlices)) : Math.floor(y / (h / numSlices))
        const rnd = seededRandom(seed + sliceIdx * 31)
        const shift = Math.floor((rnd - 0.5) * maxShift)
        let srcX = x, srcY = y
        if (vertical) srcY = clampInt(y + shift, 0, h - 1)
        else srcX = clampInt(x + shift, 0, w - 1)
        const srcIdx = (srcY * w + srcX) * 4, dstIdx = (y * w + x) * 4
        out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1]; out[dstIdx + 2] = data[srcIdx + 2]
      }
      break
    }

    // ═══════════════════════════════════════════════
    //  ENHANCE / TEXTURE
    // ═══════════════════════════════════════════════

    case 'blur': {
      const rad = Math.max(1, Math.floor(params.intensity / 20))
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, c = 0
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const idx = (ny * w + nx) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++
          }
        }
        const idx = (y * w + x) * 4; out[idx] = r / c; out[idx + 1] = g / c; out[idx + 2] = b / c
      }
      break
    }

    case 'sharpen': {
      const amt = params.intensity / 25
      const kernel = [0, -amt, 0, -amt, 1 + 4 * amt, -amt, 0, -amt, 0]
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) {
            sum += data[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)]
          }
          out[(y * w + x) * 4 + c] = clamp(sum)
        }
      }
      break
    }

    case 'vignette': {
      const strength = params.intensity / 50, rad = params.scale / 50
      const cx = w / 2, cy = h / 2, maxDist = Math.sqrt(cx * cx + cy * cy)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        const f = 1 - Math.pow(d / maxDist, 2 - rad) * strength
        const idx = (y * w + x) * 4
        out[idx] = data[idx] * f; out[idx + 1] = data[idx + 1] * f; out[idx + 2] = data[idx + 2] * f
      }
      break
    }

    case 'noise': {
      const amt = params.amount / 100, seed = params.seed
      for (let i = 0; i < data.length; i += 4) {
        const n = (seededRandom(seed + i) - 0.5) * 255 * amt
        out[i] = clamp(data[i] + n); out[i + 1] = clamp(data[i + 1] + n); out[i + 2] = clamp(data[i + 2] + n)
      }
      break
    }

    case 'grain': {
      const amt = params.amount / 100, seed = params.seed
      const size = Math.max(1, Math.floor(params.scale / 30))
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const gx = Math.floor(x / size), gy = Math.floor(y / size)
        const n = (seededRandom(seed + gx * 7919 + gy * 104729) - 0.5) * 255 * amt
        const idx = (y * w + x) * 4
        out[idx] = clamp(data[idx] + n); out[idx + 1] = clamp(data[idx + 1] + n); out[idx + 2] = clamp(data[idx + 2] + n)
      }
      break
    }

    case 'scanlines': {
      const gap = Math.max(2, Math.floor(params.scale / 10))
      const darkness = params.intensity / 100
      const thick = Math.max(1, Math.floor(params.density / 25))
      for (let y = 0; y < h; y++) {
        const inScan = (y % gap) < thick
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          if (inScan) { out[idx] = data[idx] * (1 - darkness); out[idx + 1] = data[idx + 1] * (1 - darkness); out[idx + 2] = data[idx + 2] * (1 - darkness) }
        }
      }
      break
    }

    case 'bloom': {
      // Bright area glow
      const thresh = params.threshold * 2.55
      const rad = Math.max(2, Math.floor(params.radius / 8))
      const strength = params.intensity / 50
      // Find bright pixels and blur them
      const bright = new Float32Array(w * h * 3)
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4
        const gray = getGray(data, idx)
        if (gray > thresh) {
          bright[i * 3] = data[idx]; bright[i * 3 + 1] = data[idx + 1]; bright[i * 3 + 2] = data[idx + 2]
        }
      }
      // Simple box blur of bright areas
      const blurred = new Float32Array(bright.length)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, c = 0
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const bi = (ny * w + nx) * 3; r += bright[bi]; g += bright[bi + 1]; b += bright[bi + 2]; c++
          }
        }
        const bi = (y * w + x) * 3; blurred[bi] = r / c; blurred[bi + 1] = g / c; blurred[bi + 2] = b / c
      }
      // Additive blend
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4, bi = i * 3
        out[idx] = clamp(data[idx] + blurred[bi] * strength)
        out[idx + 1] = clamp(data[idx + 1] + blurred[bi + 1] * strength)
        out[idx + 2] = clamp(data[idx + 2] + blurred[bi + 2] * strength)
      }
      break
    }

    case 'freeze': {
      // Frozen / icy blue tint with crystalline highlights
      for (let i = 0; i < data.length; i += 4) {
        const gray = getGray(data, i) / 255
        const intens = params.intensity / 100
        // Cool blue shift
        let r = data[i] * (1 - intens * 0.4)
        let g = data[i + 1] * (1 - intens * 0.1) + 20 * intens
        let b = data[i + 2] + 60 * intens * gray
        // Highlight shimmer
        if (gray > 0.8) {
          const boost = (gray - 0.8) * 5 * intens
          r += boost * 80; g += boost * 120; b += boost * 160
        }
        out[i] = clamp(r); out[i + 1] = clamp(g); out[i + 2] = clamp(b)
      }
      break
    }

    case 'dotMatrix': {
      const dotSize = Math.max(3, Math.floor(params.scale / 8))
      // Black bg
      for (let i = 0; i < out.length; i += 4) { out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 255 }
      for (let cy = 0; cy < h; cy += dotSize) for (let cx = 0; cx < w; cx += dotSize) {
        const idx = (cy * w + cx) * 4
        const br = getGray(data, idx) / 255
        const dotR = br * (dotSize / 2)
        const centerX = cx + dotSize / 2, centerY = cy + dotSize / 2
        for (let dy = 0; dy < dotSize && cy + dy < h; dy++) for (let dx = 0; dx < dotSize && cx + dx < w; dx++) {
          const px = cx + dx, py = cy + dy
          const ddx = px - centerX, ddy = py - centerY
          if (ddx * ddx + ddy * ddy <= dotR * dotR) {
            const pidx = (py * w + px) * 4
            out[pidx] = data[idx]; out[pidx + 1] = data[idx + 1]; out[pidx + 2] = data[idx + 2]
          }
        }
      }
      break
    }

    case 'lensFlare': {
      // Additive glow at a specific position
      const fx = w * (params.posX / 100), fy = h * (params.posY / 100)
      const strength = params.intensity / 30
      const flareR = Math.max(w, h) * (params.radius / 100)
      const flareColor = hexToRgb(params.color1)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x - fx) ** 2 + (y - fy) ** 2)
        const glow = Math.max(0, 1 - d / flareR) ** 2 * strength
        const idx = (y * w + x) * 4
        out[idx] = clamp(data[idx] + flareColor.r * glow)
        out[idx + 1] = clamp(data[idx + 1] + flareColor.g * glow)
        out[idx + 2] = clamp(data[idx + 2] + flareColor.b * glow)
        // Secondary ring
        const ringDist = Math.abs(d - flareR * 0.4)
        if (ringDist < flareR * 0.05) {
          const ringGlow = (1 - ringDist / (flareR * 0.05)) * strength * 0.3
          out[idx] = clamp(out[idx] + 200 * ringGlow)
          out[idx + 1] = clamp(out[idx + 1] + 180 * ringGlow)
          out[idx + 2] = clamp(out[idx + 2] + 255 * ringGlow)
        }
      }
      break
    }

    case 'filmBurn': {
      const seed = params.seed
      const strength = params.intensity / 50
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const noise1 = seededRandom(seed + y * 0.02 + x * 0.005) * 2
        const noise2 = seededRandom(seed + 500 + y * 0.01 + x * 0.03) * 2
        // Organic burn shapes using noise
        const burnR = Math.max(0, noise1 - 0.7) * strength * 400
        const burnG = Math.max(0, noise2 - 0.8) * strength * 200
        const burnB = Math.max(0, (noise1 + noise2) / 2 - 0.9) * strength * 100
        // Light leaks from edges
        const edgeX = Math.max(0, 1 - x / (w * 0.3)) + Math.max(0, 1 - (w - x) / (w * 0.3))
        const edgeY = Math.max(0, 1 - y / (h * 0.4))
        const leak = (edgeX * 0.5 + edgeY * 0.5) * strength
        out[idx] = clamp(data[idx] + burnR + leak * 180)
        out[idx + 1] = clamp(data[idx + 1] + burnG + leak * 80)
        out[idx + 2] = clamp(data[idx + 2] + burnB + leak * 20)
      }
      break
    }
  }

  // Apply opacity blending with original
  if (effect !== 'none') {
    const opacity = params.opacity / 100
    if (opacity < 1) {
      for (let i = 0; i < data.length; i += 4) {
        out[i] = out[i] * opacity + data[i] * (1 - opacity)
        out[i + 1] = out[i + 1] * opacity + data[i + 1] * (1 - opacity)
        out[i + 2] = out[i + 2] * opacity + data[i + 2] * (1 - opacity)
      }
    }
  }

  return output
}
