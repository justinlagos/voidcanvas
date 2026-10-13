// B.1 flagged context section mounted at the top of PropertiesPanel.
// Wiring (Section) reads the ONE live store via useUnifiedBinding; edits use
// updateLayer + commit exactly like the existing Opacity control (real undo
// step). Presentation (View) is prop-driven and SSR/unit-testable.
// Renders nothing when ?unified=1 is absent.
import React from 'react'
import { useEditor } from '../store'
import { useUnifiedBinding, type UnifiedBinding } from './useUnifiedBinding'
import { Section, Slider } from '../components/ui'

// The exact transaction the slider performs (also used by tests).
export function commitOpacityEdit(layerId: string, v: number): void {
  const st = useEditor.getState()
  st.updateLayer(layerId, { opacity: v / 100 })
  st.commit('Unified opacity')
}

export function UnifiedContextView(props: { binding: UnifiedBinding; opacity: number; onOpacity: (v: number) => void }): React.ReactElement {
  const { binding, opacity, onOpacity } = props
  return (
    <div
      data-testid="unified-context"
      data-kind={binding.kind}
      data-target={binding.target}
      data-scope={binding.scope}
      data-key={binding.key}
    >
      <p data-testid="unified-context-line" className="text-[12px] text-void-400 mb-2">
        {binding.kind} · {binding.target} · {binding.scope}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {binding.primary.map(c => (
          <span key={c.id} data-testid={`unified-cap-${c.id}`} data-panel={c.panel} className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            {c.label}
          </span>
        ))}
      </div>
      <Slider label="Opacity (unified)" value={Math.round(opacity * 100)} min={0} max={100} unit="%" onChange={onOpacity} onCommit={() => useEditor.getState().commit('Unified opacity')} />
    </div>
  )
}

export function UnifiedContextSection(): React.ReactElement | null {
  const binding = useUnifiedBinding()
  const activeId = useEditor(s => s.activeId)
  const opacity = useEditor(s => s.layers.find(l => l.id === s.activeId)?.opacity ?? 1)
  if (!binding || !activeId) return null
  return (
    <Section title="Unified context">
      <UnifiedContextView binding={binding} opacity={opacity} onOpacity={v => useEditor.getState().updateLayer(activeId, { opacity: v / 100 })} />
    </Section>
  )
}
