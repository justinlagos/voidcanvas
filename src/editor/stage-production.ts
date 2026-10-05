import { layerBounds } from './engine'
import { TileResidency, renderTileKey, type TileRenderRequest } from './gpu-compositor'
import { ScratchStore } from './opfs-scratch'
import { renderBudget, type RenderBudget } from './performance'
import { RenderGraph, type RenderBounds } from './render-graph'
import type { Doc, Group, Layer } from './types'

const union = (boxes: RenderBounds[]): RenderBounds => {
  if (!boxes.length) return { x: 0, y: 0, w: 0, h: 0 }
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y))
  const r = Math.max(...boxes.map(b => b.x + b.w)), bot = Math.max(...boxes.map(b => b.y + b.h))
  return { x, y, w: Math.max(0, r - x), h: Math.max(0, bot - y) }
}

export type LayerBoundsProvider = (layer: Layer, doc: Doc) => RenderBounds
export interface StageGraph {
  graph: RenderGraph
  budget: RenderBudget
  groupBounds: Map<string, RenderBounds>
}

/**
 * Build renderer dependencies directly from the editable document model. Bounds are injectable so the graph
 * can be built in workers/headless tests without DOMMatrix; browser Stage keeps the exact editor geometry.
 */
export function buildStageGraph(
  doc: Doc,
  layers: Layer[],
  groups: Group[],
  dpr = 1,
  boundsOf: LayerBoundsProvider = layerBounds,
): StageGraph {
  const graph = new RenderGraph(), budget = renderBudget(doc.width, doc.height, dpr)
  const layerBox = new Map(layers.map(l => [l.id, boundsOf(l, doc)]))
  const groupBounds = new Map<string, RenderBounds>()
  const children = new Map<string, Group[]>()
  groups.forEach(g => {
    if (!g.parentId) return
    const list = children.get(g.parentId) ?? []; list.push(g); children.set(g.parentId, list)
  })

  const groupBox = (id: string, seen = new Set<string>()): RenderBounds => {
    const cached = groupBounds.get(id); if (cached) return cached
    if (seen.has(id)) return { x: 0, y: 0, w: 0, h: 0 }
    seen.add(id)
    const boxes: RenderBounds[] = layers.filter(l => l.groupId === id).map(l => layerBox.get(l.id)!)
    ;(children.get(id) ?? []).forEach(g => boxes.push(groupBox(g.id, new Set(seen))))
    const box = union(boxes); groupBounds.set(id, box); return box
  }

  layers.forEach(l => graph.upsert({
    id: l.id,
    kind: l.type === 'adjustment' ? 'adjustment' : 'layer',
    rev: l.rev,
    bounds: layerBox.get(l.id)!,
    deps: [],
  }))

  groups.forEach(g => graph.upsert({
    id: g.id,
    kind: 'group',
    rev: 0,
    bounds: groupBox(g.id),
    deps: [
      ...layers.filter(l => l.groupId === g.id).map(l => l.id),
      ...(children.get(g.id) ?? []).map(x => x.id),
    ],
  }))

  const topGroups = groups.filter(g => !g.parentId)
  const groupFrameIds = (g: Group) => new Set(layers.filter(l => {
    let id: string | null | undefined = l.groupId
    while (id) {
      if (id === g.id) return true
      id = groups.find(x => x.id === id)?.parentId
    }
    return false
  }).map(l => l.frameId).filter((x): x is string => !!x))

  if (doc.frames?.length) {
    doc.frames.forEach(f => {
      const deps = [
        ...layers.filter(l => l.frameId === f.id && !l.groupId).map(l => l.id),
        ...topGroups.filter(g => groupFrameIds(g).has(f.id)).map(g => g.id),
      ]
      graph.upsert({ id: f.id, kind: 'frame', rev: 0, bounds: { x: f.x, y: f.y, w: f.width, h: f.height }, deps })
    })
  }

  const roots = doc.frames?.length
    ? doc.frames.map(f => f.id)
    : [...layers.filter(l => !l.groupId).map(l => l.id), ...topGroups.map(g => g.id)]
  graph.upsert({ id: doc.id, kind: 'document', rev: 0, bounds: { x: 0, y: 0, w: doc.width, h: doc.height }, deps: roots })
  return { graph, budget, groupBounds }
}

export interface TileCodec<T> {
  encode(value: T): Promise<Blob | ArrayBuffer | Uint8Array> | Blob | ArrayBuffer | Uint8Array
  decode(data: ArrayBuffer): Promise<T> | T
}

/**
 * Shared Stage cache controller. GPU textures or CPU tiles can be resident values; evicted serialisable tiles
 * spill to OPFS using the exact same cache key. OPFS is opportunistic and never required for correctness.
 */
export class StageTileEngine<T> {
  graph: RenderGraph
  budget: RenderBudget
  readonly scratch: ScratchStore
  readonly resident: TileResidency<T>
  private pending = new Set<Promise<unknown>>()

  constructor(
    public projectId: string,
    width: number,
    height: number,
    dpr: number,
    private codec?: TileCodec<T>,
    dispose?: (value: T) => void,
  ) {
    this.budget = renderBudget(width, height, dpr)
    this.graph = new RenderGraph()
    this.scratch = new ScratchStore(projectId)
    const bytes = this.budget.maxResidentTiles * this.budget.tileSize * this.budget.tileSize * 4
    this.resident = new TileResidency<T>(this.budget.maxResidentTiles, bytes, dispose, tile => {
      if (!this.codec) return
      const task = Promise.resolve(this.codec.encode(tile.value))
        .then(data => this.scratch.write('tiles', tile.key, data))
        .catch(() => false)
      this.pending.add(task); task.finally(() => this.pending.delete(task))
    })
  }

  configure(doc: Doc, layers: Layer[], groups: Group[], dpr = 1, boundsOf: LayerBoundsProvider = layerBounds) {
    const built = buildStageGraph(doc, layers, groups, dpr, boundsOf)
    this.graph = built.graph; this.budget = built.budget
    this.resident.maxTiles = built.budget.maxResidentTiles
    this.resident.maxBytes = built.budget.maxResidentTiles * built.budget.tileSize * built.budget.tileSize * 4
    return built
  }

  dirty(nodeId: string, width: number, height: number) {
    return this.graph.dirtyTiles(nodeId, width, height, this.budget.tileSize)
  }

  key(request: Omit<TileRenderRequest, 'projectId'>) {
    return renderTileKey({ ...request, projectId: this.projectId })
  }

  get(request: Omit<TileRenderRequest, 'projectId'>) { return this.resident.get(this.key(request)) }

  put(request: Omit<TileRenderRequest, 'projectId'>, value: T, bytes = request.tile.w * request.tile.h * 4) {
    this.resident.set(this.key(request), value, bytes)
  }

  async restore(request: Omit<TileRenderRequest, 'projectId'>): Promise<T | null> {
    const key = this.key(request), hit = this.resident.get(key)
    if (hit !== undefined) return hit
    if (!this.codec) return null
    const raw = await this.scratch.read('tiles', key); if (!raw) return null
    const value = await this.codec.decode(raw)
    this.resident.set(key, value, request.tile.w * request.tile.h * 4)
    return value
  }

  async invalidate(request: Omit<TileRenderRequest, 'projectId'>) {
    const key = this.key(request)
    this.resident.delete(key)
    await this.scratch.remove('tiles', key)
  }

  async flushScratchWrites() { await Promise.all(Array.from(this.pending)) }

  clearMemory() { this.resident.clear() }
  clearScratch() { return this.scratch.clearProject() }
}
