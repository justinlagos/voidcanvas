// Where each design was left: zoom, the point in the middle of the screen, the board and the selection.
// Kept per device in localStorage (a view is not part of the design), for the 60 most recent designs.

import type { View } from './types'

const KEY = 'vc-views'
const KEEP = 60

export interface SavedView { zoom: number; cx: number; cy: number; frame: string | null; sel: string[]; at: number }

function readAll(): Record<string, SavedView> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function rememberView(docId: string, view: View, screen: { w: number; h: number }, frame: string | null, sel: string[]) {
  if (!screen.w || !view.zoom) return
  const all = readAll()
  all[docId] = { zoom: view.zoom, cx: (screen.w / 2 - view.panX) / view.zoom, cy: (screen.h / 2 - view.panY) / view.zoom, frame, sel: sel.slice(0, 50), at: Date.now() }
  const ids = Object.keys(all).sort((a, b) => all[b].at - all[a].at)
  for (const id of ids.slice(KEEP)) delete all[id]
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage full or blocked: the view is a convenience */ }
}

export function recallView(docId: string): SavedView | null {
  const v = readAll()[docId]
  return v && Number.isFinite(v.zoom) && Number.isFinite(v.cx) && Number.isFinite(v.cy) ? v : null
}

/** Pan values that put the remembered point back in the middle of a screen of this size. */
export function viewFor(v: SavedView, screen: { w: number; h: number }): View {
  const zoom = Math.min(64, Math.max(0.02, v.zoom))
  return { zoom, panX: screen.w / 2 - v.cx * zoom, panY: screen.h / 2 - v.cy * zoom }
}
