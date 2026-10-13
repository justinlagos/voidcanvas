// B01: unified node capability registry + context-aware inspector descriptors.
// Pure functions over existing Layer/Group/Doc types. No store, no duplication:
// descriptors reference existing panel ids (Properties, Character, Paragraph,
// Layers, Adjustments, LayerStyles, BrandKit, Channels, Paths).
import type { Doc, Group, Layer, ToolId } from '../types'

export type NodeKind = 'raster' | 'text' | 'shape' | 'adjustment' | 'group' | 'board' | 'document'
export type EditTarget = 'object' | 'mask' | 'pixel-contents' | 'story' | 'symbol-instance' | 'board' | 'document'
export type Scope = 'layer' | 'selection' | 'group' | 'board' | 'page' | 'document'

export interface CapabilityDescriptor {
  id: string
  label: string
  panel: 'Properties' | 'Character' | 'Paragraph' | 'Layers' | 'Adjustments' | 'LayerStyles' | 'BrandKit' | 'Channels' | 'Paths' | 'Export'
  priority: number
}

const BASE: Record<NodeKind, CapabilityDescriptor[]> = {
  raster: [
    { id: 'transform', label: 'Transform', panel: 'Properties', priority: 1 },
    { id: 'mask', label: 'Mask', panel: 'Layers', priority: 2 },
    { id: 'adjust', label: 'Adjustments', panel: 'Adjustments', priority: 3 },
    { id: 'styles', label: 'Layer styles', panel: 'LayerStyles', priority: 4 },
    { id: 'brand', label: 'Brand kit', panel: 'BrandKit', priority: 9 },
  ],
  shape: [
    { id: 'transform', label: 'Transform', panel: 'Properties', priority: 1 },
    { id: 'geometry', label: 'Path geometry', panel: 'Properties', priority: 2 },
    { id: 'fillstroke', label: 'Fill and stroke', panel: 'Properties', priority: 3 },
    { id: 'styles', label: 'Layer styles', panel: 'LayerStyles', priority: 4 },
  ],
  text: [
    { id: 'transform', label: 'Transform', panel: 'Properties', priority: 1 },
    { id: 'character', label: 'Character', panel: 'Character', priority: 2 },
    { id: 'paragraph', label: 'Paragraph', panel: 'Paragraph', priority: 3 },
    { id: 'styles', label: 'Layer styles', panel: 'LayerStyles', priority: 4 },
  ],
  adjustment: [
    { id: 'adjust', label: 'Adjustment settings', panel: 'Adjustments', priority: 1 },
    { id: 'mask', label: 'Mask', panel: 'Layers', priority: 2 },
  ],
  group: [
    { id: 'transform', label: 'Transform', panel: 'Properties', priority: 1 },
    { id: 'styles', label: 'Group styles', panel: 'LayerStyles', priority: 2 },
  ],
  board: [
    { id: 'board', label: 'Board', panel: 'Properties', priority: 1 },
    { id: 'export', label: 'Export', panel: 'Export', priority: 2 },
  ],
  document: [
    { id: 'document', label: 'Document', panel: 'Properties', priority: 1 },
  ],
}

export function nodeKindFor(layer: Layer | null, opts?: { groupSelected?: boolean }): NodeKind {
  if (!layer) return opts?.groupSelected ? 'group' : 'document'
  return layer.type
}

export function editTargetFor(layer: Layer | null, ui: { editingMask: boolean; editingText: boolean }): EditTarget {
  if (!layer) return 'document'
  if (ui.editingMask) return 'mask'
  if (ui.editingText && layer.type === 'text') return 'story'
  if (layer.type === 'raster' && (layer as { source?: string }).source === 'smart-contents') return 'pixel-contents'
  return 'object'
}

export function scopeFor(selectedCount: number, inGroup: boolean, boardCount: number): Scope {
  if (selectedCount > 1) return 'selection'
  if (inGroup) return 'group'
  if (boardCount > 1) return 'board'
  return 'layer'
}

// Top-5 likely actions rule: return at most 5 primary descriptors; full list stays searchable.
export function inspectorCapabilities(kind: NodeKind, _tool: ToolId | 'select'): { primary: CapabilityDescriptor[]; all: CapabilityDescriptor[] } {
  const all = [...(BASE[kind] ?? BASE.document)].sort((a, b) => a.priority - b.priority)
  return { primary: all.slice(0, 5), all }
}

export function focusPresetAllows(preset: string, _kind: NodeKind): boolean {
  // Focus presets rearrange only. Every node kind stays eligible in every preset.
  return ['Essentials', 'Vector', 'Photo', 'Typography', 'Publication', 'Production'].includes(preset)
}

export function describeContext(doc: Doc | null, layers: Layer[], groups: Group[], selectedIds: string[]): { kinds: NodeKind[] } {
  void groups; void doc
  const kinds = selectedIds.map(id => {
    const l = layers.find(x => x.id === id) ?? null
    return nodeKindFor(l)
  })
  return { kinds: kinds.length ? kinds : ['document'] }
}
