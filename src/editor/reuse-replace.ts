import { canvasToBlob, idb, localFonts, saveDesign } from './io'
import { useEditor } from './store'
import { listAssetUsages, type ReuseUsage, type SavedAsset } from './reuse'

export interface ReplaceAssetResult {
  updated: boolean
  usages: ReuseUsage[]
  reason?: string
}

/**
 * Replace the library source, never historical design content.
 *
 * Existing designs deliberately keep the pixels/colour/font they currently contain. Their reference records stay
 * intact so the UI can say where the asset was used, but updating a library source cannot silently mutate approved
 * or exported work. Reapplying the item is the explicit opt-in to the new source.
 */
export async function replaceReusableAsset(item: SavedAsset): Promise<ReplaceAssetResult> {
  const s = useEditor.getState()
  const usages = await listAssetUsages(item.id)
  const active = s.active()
  let next: SavedAsset | null = null

  if (item.assetKind === 'logo' || item.assetKind === 'image' || item.assetKind === 'texture') {
    if (active?.type !== 'raster' || s.selectedIds.length !== 1) return { updated: false, usages, reason: 'Select one image layer to use as the new source.' }
    next = {
      ...item,
      blob: await canvasToBlob(active.canvas, 'image/png'),
      thumb: active.canvas.toDataURL('image/jpeg', 0.72),
      width: active.canvas.width,
      height: active.canvas.height,
      updatedAt: Date.now(),
      sourceProjectId: s.doc?.id ?? item.sourceProjectId,
    }
  } else if (item.assetKind === 'color') {
    const color = active?.type === 'text' ? active.color : active?.type === 'shape' ? active.fill : null
    if (!color || s.selectedIds.length !== 1) return { updated: false, usages, reason: 'Select one text or shape layer to use its colour.' }
    next = { ...item, color, updatedAt: Date.now() }
  } else if (item.assetKind === 'font') {
    if (active?.type !== 'text' || s.selectedIds.length !== 1) return { updated: false, usages, reason: 'Select one text layer to use its font.' }
    next = {
      ...item,
      font: { family: active.fontFamily, weight: active.fontWeight, italic: active.italic, blob: localFonts.get(active.fontFamily) },
      updatedAt: Date.now(),
    }
  } else if (item.assetKind === 'template') {
    if (!s.doc || !item.templateId) return { updated: false, usages, reason: 'Open a design to replace this template source.' }
    const doc = { ...s.doc, id: item.templateId, name: item.name, exports: [] }
    await saveDesign(doc, s.layers, s.groups, s.swatches, true)
    const summary = await idb.get<{ thumb?: string }>('index', item.templateId).catch(() => undefined)
    next = { ...item, thumb: summary?.thumb ?? item.thumb, updatedAt: Date.now(), sourceProjectId: s.doc.id }
  }

  if (!next) return { updated: false, usages, reason: 'This library item cannot be replaced from the current selection.' }
  await idb.put('account', next)
  return { updated: true, usages }
}
