import { visibleTiles, type TileRect } from './performance'

export interface RenderBounds { x: number; y: number; w: number; h: number }
export type RenderNodeKind = 'layer' | 'group' | 'adjustment' | 'frame' | 'document'

export interface RenderNode {
  id: string
  kind: RenderNodeKind
  rev: number
  bounds: RenderBounds
  deps: string[]
}

export interface DirtyTile extends TileRect {
  reason: string
}

const overlap = (a: RenderBounds, b: RenderBounds) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/**
 * Small dependency graph used by both CPU and GPU renderers. It deliberately owns invalidation only: document
 * semantics stay in the editor model and the renderer decides how each dirty tile is produced.
 */
export class RenderGraph {
  private nodes = new Map<string, RenderNode>()
  private reverse = new Map<string, Set<string>>()

  upsert(node: RenderNode) {
    const old = this.nodes.get(node.id)
    if (old) old.deps.forEach(dep => this.reverse.get(dep)?.delete(node.id))
    this.nodes.set(node.id, { ...node, deps: [...node.deps] })
    node.deps.forEach(dep => {
      const set = this.reverse.get(dep) ?? new Set<string>()
      set.add(node.id); this.reverse.set(dep, set)
    })
  }

  remove(id: string) {
    const old = this.nodes.get(id)
    if (!old) return
    old.deps.forEach(dep => this.reverse.get(dep)?.delete(id))
    this.nodes.delete(id); this.reverse.delete(id)
  }

  get(id: string) { return this.nodes.get(id) }

  /** Changed node plus every node that depends on it, breadth-first and de-duplicated. */
  affected(id: string): RenderNode[] {
    const out: RenderNode[] = [], seen = new Set<string>(), queue = [id]
    while (queue.length) {
      const cur = queue.shift()!
      if (seen.has(cur)) continue
      seen.add(cur)
      const node = this.nodes.get(cur); if (node) out.push(node)
      Array.from(this.reverse.get(cur) ?? new Set<string>()).forEach(next => queue.push(next))
    }
    return out
  }

  /** Return only tiles touched by the changed node or dependent composites. */
  dirtyTiles(id: string, docW: number, docH: number, tileSize: number): DirtyTile[] {
    const byKey = new Map<string, DirtyTile>()
    this.affected(id).forEach(node => {
      const region = {
        x: Math.max(0, node.bounds.x), y: Math.max(0, node.bounds.y),
        w: Math.max(0, Math.min(docW, node.bounds.x + node.bounds.w) - Math.max(0, node.bounds.x)),
        h: Math.max(0, Math.min(docH, node.bounds.y + node.bounds.h) - Math.max(0, node.bounds.y)),
      }
      if (!region.w || !region.h) return
      visibleTiles(region, docW, docH, tileSize).forEach(tile => {
        if (!overlap(tile, region)) return
        byKey.set(tile.key, { ...tile, reason: node.id })
      })
    })
    return Array.from(byKey.values())
  }
}

export function tileCacheKey(projectId: string, tile: Pick<TileRect, 'key'>, scale: number, revision: number) {
  const bucket = Math.max(1, Math.round(scale * 1000))
  return `${projectId}:${tile.key}:${bucket}:${revision}`
}
