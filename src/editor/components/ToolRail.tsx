'use client'

import { BoxSelect, Blend, Brush, CircleDashed, Crop, Eraser, Hand, Lasso, MousePointer2, PaintBucket, Pipette, Shapes, Sparkles, Stamp, Type, Wand2, ZoomIn } from 'lucide-react'
import { useEditor } from '../store'
import type { ToolId } from '../types'
import { IconButton } from './ui'

export const TOOLS: { id: ToolId; label: string; key: string; icon: typeof Brush; group: number }[] = [
  { id: 'move', label: 'Move and resize', key: 'V', icon: MousePointer2, group: 0 },
  { id: 'crop', label: 'Crop', key: 'C', icon: Crop, group: 0 },
  { id: 'text', label: 'Text', key: 'T', icon: Type, group: 1 },
  { id: 'shape', label: 'Shape', key: 'U', icon: Shapes, group: 1 },
  { id: 'brush', label: 'Brush', key: 'B', icon: Brush, group: 2 },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser, group: 2 },
  { id: 'fill', label: 'Fill', key: 'G', icon: PaintBucket, group: 2 },
  { id: 'gradient', label: 'Gradient', key: 'Shift+G', icon: Blend, group: 2 },
  { id: 'heal', label: 'Heal: paint over a blemish to remove it', key: 'J', icon: Sparkles, group: 3 },
  { id: 'clone', label: 'Clone stamp', key: 'S', icon: Stamp, group: 3 },
  { id: 'marquee', label: 'Rectangle select', key: 'M', icon: BoxSelect, group: 4 },
  { id: 'ellipse', label: 'Ellipse select', key: 'Shift+M', icon: CircleDashed, group: 4 },
  { id: 'lasso', label: 'Lasso select', key: 'L', icon: Lasso, group: 4 },
  { id: 'wand', label: 'Magic wand: select similar colours', key: 'W', icon: Wand2, group: 4 },
  { id: 'eyedropper', label: 'Pick a colour', key: 'I', icon: Pipette, group: 5 },
  { id: 'hand', label: 'Pan', key: 'H or hold Space', icon: Hand, group: 5 },
  { id: 'zoom', label: 'Zoom', key: 'Z', icon: ZoomIn, group: 5 },
]

export function ToolRail() {
  const tool = useEditor(s => s.tool)
  const setTool = useEditor(s => s.setTool)

  return (
    <aside aria-label="Tools"
      className="order-last md:order-none shrink-0 flex md:flex-col items-center gap-0.5 px-2 py-1.5 md:py-2.5 md:w-[52px] overflow-x-auto md:overflow-y-auto md:overflow-x-hidden border-t md:border-t-0 md:border-r border-void-800/60 bg-[#101014]">
      {TOOLS.map((t, i) => (
        <span key={t.id} className="contents">
          {i > 0 && TOOLS[i - 1].group !== t.group && <span className="shrink-0 md:w-6 md:h-px w-px h-6 bg-void-800 mx-0.5 md:my-1" />}
          <IconButton label={t.label} shortcut={t.key} tipSide="right" active={tool === t.id} onClick={() => setTool(t.id)}>
            <t.icon size={18} strokeWidth={1.75} />
          </IconButton>
        </span>
      ))}
    </aside>
  )
}
