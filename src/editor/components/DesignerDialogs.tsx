'use client'
import { useState } from 'react'
import { useEditor } from '../store'
import { ctx2d, layerMaskMatrix, layerMatrix, layerSize, makeCanvas } from '../engine'
import { blobToCanvas } from '../io'
import { DEFAULT_BRUSHES, loadTip, readBrushes, saveBrushes } from '../brushes'
import { Button, Modal, Slider } from './ui'
export function BrushPresetsDialog({ onClose }: { onClose: () => void }) {
  const o = useEditor((s) => s.options),
    [presets, setPresets] = useState(readBrushes),
    [name, setName] = useState('My brush'),
    [error, setError] = useState('')
  const patch = (v: Partial<typeof o>) =>
    useEditor.setState({ options: { ...useEditor.getState().options, ...v } })
  const upload = async (file: File) => {
    try {
      const c = await blobToCanvas(file),
        k = Math.min(1, 512 / Math.max(c.width, c.height)),
        tile = makeCanvas(c.width * k, c.height * k),
        x = ctx2d(tile)
      x.drawImage(c, 0, 0, tile.width, tile.height)
      const im = x.getImageData(0, 0, tile.width, tile.height)
      for (let i = 0; i < im.data.length; i += 4) {
        im.data[i + 3] *= (255 - (im.data[i] * 0.299 + im.data[i + 1] * 0.587 + im.data[i + 2] * 0.114)) / 255
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255
      }
      x.putImageData(im, 0, 0)
      const url = tile.toDataURL()
      await loadTip(url)
      patch({ tipAsset: url })
    } catch (e) {
      setError(String(e))
    }
  }
  return (
    <Modal title="Brush tips and presets" onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[...DEFAULT_BRUSHES, ...presets].map((p, i) => (
            <Button
              key={i}
              onClick={async () => {
                if (p.options.tipAsset) await loadTip(p.options.tipAsset)
                patch({ ...p.options, tipAsset: p.options.tipAsset })
              }}
            >
              {p.name}
            </Button>
          ))}
        </div>
        <label className="block text-sm">
          Import tip (black paints, white is clear; maximum 512 pixels)
          <input
            aria-label="Import brush tip"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) upload(e.target.files[0])
            }}
          />
        </label>
        <Slider
          label="Spacing"
          value={(o.spacing ?? 0.12) * 100}
          min={1}
          max={200}
          unit="%"
          onChange={(v) => patch({ spacing: v / 100 })}
        />
        <Slider
          label="Angle"
          value={o.angle ?? 0}
          min={-180}
          max={180}
          onChange={(v) => patch({ angle: v })}
        />
        <Slider
          label="Roundness"
          value={(o.roundness ?? 1) * 100}
          min={5}
          max={100}
          unit="%"
          onChange={(v) => patch({ roundness: v / 100 })}
        />
        <div className="flex gap-2">
          <input
            aria-label="Preset name"
            className="bg-void-800 px-2 rounded"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            onClick={() => {
              try {
                const {
                  size,
                  hardness,
                  opacity,
                  flow,
                  smoothing,
                  tip,
                  tipAsset,
                  spacing,
                  angle,
                  roundness,
                  pressureSize,
                  pressureOpacity,
                } = o
                const next = [
                  ...presets,
                  {
                    name: name.trim() || 'My brush',
                    options: {
                      size,
                      hardness,
                      opacity,
                      flow,
                      smoothing,
                      tip,
                      tipAsset,
                      spacing,
                      angle,
                      roundness,
                      pressureSize,
                      pressureOpacity,
                    },
                  },
                ].slice(-24)
                saveBrushes(next)
                setPresets(next)
              } catch {
                setError('Preset storage is full. Remove a saved preset first.')
              }
            }}
          >
            Save preset
          </Button>
          <Button
            onClick={() => {
              saveBrushes([])
              setPresets([])
            }}
          >
            Clear saved presets
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
export function MaskSettingsDialog({ onClose }: { onClose: () => void }) {
  const l = useEditor((s) => s.active()),
    doc = useEditor((s) => s.doc),
    [initial] = useState(() => {
      const l = useEditor.getState().active()
      return l
        ? {
            id: l.id,
            mask: l.mask,
            maskLinked: l.maskLinked,
            maskMatrix: l.maskMatrix,
            maskResize: l.maskResize,
          }
        : null
    })
  if (!l?.mask || !doc || l.type === 'adjustment' || l.locked || l.lockPixels)
    return (
      <Modal title="Mask position" onClose={onClose}>
        <p className="p-5">Select an unlocked pixel mask first.</p>
      </Modal>
    )
  const patch = (p: any) => useEditor.getState().updateLayer(l.id, p)
  const matrix = layerMaskMatrix(l, doc)
  const link = (value: boolean) => {
    if (!value) {
      const m = layerMatrix(l, doc)
      patch({ maskLinked: false, maskMatrix: [m.a, m.b, m.c, m.d, m.e, m.f] })
    } else {
      const { w, h } = layerSize(l, doc),
        c = makeCanvas(w, h),
        x = ctx2d(c)
      x.setTransform(layerMatrix(l, doc).inverse().multiply(matrix))
      x.drawImage(l.mask!, 0, 0)
      patch({ mask: c, maskLinked: true, maskMatrix: undefined })
    }
  }
  const cancel = () => {
    if (initial) useEditor.getState().updateLayer(initial.id, initial)
    onClose()
  }
  return (
    <Modal title="Mask position and resize" onClose={cancel}>
      <div className="p-5 space-y-4">
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={l.maskLinked !== false}
            onChange={(e) => link(e.target.checked)}
            disabled={l.locked || l.lockPixels}
          />
          Linked to layer
        </label>
        <p className="text-xs text-void-400">
          Unlink to keep the mask stationary when the artwork moves. Relinking preserves its current
          appearance.
        </p>
        {l.maskLinked === false && (
          <div className="flex gap-4">
            {(['e', 'f'] as const).map((axis, i) => (
              <label key={axis}>
                {i ? 'Y' : 'X'}
                <input
                  aria-label={'Mask ' + (i ? 'Y' : 'X')}
                  type="number"
                  className="w-24 bg-void-800 ml-2"
                  value={Math.round(matrix[axis])}
                  onChange={(e) => {
                    const m = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
                    m[4 + i] = Number(e.target.value)
                    patch({ maskMatrix: m })
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <label className="block">
          When text or shape dimensions change
          <select
            aria-label="Mask resize policy"
            className="block bg-void-800 p-2 mt-2"
            value={l.maskResize ?? 'fixed'}
            onChange={(e) => patch({ maskResize: e.target.value })}
          >
            <option value="fixed">Keep mask pixels at their original size</option>
            <option value="scale">Scale linked mask to new geometry</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={cancel}>Cancel</Button>
          <Button
            onClick={() => {
              useEditor.getState().commit('Mask placement')
              onClose()
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  )
}
