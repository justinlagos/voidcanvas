'use client'

import { useCallback, useEffect, useRef, useState, type RefObject, type PointerEvent, type KeyboardEvent } from 'react'

/** Move by a dedicated handle, never by the controls. Keep the whole panel reachable after a resize. */
export function useMovablePanel(panel: RefObject<HTMLElement>, bounds?: RefObject<HTMLElement>) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null)
  const move = useCallback((x: number, y: number) => {
    const el = panel.current
    if (!el || !el.offsetWidth) return
    const box = bounds?.current?.getBoundingClientRect()
    const width = box?.width ?? window.innerWidth, height = box?.height ?? window.innerHeight
    setPosition({ x: Math.max(8, Math.min(x, width - el.offsetWidth - 8)), y: Math.max(8, Math.min(y, height - el.offsetHeight - 8)) })
  }, [panel, bounds])
  useEffect(() => {
    const el = panel.current
    if (!el) return
    const recheck = () => setPosition(p => {
      if (!p || !el.offsetWidth) return p
      const box = bounds?.current?.getBoundingClientRect()
      return { x: Math.max(8, Math.min(p.x, (box?.width ?? window.innerWidth) - el.offsetWidth - 8)), y: Math.max(8, Math.min(p.y, (box?.height ?? window.innerHeight) - el.offsetHeight - 8)) }
    })
    const observer = new ResizeObserver(recheck)
    observer.observe(el)
    if (bounds?.current) observer.observe(bounds.current)
    window.addEventListener('resize', recheck)
    return () => { observer.disconnect(); window.removeEventListener('resize', recheck) }
  }, [panel, bounds])
  const origin = () => {
    const rect = panel.current!.getBoundingClientRect(), box = bounds?.current?.getBoundingClientRect()
    return { x: rect.left - (box?.left ?? 0), y: rect.top - (box?.top ?? 0) }
  }
  return {
    style: position ? { left: position.x, top: position.y, right: 'auto' as const, bottom: 'auto' as const, position: 'absolute' as const } : undefined,
    reset: () => setPosition(null),
    handle: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return
        e.preventDefault()
        const p = origin()
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, left: p.x, top: p.y }
        e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const d = drag.current
        if (d && d.id === e.pointerId) move(d.left + e.clientX - d.x, d.top + e.clientY - d.y)
      },
      onPointerUp: () => { drag.current = null },
      onPointerCancel: () => { drag.current = null },
      onLostPointerCapture: () => { drag.current = null },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        const step = steps[e.key]
        if (!step) return
        e.preventDefault(); e.stopPropagation()
        const p = origin(), amount = e.shiftKey ? 40 : 10
        move(p.x + step[0] * amount, p.y + step[1] * amount)
      },
    },
  }
}
