// Pure selection description (node-testable). The hook adds live-store wiring.
import { editTargetFor, inspectorCapabilities, nodeKindFor, scopeFor, type EditTarget, type NodeKind, type Scope } from './capabilities'
import { stableSelection, selectionKey } from './selection-bridge'
import type { Layer, ToolId } from '../types'

export function describeSelection(o: {
  layers: Layer[]; selectedIds: string[]; activeId: string | null; keyObjectId: string | null
  frameId: string | null; boardCount: number; inGroup: boolean
  editingMask: boolean; editingText: boolean; tool: ToolId | 'select'
}): { kind: NodeKind; target: EditTarget; scope: Scope; key: string; primary: { id: string; label: string; panel: string }[] } {
  const layer = o.layers.find(l => l.id === o.activeId) ?? null
  const kind = nodeKindFor(layer)
  const target = editTargetFor(layer, { editingMask: o.editingMask, editingText: o.editingText })
  const scope = scopeFor(o.selectedIds.length, o.inGroup, o.boardCount)
  const sel = stableSelection(o.selectedIds, o.activeId, o.keyObjectId, o.frameId)
  const { primary } = inspectorCapabilities(kind, o.tool)
  return { kind, target, scope, key: selectionKey(sel), primary }
}
