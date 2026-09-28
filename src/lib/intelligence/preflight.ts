// Preflight intelligence: what to look at before a file leaves. Plain data in, findings out,
// each with a level (good, worth checking, needs attention), a sentence that says what will
// happen, and a way to jump to the thing. Nothing here blocks; the designer decides.

import type { Level } from './contrast'

export interface Finding { level: Level; text: string; layerId?: string; boardId?: string; action?: string; tab?: string }

export interface PreflightBoard { id: string; name: string; width: number; height: number; mm?: { w: number; h: number } | null; background?: string | null }
export interface PreflightLayer {
  id: string; name: string; type: 'raster' | 'text' | 'shape' | 'adjustment'; visible: boolean; frameId?: string | null
  bounds: { x: number; y: number; w: number; h: number }
  /** Raster: the pixels the layer holds, before scaling. */
  pixels?: { w: number; h: number }
  text?: string; fontFamily?: string; color?: string; fill?: string | null
  role?: string | null
  opacity?: number
}
export interface ExportInput {
  boards: PreflightBoard[]
  layers: PreflightLayer[]
  /** Which boards are being exported. */
  boardIds: string[]
  format: 'png' | 'jpeg' | 'webp' | 'pdf'
  scale: number
  transparent?: boolean
  brand?: { colors: string[]; fonts: string[] } | null
  /** Families that could not be loaded. */
  missingFonts?: string[]
}

const mmToIn = 1 / 25.4
export const plural = (n: number, s: string, p = s + 's') => `${n} ${n === 1 ? s : p}`

/** Effective print resolution of a picture on a board with a physical size. */
export function effectivePpi(layer: PreflightLayer, board: PreflightBoard): number | null {
  if (!board.mm || !layer.pixels || !layer.bounds.w) return null
  const inches = (layer.bounds.w / board.width) * board.mm.w * mmToIn
  return inches > 0 ? layer.pixels.w / inches : null
}

export function exportPreflight(input: ExportInput): Finding[] {
  const out: Finding[] = []
  const boards = input.boards.filter(b => input.boardIds.includes(b.id))
  const onBoard = (b: PreflightBoard) => input.layers.filter(l => (l.frameId ?? boards[0]?.id) === b.id || (!l.frameId && input.boards.length <= 1))
  for (const b of boards) {
    const layers = onBoard(b)
    // Output size.
    const W = Math.round(b.width * input.scale), H = Math.round(b.height * input.scale)
    if (W * H > 16384 * 16384 * 0.6 || W > 16384 || H > 16384) out.push({ level: 'attention', boardId: b.id, text: `${b.name} at ${input.scale}× is ${W} × ${H} px, past what browsers can draw. Export at ${Math.max(1, Math.floor(input.scale / 2))}× instead.` })
    else if (W * H > 6000 * 6000 && input.format !== 'pdf') out.push({ level: 'check', boardId: b.id, text: `${b.name} at ${input.scale}× is ${W} × ${H} px. Large: expect a few seconds and a big file.` })
    // Print resolution.
    if (b.mm) {
      for (const l of layers) {
        if (!l.visible || l.type !== 'raster' || !l.pixels) continue
        const ppi = effectivePpi(l, b); if (ppi == null) continue
        const inW = ((l.bounds.w / b.width) * b.mm.w * mmToIn).toFixed(1)
        if (ppi < 120) out.push({ level: 'attention', layerId: l.id, boardId: b.id, text: `"${l.name}" is ${l.pixels.w} px wide and prints at ${inW} in on ${b.name}: about ${Math.round(ppi)} ppi. It will look soft.`, action: 'Replace image' })
        else if (ppi < 200) out.push({ level: 'check', layerId: l.id, boardId: b.id, text: `"${l.name}" prints at about ${Math.round(ppi)} ppi on ${b.name}. Fine for a poster seen from a distance, soft up close.` })
      }
      if (input.format !== 'pdf') out.push({ level: 'check', boardId: b.id, text: `${b.name} is a print size (${b.mm.w} × ${b.mm.h} mm). A print PDF adds bleed and crop marks; PNG and JPG do not.` })
    }
    // Text running off the board, empty text, hidden layers.
    for (const l of layers) {
      if (l.type === 'text' && l.visible && (l.text ?? '').trim() === '') out.push({ level: 'check', layerId: l.id, boardId: b.id, text: `An empty text layer ("${l.name}") is on ${b.name}.`, action: 'Select' })
      if (l.visible && l.type !== 'adjustment') {
        const bx = l.bounds, bb = { x: 0, y: 0, w: b.width, h: b.height }
        const over = bx.x + bx.w > bb.x + bb.w + 2 || bx.y + bx.h > bb.y + bb.h + 2 || bx.x < bb.x - 2 || bx.y < bb.y - 2
        if (over && l.type === 'text') out.push({ level: 'attention', layerId: l.id, boardId: b.id, text: `"${l.name}" runs past the edge of ${b.name}. Part of the text will be cut off.`, action: 'Select' })
      }
    }
    const hidden = layers.filter(l => !l.visible && l.type !== 'adjustment')
    if (hidden.length) out.push({ level: 'check', boardId: b.id, text: `${plural(hidden.length, 'hidden layer')} on ${b.name} (${hidden.slice(0, 3).map(h => `"${h.name}"`).join(', ')}${hidden.length > 3 ? '…' : ''}) will not export.` })
    // Transparent export of a board with a colour.
    if (input.transparent && b.background) out.push({ level: 'check', boardId: b.id, text: `${b.name}'s ${b.background.toUpperCase()} background is left out (transparent export).` })
  }
  if (input.format === 'jpeg' && input.transparent) out.push({ level: 'check', text: 'JPG has no transparency. Transparent areas turn white.' })
  // Fonts and brand.
  for (const f of input.missingFonts ?? []) out.push({ level: 'attention', text: `${f} is not available, so its text is drawn in a stand-in font.`, action: 'Review fonts' })
  if (input.brand) {
    const fonts = new Set(input.layers.filter(l => l.visible && l.type === 'text' && l.fontFamily && !input.brand!.fonts.includes(l.fontFamily)).map(l => l.fontFamily!))
    if (fonts.size) out.push({ level: 'check', text: `${Array.from(fonts).join(', ')} ${fonts.size === 1 ? 'is not a brand font' : 'are not brand fonts'}.`, action: 'Brand' })
  }
  return out.sort((a, b) => rank(a.level) - rank(b.level))
}
const rank = (l: Level) => (l === 'attention' ? 0 : l === 'check' ? 1 : 2)

export interface DeliveryInput {
  deliverables: { id: string; label: string; group: string; built: boolean; kinds: string[] }[]
  versions: { n: number; label: string; status: 'sent' | 'approved' | 'changes' | 'draft'; openPins: number; openTodos: number; hasOpenLink: boolean }[]
  fileNames: string[]
  hasBrand: boolean
}

/** Is the job ready to leave? */
export function deliveryPreflight(d: DeliveryInput): { level: Level; summary: string; findings: Finding[] } {
  const f: Finding[] = []
  const unbuilt = d.deliverables.filter(x => !x.built)
  if (unbuilt.length) f.push({ level: 'attention', text: `${plural(unbuilt.length, 'format')} not built: ${unbuilt.map(u => u.label).join(', ')}.`, tab: 'formats', action: 'Build' })
  const noPdf = d.deliverables.filter(x => x.built && (x.group === 'Print' || x.group === 'Outdoor') && !x.kinds.includes('pdf'))
  if (noPdf.length) f.push({ level: 'check', text: `${noPdf.map(u => u.label).join(', ')} ${noPdf.length === 1 ? 'is a print format with no print PDF' : 'are print formats with no print PDF'} ticked.` })
  const latest = d.versions.slice().sort((a, b) => b.n - a.n)[0]
  if (!d.versions.length) f.push({ level: 'check', text: 'Nothing has been sent for review. Delivering without a sign-off is fine for small jobs; note it in the delivery.', tab: 'review' })
  else {
    if (latest.status !== 'approved') f.push({ level: latest.status === 'changes' ? 'attention' : 'check', text: latest.status === 'changes' ? `${latest.label} came back with changes asked. Deliver after the next round, or confirm with the client.` : `${latest.label} is not approved yet.`, tab: 'review' })
    if (latest.openPins) f.push({ level: 'attention', text: `${plural(latest.openPins, 'comment')} on ${latest.label} not marked done.`, tab: 'review', action: 'Open review' })
    if (latest.openTodos) f.push({ level: 'check', text: `${plural(latest.openTodos, 'item')} on the ${latest.label} to-do list still open.`, tab: 'review' })
    if (latest.hasOpenLink && latest.status !== 'approved') f.push({ level: 'check', text: `The review link for ${latest.label} is still open. The client may still be commenting.`, tab: 'review' })
  }
  const dupes = d.fileNames.filter((n, i) => d.fileNames.indexOf(n) !== i)
  if (dupes.length) f.push({ level: 'attention', text: `Duplicate file names in the package: ${Array.from(new Set(dupes)).join(', ')}. Rename the formats so each file is unique.`, tab: 'brief' })
  const attention = f.filter(x => x.level === 'attention').length, check = f.filter(x => x.level === 'check').length
  const level: Level = attention ? 'attention' : check ? 'check' : 'good'
  const summary = level === 'good' ? 'Ready to deliver' : `${plural(attention + check, 'thing')} need${attention + check === 1 ? 's' : ''} attention`
  return { level, summary, findings: f.sort((a, b) => rank(a.level) - rank(b.level)) }
}
