import { effects } from '@/components/EffectSelector'
import { cloneCanvas, ctx2d, makeCanvas, maskBounds, renderDoc, uid } from './engine'
import { canvasToBlob, exportVoidFile, importFiles, saveDesign, saveProject } from './io'
import * as ops from './ops'
import { ADJUSTMENT_LABELS, base, useEditor } from './store'
import { useTabs } from './tabs'
import type { AdjustmentKind } from './types'
import { WORKSPACES, useUi, type PanelId } from './ui-store'
import { stageApi } from './components/Stage'
import { toggleQuickMask } from './components/ToolRail'
import { STYLE_KINDS, STYLE_LABELS, defaultStyle, emptyStyles } from './styles'
import { saveVersion } from './versions'
import * as ai from './ai-tools'

// One list of every action. The menu bar, the command palette and keyboard shortcuts all read from it,
// so a command only has to be written once and always shows the same name and shortcut everywhere.

export interface Action {
  id: string
  label: string
  /** Shown in menus and the palette. */
  shortcut?: string
  /** Bound by the generic key handler (keys the older handler already covers only use `shortcut`). */
  hotkey?: string
  run: () => void
  enabled?: () => boolean
  checked?: () => boolean
  /** Extra words for the command palette. */
  keywords?: string
}

export type MenuItem = string | '-' | { label: string; items: MenuItem[] | (() => MenuItem[]) }

export function openModal(name: string, props?: any) { window.dispatchEvent(new CustomEvent('vc:open', { detail: props ? { name, props } : name })) }

const s = () => useEditor.getState()
const ui = () => useUi.getState()
const hasDoc = () => !!s().doc
const hasLayer = () => !!s().active()
const hasSel = () => !!s().selection
const onActive = (fn: (id: string) => void) => () => { const id = s().activeId; if (id) fn(id); else s().notify('Select a layer first.') }

// ─── Clipboard ─────────────────────────────────────────────────────

let clip: { canvas: HTMLCanvasElement; x: number; y: number } | null = null
export function internalClip() { return clip }

export async function copyPixels(merged: boolean, cut = false) {
  const st = s(); const doc = st.doc; if (!doc) return
  const src = makeCanvas(doc.width, doc.height)
  if (merged) renderDoc(src, doc, st.layers, { groups: st.groups, noCache: true, transparent: true, frameRects: [] })
  else {
    const l = st.active(); if (!l || l.type === 'adjustment') { st.notify('Select a layer to copy from.'); return }
    renderDoc(src, doc, [{ ...l, visible: true, opacity: 1, blend: 'source-over' } as any], { transparent: true, noCache: true, frameRects: [] })
  }
  let box = { x: 0, y: 0, w: doc.width, h: doc.height }
  if (st.selection) {
    const x = ctx2d(src); x.globalCompositeOperation = 'destination-in'; x.drawImage(st.selection, 0, 0)
    box = maskBounds(st.selection) ?? box
  } else box = maskBounds(src) ?? box
  const out = makeCanvas(box.w, box.h); ctx2d(out).drawImage(src, -box.x, -box.y)
  clip = { canvas: out, x: box.x, y: box.y }
  try { const blob = await canvasToBlob(out); await (navigator.clipboard as any).write([new (window as any).ClipboardItem({ 'image/png': blob })]) } catch { /* internal clipboard still works */ }
  if (cut && !merged) st.clearSelectionPixels()
  st.notify(cut ? 'Cut.' : merged ? 'Copied everything visible.' : 'Copied.')
}

export function pasteInPlace() {
  const st = s(); if (!clip || !st.doc) { st.notify('Nothing copied yet.'); return }
  st.addLayer({ ...base('Pasted'), type: 'raster', canvas: cloneCanvas(clip.canvas), x: clip.x, y: clip.y }, 'Paste')
}

// ─── Files ─────────────────────────────────────────────────────────

export function openFilePicker() {
  const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'image/*,.psd,.pdf,.void'
  i.onchange = async () => {
    const files = Array.from(i.files ?? [])
    const v = files.find(f => f.name.endsWith('.void') || f.name.endsWith('.void.png'))
    if (v) { const { importVoidFile } = await import('./io'); importVoidFile(v); return }
    importFiles(files)
  }
  i.click()
}

function placeImage() {
  const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'image/*'
  i.onchange = () => importFiles(Array.from(i.files ?? []))
  i.click()
}

async function loadLut() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.cube'
  i.onchange = async () => {
    const f = i.files?.[0]; if (!f) return
    const { parseCube } = await import('./engine')
    const lut = parseCube(await f.text(), f.name.replace(/\.cube$/i, ''))
    if (!lut) { s().notify('That file is not a 3D .cube LUT we can read.'); return }
    s().addAdjustment('lut')
    const l = s().active(); if (l) s().updateLayer(l.id, { lut, name: `LUT: ${lut.name}` } as any, 'Load LUT')
  }
  i.click()
}

const ADJ_ORDER: AdjustmentKind[] = ['brightnessContrast', 'levels', 'curves', 'exposure', 'vibrance', 'hueSaturation', 'colorBalance', 'blackWhite', 'photoFilter', 'channelMixer', 'temperature', 'gradientMap', 'posterize', 'threshold', 'invert', 'blur']

function addStyle(kind: string) {
  const l = s().active(); if (!l || l.type === 'adjustment') { s().notify('Select a layer to style.'); return }
  const st = l.styles ? { ...l.styles } : emptyStyles()
  ;(st as any)[kind] = { ...defaultStyle(kind as any), ...((st as any)[kind] ?? {}), on: true }
  s().updateLayer(l.id, { styles: st }, 'Add ' + STYLE_LABELS[kind as keyof typeof STYLE_LABELS].toLowerCase())
  openModal('layerStyle', { focus: kind })
}

function arrange(where: 'front' | 'back' | 'up' | 'down') {
  const st = s(); const id = st.activeId; if (!id) return
  if (where === 'up' || where === 'down') { st.nudgeOrder(id, where === 'up' ? 1 : -1); return }
  st.moveLayer(id, where === 'front' ? st.layers.length : 0)
}

const PANEL_LABELS: Record<PanelId, string> = { properties: 'Properties', layers: 'Layers', channels: 'Channels', paths: 'Paths', history: 'History', swatches: 'Colour and swatches', adjustments: 'Adjustments', character: 'Character', paragraph: 'Paragraph', info: 'Info', brand: 'Brand kit', navigator: 'Navigator', styles: 'Layer styles', brief: 'Brief' }
export { PANEL_LABELS }

// ─── The registry ──────────────────────────────────────────────────

export function buildActions(): Record<string, Action> {
  const list: Action[] = [
    // File
    { id: 'file.new', label: 'New design…', hotkey: 'Ctrl+Alt+N', run: async () => { await saveProject().catch(() => {}); s().closeDoc() } },
    { id: 'file.open', label: 'Open…', hotkey: 'Ctrl+O', run: openFilePicker, keywords: 'psd pdf import' },
    { id: 'file.place', label: 'Place image as layer…', hotkey: 'Ctrl+Shift+P', run: placeImage, enabled: hasDoc, keywords: 'import photo' },
    { id: 'file.save', label: 'Save', shortcut: 'Ctrl+S', run: () => saveProject().then(() => s().notify('Saved to this device.')), enabled: hasDoc },
    { id: 'file.version', label: 'Save a version', hotkey: 'Ctrl+Alt+S', run: () => saveVersion('Saved by you').then(ok => ok && s().notify('Version saved. Find it in File, Version history.')), enabled: hasDoc, keywords: 'snapshot backup' },
    { id: 'file.versions', label: 'Version history…', run: () => openModal('versions'), enabled: hasDoc, keywords: 'restore recover backup' },
    { id: 'file.template', label: 'Save as template', run: async () => { const st = s(); if (!st.doc) return; await saveDesign({ ...st.doc, id: uid(), name: st.doc.name + ' template' }, st.layers, st.groups, st.swatches, true); st.notify('Saved as a template. Find it on the start screen under Your templates.') }, enabled: hasDoc },
    { id: 'file.export', label: 'Export as…', shortcut: 'Ctrl+E', run: () => openModal('export'), enabled: hasDoc, keywords: 'png jpg webp pdf download' },
    { id: 'file.void', label: 'Download project file (.void)', run: () => exportVoidFile(), enabled: hasDoc, keywords: 'backup portable' },
    { id: 'file.resize', label: 'Resize for other formats…', run: () => openModal('resize'), enabled: hasDoc, keywords: 'instagram story youtube' },
    { id: 'file.boards', label: 'Boards…', run: () => openModal('boards'), enabled: hasDoc, keywords: 'artboards' },
    { id: 'file.close', label: 'Close', hotkey: 'Ctrl+Alt+W', run: () => { const id = s().doc?.id; if (id) useTabs.getState().close(id) }, enabled: hasDoc },

    // Edit
    { id: 'edit.undo', label: 'Undo', shortcut: 'Ctrl+Z', run: () => s().undo(), enabled: () => s().historyIndex > 0 },
    { id: 'edit.redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', run: () => s().redo(), enabled: () => s().historyIndex < s().history.length - 1 },
    { id: 'edit.cut', label: 'Cut', hotkey: 'Ctrl+X', run: () => copyPixels(false, true), enabled: hasLayer },
    { id: 'edit.copy', label: 'Copy', hotkey: 'Ctrl+C', run: () => copyPixels(false), enabled: hasLayer },
    { id: 'edit.copyMerged', label: 'Copy merged', hotkey: 'Ctrl+Shift+C', run: () => copyPixels(true), enabled: hasDoc },
    { id: 'edit.paste', label: 'Paste', shortcut: 'Ctrl+V', run: () => { if (clip) pasteInPlace(); else s().notify('Press Ctrl+V to paste an image from your clipboard.') }, enabled: hasDoc },
    { id: 'edit.pasteInPlace', label: 'Paste in place', hotkey: 'Ctrl+Shift+V', run: pasteInPlace, enabled: () => !!clip },
    { id: 'edit.fill', label: 'Fill…', hotkey: 'Shift+F5', run: () => openModal('fill'), enabled: hasDoc },
    { id: 'edit.stroke', label: 'Stroke selection…', run: () => openModal('stroke'), enabled: hasSel },
    { id: 'edit.freeTransform', label: 'Free transform', hotkey: 'Ctrl+T', run: () => ops.beginTransform('free'), enabled: hasLayer, keywords: 'scale rotate distort' },
    { id: 'edit.skew', label: 'Skew', run: () => ops.beginTransform('skew'), enabled: hasLayer },
    { id: 'edit.distort', label: 'Distort', run: () => ops.beginTransform('distort'), enabled: hasLayer },
    { id: 'edit.perspective', label: 'Perspective', run: () => ops.beginTransform('perspective'), enabled: hasLayer },
    { id: 'edit.warp', label: 'Warp', run: () => ops.beginTransform('warp'), enabled: hasLayer, keywords: 'bend mesh' },
    { id: 'edit.flipH', label: 'Flip layer horizontal', run: onActive(id => s().flip(id, 'h')), enabled: hasLayer, keywords: 'mirror' },
    { id: 'edit.flipV', label: 'Flip layer vertical', run: onActive(id => s().flip(id, 'v')), enabled: hasLayer },
    { id: 'edit.rotate90', label: 'Rotate layer 90° clockwise', run: onActive(id => { const l = s().layers.find(x => x.id === id)!; s().updateLayer(id, { rotation: l.rotation + Math.PI / 2 }, 'Rotate') }), enabled: hasLayer },
    { id: 'edit.rotate180', label: 'Rotate layer 180°', run: onActive(id => { const l = s().layers.find(x => x.id === id)!; s().updateLayer(id, { rotation: l.rotation + Math.PI }, 'Rotate') }), enabled: hasLayer },
    { id: 'edit.brand', label: 'Brand kit…', run: () => openModal('brand') },
    { id: 'edit.prefs', label: 'Preferences…', hotkey: 'Ctrl+,', run: () => openModal('prefs'), keywords: 'settings interface scale history' },

    // Image
    { id: 'image.size', label: 'Image size…', hotkey: 'Ctrl+Alt+I', run: () => openModal('imageSize'), enabled: hasDoc, keywords: 'resample scale dpi' },
    { id: 'image.canvas', label: 'Canvas size…', hotkey: 'Ctrl+Alt+C', run: () => openModal('canvasSize'), enabled: hasDoc, keywords: 'extend expand' },
    { id: 'image.rot90', label: 'Rotate 90° clockwise', run: () => ops.rotateCanvas(90), enabled: hasDoc },
    { id: 'image.rot-90', label: 'Rotate 90° anticlockwise', run: () => ops.rotateCanvas(-90), enabled: hasDoc },
    { id: 'image.rot180', label: 'Rotate 180°', run: () => ops.rotateCanvas(180), enabled: hasDoc },
    { id: 'image.flipH', label: 'Flip canvas horizontal', run: () => ops.flipCanvas('h'), enabled: hasDoc },
    { id: 'image.flipV', label: 'Flip canvas vertical', run: () => ops.flipCanvas('v'), enabled: hasDoc },
    { id: 'image.crop', label: 'Crop to selection', run: ops.cropToSelection, enabled: hasSel },
    { id: 'image.trim', label: 'Trim transparent edges', run: ops.trimTransparent, enabled: hasDoc },
    { id: 'image.expand', label: 'Expand with AI fill…', run: () => openModal('canvasSize', { aiFill: true }), enabled: hasDoc, keywords: 'generative outpaint extend' },
    { id: 'image.flatten', label: 'Flatten image', run: ops.flatten, enabled: hasDoc },
    ...ADJ_ORDER.map(k => ({ id: 'adj.' + k, label: ADJUSTMENT_LABELS[k] + '…', run: () => s().addAdjustment(k), enabled: hasDoc, keywords: 'adjustment layer' })),
    { id: 'adj.lut', label: 'Colour lookup (.cube LUT)…', run: loadLut, enabled: hasDoc, keywords: 'grade film' },

    // Layer
    { id: 'layer.new', label: 'New layer', hotkey: 'Ctrl+Shift+N', run: () => s().addBlank(), enabled: hasDoc },
    { id: 'layer.duplicate', label: 'Duplicate layer', shortcut: 'Ctrl+J', run: onActive(id => s().duplicateLayer(id)), enabled: hasLayer },
    { id: 'layer.delete', label: 'Delete layer', shortcut: 'Delete', run: () => s().removeSelected(), enabled: hasLayer },
    { id: 'layer.style', label: 'Blending options…', run: () => openModal('layerStyle'), enabled: hasLayer, keywords: 'fx effects layer style' },
    ...STYLE_KINDS.map(k => ({ id: 'style.' + k, label: STYLE_LABELS[k] + '…', run: () => addStyle(k), enabled: hasLayer, keywords: 'layer style fx' })),
    { id: 'style.copy', label: 'Copy layer style', run: ops.copyStyle, enabled: hasLayer },
    { id: 'style.paste', label: 'Paste layer style', run: ops.pasteStyle, enabled: hasLayer },
    { id: 'style.clear', label: 'Clear layer style', run: ops.clearStyle, enabled: hasLayer },
    { id: 'mask.add', label: 'Add layer mask', run: onActive(id => s().addMask(id, !!s().selection)), enabled: hasLayer },
    { id: 'mask.hide', label: 'Mask hiding the selection', run: onActive(id => { s().addMask(id, true); s().invertMask(id) }), enabled: () => hasLayer() && hasSel() },
    { id: 'mask.invert', label: 'Invert mask', run: onActive(id => s().invertMask(id)), enabled: () => !!s().active()?.mask },
    { id: 'mask.toggle', label: 'Disable or enable mask', run: onActive(id => { const l = s().active()!; s().updateLayer(id, { maskEnabled: !l.maskEnabled }, 'Toggle mask') }), enabled: () => !!s().active()?.mask },
    { id: 'mask.delete', label: 'Delete mask', run: onActive(id => s().removeMask(id)), enabled: () => !!s().active()?.mask },
    { id: 'mask.fromPath', label: 'Mask from path', run: ops.maskFromPath, enabled: () => !!ops.activePath() && hasLayer() },
    { id: 'vmask.add', label: 'Add vector mask (reveal all)', run: () => ops.addVectorMask(false), enabled: hasLayer, keywords: 'vector mask path clip' },
    { id: 'vmask.fromPath', label: 'Vector mask from current path', run: () => ops.addVectorMask(true), enabled: () => !!ops.activePath() && hasLayer(), keywords: 'vector mask path' },
    { id: 'vmask.edit', label: 'Edit vector mask', run: () => ops.editVectorMask(s().activeId), enabled: () => !!s().active()?.vmask },
    { id: 'vmask.rasterize', label: 'Rasterize vector mask', run: ops.rasterizeVectorMask, enabled: () => !!s().active()?.vmask },
    { id: 'vmask.delete', label: 'Delete vector mask', run: ops.deleteVectorMask, enabled: () => !!s().active()?.vmask },
    { id: 'type.onPath', label: 'Type on path', run: () => ops.textOnPath(), enabled: () => !!ops.currentPath(), keywords: 'text path curve circle' },
    { id: 'layer.clip', label: 'Create clipping mask', shortcut: 'Alt+Ctrl+G', run: () => { const a = s().active(); if (a?.clipId) s().releaseClippingMask(a.id); else s().createClippingMask() }, enabled: () => s().canClip() || !!s().active()?.clipId },
    { id: 'layer.group', label: 'Group layers', shortcut: 'Ctrl+G', run: () => s().groupSelected(), enabled: hasLayer },
    { id: 'layer.ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', run: () => { const g = s().active()?.groupId; if (g) s().ungroup(g) }, enabled: () => !!s().active()?.groupId },
    { id: 'layer.link', label: 'Link layers', run: ops.linkSelected, enabled: hasLayer, keywords: 'chain' },
    { id: 'layer.front', label: 'Bring to front', hotkey: 'Ctrl+Shift+]', run: () => arrange('front'), enabled: hasLayer },
    { id: 'layer.up', label: 'Bring forward', hotkey: 'Ctrl+]', run: () => arrange('up'), enabled: hasLayer },
    { id: 'layer.down', label: 'Send backward', hotkey: 'Ctrl+[', run: () => arrange('down'), enabled: hasLayer },
    { id: 'layer.back', label: 'Send to back', hotkey: 'Ctrl+Shift+[', run: () => arrange('back'), enabled: hasLayer },
    ...(['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'] as const).map(h => ({ id: 'align.' + h, label: { left: 'Left edges', hcenter: 'Horizontal centres', right: 'Right edges', top: 'Top edges', vcenter: 'Vertical centres', bottom: 'Bottom edges' }[h], run: () => s().align(h), enabled: hasLayer })),
    { id: 'dist.h', label: 'Distribute horizontally', run: () => s().distribute('h'), enabled: () => s().selectedIds.length > 2 },
    { id: 'dist.v', label: 'Distribute vertically', run: () => s().distribute('v'), enabled: () => s().selectedIds.length > 2 },
    { id: 'layer.rasterize', label: 'Rasterize layer', run: onActive(id => ops.rasterizeLayer(id)), enabled: () => { const t = s().active()?.type; return t === 'text' || t === 'shape' } },
    { id: 'layer.mergeDown', label: 'Merge down', run: onActive(id => s().mergeDown(id)), enabled: hasLayer },
    { id: 'layer.mergeVisible', label: 'Merge visible', hotkey: 'Ctrl+Shift+E', run: ops.mergeVisible, enabled: hasDoc },
    { id: 'layer.stamp', label: 'Stamp visible to new layer', hotkey: 'Ctrl+Alt+Shift+E', run: ops.stampVisible, enabled: hasDoc },
    { id: 'layer.removeBg', label: 'Remove background', run: onActive(id => ai.removeBackgroundLayer(id)), enabled: () => s().active()?.type === 'raster', keywords: 'cut out subject ai' },

    // Select
    { id: 'sel.all', label: 'All', shortcut: 'Ctrl+A', run: () => s().selectAll(), enabled: hasDoc },
    { id: 'sel.none', label: 'Deselect', shortcut: 'Ctrl+D', run: () => s().setSelection(null, 'Deselect'), enabled: hasSel },
    { id: 'sel.reselect', label: 'Reselect', hotkey: 'Ctrl+Shift+D', run: () => { const h = [...s().history].reverse().find(x => x.selection); if (h?.selection) s().setSelection(h.selection, 'Reselect') }, enabled: hasDoc },
    { id: 'sel.inverse', label: 'Inverse', shortcut: 'Ctrl+Shift+I', run: () => s().invertSelection(), enabled: hasSel },
    { id: 'sel.layer', label: 'Layer pixels', run: onActive(id => ops.selectLayerPixels(id)), enabled: hasLayer, keywords: 'load transparency' },
    { id: 'sel.subject', label: 'Subject', run: () => ai.selectSubject(), enabled: hasDoc, keywords: 'ai person object' },
    { id: 'sel.object', label: 'Object selection tool', run: () => s().setTool('objectselect'), enabled: hasDoc },
    { id: 'sel.colorRange', label: 'Colour range…', run: () => openModal('colorRange'), enabled: hasDoc },
    { id: 'sel.mask', label: 'Select and mask…', hotkey: 'Ctrl+Alt+R', run: () => openModal('selectMask'), enabled: hasDoc, keywords: 'refine edge hair' },
    { id: 'sel.expand', label: 'Expand…', run: () => openModal('modify', { kind: 'expand' }), enabled: hasSel },
    { id: 'sel.contract', label: 'Contract…', run: () => openModal('modify', { kind: 'contract' }), enabled: hasSel },
    { id: 'sel.feather', label: 'Feather…', hotkey: 'Shift+F6', run: () => openModal('modify', { kind: 'feather' }), enabled: hasSel },
    { id: 'sel.smooth', label: 'Smooth…', run: () => openModal('modify', { kind: 'smooth' }), enabled: hasSel },
    { id: 'sel.border', label: 'Border…', run: () => openModal('modify', { kind: 'border' }), enabled: hasSel },
    { id: 'sel.save', label: 'Save selection', run: () => ops.saveSelectionAsChannel(), enabled: hasSel },
    { id: 'sel.path', label: 'Make work path from selection', run: () => ops.selectionToPath(), enabled: hasSel },
    { id: 'path.toSel', label: 'Load path as selection', hotkey: 'Ctrl+Enter', run: () => ops.pathToSelection(), enabled: () => !!ops.currentPath(), keywords: 'pen path selection' },
    { id: 'path.shape', label: 'Make shape layer from path', run: ops.shapeFromPath, enabled: () => !!ops.activePath(), keywords: 'pen vector' },
    { id: 'path.fromLayer', label: 'Copy shape outline to Paths', run: ops.pathFromLayer, enabled: () => s().active()?.type === 'shape', keywords: 'pen vector' },
    { id: 'path.fill', label: 'Fill path', run: () => ops.fillPath(s().fg), enabled: () => !!ops.currentPath() },
    { id: 'path.stroke', label: 'Stroke path', run: () => ops.strokePath(s().fg, Math.max(1, Math.round(s().options.size / 4))), enabled: () => !!ops.currentPath() },
    { id: 'path.strokeTaper', label: 'Stroke path with tapered ends', run: () => ops.strokePath(s().fg, Math.max(2, Math.round(s().options.size / 3)), true), enabled: () => !!ops.currentPath(), keywords: 'simulate pressure' },
    { id: 'path.close', label: 'Close open paths', run: ops.closeOpenPaths, enabled: () => !!ops.currentPath() },
    { id: 'path.reverse', label: 'Reverse path direction', run: ops.reversePath, enabled: () => !!ops.currentPath() },
    { id: 'path.simplify', label: 'Simplify path', run: ops.simplifyPath, enabled: () => !!ops.currentPath(), keywords: 'remove points smooth' },
    { id: 'path.opAdd', label: 'Last part: Combine', run: () => ops.setPathOps('add'), enabled: () => !!ops.currentPath(), keywords: 'unite union pathfinder' },
    { id: 'path.opSub', label: 'Last part: Subtract', run: () => ops.setPathOps('sub'), enabled: () => !!ops.currentPath(), keywords: 'minus front pathfinder' },
    { id: 'path.opInt', label: 'Last part: Intersect', run: () => ops.setPathOps('intersect'), enabled: () => !!ops.currentPath(), keywords: 'pathfinder' },
    { id: 'path.opXor', label: 'Last part: Exclude', run: () => ops.setPathOps('xor'), enabled: () => !!ops.currentPath(), keywords: 'pathfinder' },
    { id: 'pf.unite', label: 'Pathfinder: Unite', run: () => ops.pathfinderSelected('unite'), enabled: hasDoc, keywords: 'merge combine weld boolean shape builder' },
    { id: 'pf.minusFront', label: 'Pathfinder: Minus front', run: () => ops.pathfinderSelected('minusFront'), enabled: hasDoc, keywords: 'subtract cut boolean' },
    { id: 'pf.minusBack', label: 'Pathfinder: Minus back', run: () => ops.pathfinderSelected('minusBack'), enabled: hasDoc, keywords: 'subtract boolean' },
    { id: 'pf.intersect', label: 'Pathfinder: Intersect', run: () => ops.pathfinderSelected('intersect'), enabled: hasDoc, keywords: 'overlap boolean' },
    { id: 'pf.exclude', label: 'Pathfinder: Exclude', run: () => ops.pathfinderSelected('exclude'), enabled: hasDoc, keywords: 'xor boolean' },
    { id: 'pf.divide', label: 'Pathfinder: Divide', run: () => ops.pathfinderSelected('divide'), enabled: hasDoc, keywords: 'split pieces boolean' },
    { id: 'path.expand', label: 'Expand path operations', run: ops.expandPathOps, enabled: () => !!ops.currentPath(), keywords: 'flatten merge' },
    { id: 'path.outline', label: 'Outline stroke', run: ops.outlineStroke, enabled: () => !!ops.currentPath(), keywords: 'expand stroke to fill' },
    { id: 'path.copySvg', label: 'Copy path as SVG', run: ops.copyPathSvg, enabled: () => !!ops.currentPath(), keywords: 'vector export figma' },
    { id: 'path.exportSvg', label: 'Export path as SVG…', run: ops.exportPathSvg, enabled: () => !!ops.currentPath(), keywords: 'vector download' },
    { id: 'sel.quickMask', label: 'Quick mask mode', hotkey: 'Q', run: toggleQuickMask, enabled: hasDoc, checked: () => s().quickMask },

    // Filter
    { id: 'filter.gallery', label: 'Filter gallery…', run: () => openModal('filters'), enabled: hasDoc, keywords: 'effects' },
    { id: 'filter.remove', label: 'Remove object (AI, on device)', run: () => s().setTool('remove'), enabled: hasDoc, keywords: 'erase inpaint content aware' },
    ...effects.filter(e => e.id !== 'none').map(e => ({ id: 'fx.' + e.id, label: e.name, run: () => s().addAdjustment('voidEffect', e.id), enabled: hasDoc, keywords: 'filter ' + e.category + ' ' + e.description })),

    // View
    { id: 'view.zoomIn', label: 'Zoom in', shortcut: 'Ctrl++', run: () => stageApi.zoomBy(1.25) },
    { id: 'view.zoomOut', label: 'Zoom out', shortcut: 'Ctrl+-', run: () => stageApi.zoomBy(0.8) },
    { id: 'view.fit', label: 'Fit on screen', shortcut: 'Ctrl+0', run: () => stageApi.fit() },
    { id: 'view.100', label: '100%', shortcut: 'Ctrl+1', run: () => stageApi.zoomTo(1) },
    { id: 'view.fitSel', label: 'Fit selected layers', shortcut: 'Shift+2', run: () => stageApi.fitSelection() },
    { id: 'view.fitBoard', label: 'Fit board', shortcut: 'Shift+1', run: () => stageApi.fitFrame(), enabled: () => !!s().doc?.frames?.length },
    { id: 'view.rulers', label: 'Rulers', hotkey: 'Ctrl+R', run: () => ui().setPref('showRulers', !ui().showRulers), checked: () => ui().showRulers },
    { id: 'view.guides', label: 'Guides', hotkey: 'Ctrl+;', run: () => ui().setPref('showGuides', !ui().showGuides), checked: () => ui().showGuides },
    { id: 'view.lockGuides', label: 'Lock guides', hotkey: 'Ctrl+Alt+;', run: () => ui().setPref('lockGuides', !ui().lockGuides), checked: () => ui().lockGuides },
    { id: 'view.newGuide', label: 'New guide…', run: () => openModal('newGuide'), enabled: hasDoc },
    { id: 'view.guideLayout', label: 'New guide layout…', run: () => openModal('guideLayout'), enabled: hasDoc, keywords: 'columns grid margins' },
    { id: 'view.clearGuides', label: 'Clear guides', run: ops.clearGuides, enabled: () => !!(s().doc?.guides?.v.length || s().doc?.guides?.h.length) },
    { id: 'view.snap', label: 'Snap', hotkey: 'Ctrl+Shift+;', run: () => ui().setPref('snap', !ui().snap), checked: () => ui().snap },
    { id: 'view.pixelGrid', label: 'Pixel grid', run: () => ui().setPref('pixelGrid', !ui().pixelGrid), checked: () => ui().pixelGrid },
    { id: 'view.before', label: 'Before and after (hold \\)', run: () => { useEditor.setState({ compare: true }); setTimeout(() => useEditor.setState({ compare: false }), 1500) } },
    { id: 'view.contextBar', label: 'Contextual action bar', run: () => ui().setPref('showContextBar', !ui().showContextBar), checked: () => ui().showContextBar },
    { id: 'view.status', label: 'Status bar', run: () => ui().setPref('showStatusBar', !ui().showStatusBar), checked: () => ui().showStatusBar },
    { id: 'view.touch', label: 'Touch mode (bigger controls)', run: () => ui().setPref('touchMode', !ui().touchMode), checked: () => ui().touchMode },

    // Window
    ...(Object.keys(PANEL_LABELS) as PanelId[]).map(p => ({ id: 'panel.' + p, label: PANEL_LABELS[p], run: () => ui().showPanel(p), checked: () => { const w = ui().workspace; return w.groups.some(g => g.tabs.includes(p)) || w.floating.some(f => f.tabs.includes(p)) } })),
    ...Object.keys(WORKSPACES).map(n => ({ id: 'ws.' + n, label: n, run: () => ui().applyWorkspace(n), checked: () => ui().workspace.name === n })),
    { id: 'ws.save', label: 'Save workspace…', run: () => { const n = prompt('Name this workspace'); if (n?.trim()) ui().saveWorkspaceAs(n.trim()) } },
    { id: 'ws.reset', label: 'Reset workspace', run: () => ui().resetWorkspace() },
    ...[0.9, 1, 1.1, 1.25, 1.4, 1.5].map(k => ({ id: 'scale.' + k, label: `${Math.round(k * 100)}%`, run: () => ui().setPref('uiScale', k), checked: () => Math.abs(ui().uiScale - k) < 0.01, keywords: 'interface size ui scale' })),
    { id: 'density.compact', label: 'Compact', run: () => ui().setPref('density', 'compact'), checked: () => ui().density === 'compact' },
    { id: 'density.comfortable', label: 'Comfortable', run: () => ui().setPref('density', 'comfortable'), checked: () => ui().density === 'comfortable' },

    // Help
    { id: 'help.keys', label: 'Keyboard shortcuts', shortcut: '?', run: () => openModal('keys') },
    { id: 'help.search', label: 'Search every action', shortcut: 'Ctrl+K', run: () => openModal('palette') },
    { id: 'help.ai', label: 'AI on this device', run: () => openModal('aiInfo'), keywords: 'models download cost privacy' },
    { id: 'help.privacy', label: 'Your privacy', run: () => openModal('privacy') },
    { id: 'help.bug', label: 'Report a problem', run: () => window.open('https://github.com/justinlagos/voidcanvas/issues/new', '_blank', 'noopener') },
  ]
  return Object.fromEntries(list.map(a => [a.id, a]))
}

export const MENUS: { label: string; items: MenuItem[] }[] = [
  { label: 'File', items: ['file.new', 'file.open', 'file.place', '-', 'file.save', 'file.version', 'file.versions', 'file.template', '-', 'file.export', 'file.void', 'file.resize', 'file.boards', '-', 'file.close'] },
  { label: 'Edit', items: ['edit.undo', 'edit.redo', '-', 'edit.cut', 'edit.copy', 'edit.copyMerged', 'edit.paste', 'edit.pasteInPlace', '-', 'edit.fill', 'edit.stroke', '-', 'edit.freeTransform', { label: 'Transform', items: ['edit.skew', 'edit.distort', 'edit.perspective', 'edit.warp', '-', 'edit.rotate90', 'edit.rotate180', '-', 'edit.flipH', 'edit.flipV'] }, '-', 'edit.brand', 'edit.prefs'] },
  { label: 'Image', items: [{ label: 'Adjustments', items: [...ADJ_ORDER.map(k => 'adj.' + k), '-', 'adj.lut'] }, '-', 'image.size', 'image.canvas', 'image.expand', { label: 'Image rotation', items: ['image.rot90', 'image.rot-90', 'image.rot180', '-', 'image.flipH', 'image.flipV'] }, 'image.crop', 'image.trim', '-', 'image.flatten'] },
  { label: 'Layer', items: ['layer.new', 'layer.duplicate', 'layer.delete', '-', { label: 'Layer style', items: ['layer.style', '-', ...STYLE_KINDS.map(k => 'style.' + k), '-', 'style.copy', 'style.paste', 'style.clear'] }, { label: 'Layer mask', items: ['mask.add', 'mask.hide', 'mask.fromPath', '-', 'mask.invert', 'mask.toggle', 'mask.delete'] }, { label: 'Vector mask', items: ['vmask.add', 'vmask.fromPath', 'vmask.edit', '-', 'vmask.rasterize', 'vmask.delete'] }, 'layer.clip', { label: 'Pathfinder', items: ['pf.unite', 'pf.minusFront', 'pf.minusBack', 'pf.intersect', 'pf.exclude', 'pf.divide', '-', 'path.expand'] }, { label: 'Path', items: ['path.outline', 'type.onPath', '-', 'path.toSel', 'path.shape', 'path.fromLayer', '-', 'path.fill', 'path.stroke', 'path.strokeTaper', '-', 'path.close', 'path.reverse', 'path.simplify', '-', 'path.opAdd', 'path.opSub', 'path.opInt', 'path.opXor', '-', 'path.copySvg', 'path.exportSvg'] }, '-', 'layer.group', 'layer.ungroup', 'layer.link', { label: 'Arrange', items: ['layer.front', 'layer.up', 'layer.down', 'layer.back'] }, { label: 'Align', items: ['align.left', 'align.hcenter', 'align.right', '-', 'align.top', 'align.vcenter', 'align.bottom', '-', 'dist.h', 'dist.v'] }, '-', 'layer.removeBg', 'layer.rasterize', 'layer.mergeDown', 'layer.mergeVisible', 'layer.stamp', 'image.flatten'] },
  { label: 'Select', items: ['sel.all', 'sel.none', 'sel.reselect', 'sel.inverse', '-', 'sel.subject', 'sel.object', 'sel.colorRange', 'sel.layer', '-', 'sel.mask', { label: 'Modify', items: ['sel.expand', 'sel.contract', 'sel.feather', 'sel.smooth', 'sel.border'] }, '-', 'sel.save', 'sel.path', 'sel.quickMask'] },
  { label: 'Filter', items: ['filter.gallery', 'filter.remove', '-', ...(['artistic', 'stylize', 'color', 'distortion', 'enhance'] as const).map(cat => ({ label: { artistic: 'Artistic', stylize: 'Stylize', color: 'Colour', distortion: 'Distort', enhance: 'Enhance' }[cat], items: effects.filter(e => e.category === cat).map(e => 'fx.' + e.id) }))] },
  { label: 'View', items: ['view.zoomIn', 'view.zoomOut', 'view.fit', 'view.100', 'view.fitSel', 'view.fitBoard', '-', 'view.rulers', 'view.guides', 'view.lockGuides', 'view.snap', 'view.pixelGrid', { label: 'Guides', items: ['view.newGuide', 'view.guideLayout', 'view.clearGuides'] }, '-', 'view.before', 'view.contextBar', 'view.status', 'view.touch'] },
  { label: 'Window', items: [...(Object.keys(PANEL_LABELS) as PanelId[]).map(p => 'panel.' + p), '-', { label: 'Workspace', items: () => [...Object.keys(WORKSPACES).map(n => 'ws.' + n), ...Object.keys(useUi.getState().saved).filter(n => !WORKSPACES[n]).map(n => 'ws.saved.' + n), '-', 'ws.save', 'ws.reset'] }, { label: 'Interface size', items: ['scale.0.9', 'scale.1', 'scale.1.1', 'scale.1.25', 'scale.1.4', 'scale.1.5', '-', 'density.compact', 'density.comfortable'] }] },
  { label: 'Help', items: ['help.search', 'help.keys', '-', 'help.ai', 'help.privacy', 'help.bug'] },
]

/** Saved workspaces are dynamic, so their actions are made on the fly. */
export function resolveAction(actions: Record<string, Action>, id: string): Action | null {
  if (actions[id]) return actions[id]
  if (id.startsWith('ws.saved.')) { const n = id.slice(9); return { id, label: n, run: () => useUi.getState().applyWorkspace(n), checked: () => useUi.getState().workspace.name === n } }
  return null
}

/** Normalise a key event to the same form as `hotkey` strings. */
export function eventCombo(e: KeyboardEvent) {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  let k = e.key
  if (e.code === 'BracketRight') k = ']'
  else if (e.code === 'BracketLeft') k = '['
  else if (e.code === 'Semicolon') k = ';'
  else if (e.code === 'Comma') k = ','
  else if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3)
  else if (/^F\d+$/.test(k)) k = k
  else k = k.length === 1 ? k.toUpperCase() : k
  parts.push(k)
  return parts.join('+')
}
export function normCombo(s: string) {
  const bits = s.split('+'); const key = bits.pop()!
  const mods = ['Ctrl', 'Alt', 'Shift'].filter(m => bits.includes(m))
  return [...mods, key.length === 1 ? key.toUpperCase() : key].join('+')
}

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export function prettyKey(k?: string) {
  if (!k) return ''
  if (!isMac()) return k
  return k.replace(/Ctrl\+/g, '⌘').replace(/Alt\+/g, '⌥').replace(/Shift\+/g, '⇧')
}
