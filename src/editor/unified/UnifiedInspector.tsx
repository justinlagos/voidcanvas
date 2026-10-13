// B01 UI slice: context-aware inspector that DELEGATES to existing panels.
// Flagged (?unified=1); no panel duplication; no store changes.
import React from 'react'
import { inspectorCapabilities, nodeKindFor, type CapabilityDescriptor } from './capabilities'
import type { Layer, ToolId } from '../types'

export function UnifiedInspector(props: { layer: Layer | null; tool: ToolId | 'select'; renderPanel: (c: CapabilityDescriptor) => React.ReactNode }): React.ReactElement {
  const kind = nodeKindFor(props.layer)
  const { primary } = inspectorCapabilities(kind, props.tool)
  return React.createElement(
    'div',
    { 'data-testid': 'unified-inspector', 'data-kind': kind },
    primary.map(c => React.createElement('section', { key: c.id, 'data-panel': c.panel }, props.renderPanel(c))),
  )
}
