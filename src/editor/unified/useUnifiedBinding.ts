// B.1 thin integration bridge: connects the capability registry + selection
// bridge to the ONE live store. No new state, no parallel history.
// Pure describeSelection() is unit-tested in node; the hook is browser-only.
import { useEditor } from '../store'
import { describeSelection } from './binding-describe'
import { unifiedEnabled } from './flags'
import type { Layer, ToolId } from '../types'
import type { EditTarget, NodeKind, Scope } from './capabilities'

export interface UnifiedBinding {
  enabled: boolean
  kind: NodeKind
  target: EditTarget
  scope: Scope
  key: string
  primary: { id: string; label: string; panel: string }[]
  edit: (patch: Partial<Layer>, label: string) => void
  select: (id: string | null) => void
}

export function useUnifiedBinding(): UnifiedBinding | null {
  const enabled = unifiedEnabled()
  const activeId = useEditor(s => s.activeId)
  const selectedIds = useEditor(s => s.selectedIds)
  const keyObjectId = useEditor(s => s.keyObjectId)
  const frameId = useEditor(s => s.activeFrameId)
  const editingMask = useEditor(s => s.editingMask)
  const editingTextId = useEditor(s => s.editingTextId)
  const tool = useEditor(s => s.tool as ToolId)
  const boardCount = useEditor(s => s.doc?.frames?.length ?? 0)
  const layers = useEditor(s => s.layers)
  const groups = useEditor(s => s.groups)
  if (!enabled) return null
  const layer = layers.find(l => l.id === activeId) ?? null
  const inGroup = !!layer?.groupId && groups.some(g => g.id === layer.groupId)
  const desc = describeSelection({
    layers, selectedIds, activeId, keyObjectId, frameId, boardCount, inGroup,
    editingMask, editingText: editingTextId === activeId, tool,
  })
  const st = useEditor.getState()
  return {
    enabled: true, ...desc,
    edit: (patch, label) => { if (activeId) st.updateLayer(activeId, patch, label) },
    select: (id) => st.setActive(id),
  }
}
