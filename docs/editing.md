# Everyday editing on desktop

Code: `src/editor/store.ts` (selection units, align, distribute, duplicate, move to group, `commit` options),
`src/editor/actions.ts` (layer clipboard, paste, duplicate, select same, canvas menu), `src/editor/ops.ts`
(appearance), `src/editor/components/Stage.tsx` (canvas gestures), `src/editor/components/PropertiesPanel.tsx`,
`src/editor/components/LayersPanel.tsx`, `src/editor/numexpr.ts`, `src/editor/pivot.ts`.
Tests: `e2e/editing.mjs`, `src/editor/__tests__/numexpr.test.ts`, `src/editor/__tests__/pivot.test.ts`.

## Objects

`selectionUnits(layers, groups, selectedIds, isolatedGroupId)` turns a selection into objects: each outermost
group whose layers are all selected is one object, any other selected layer is one on its own. The group being
edited on its own, and the groups around it, never count. Align, distribute, the key object and duplicate all
work on objects, so a group keeps its layout.

`pickGroupFor(hit, ...)` decides what a click picks when Auto-select is Group (the default): the outermost group
around the layer that you are not already inside. You are inside a group when the selection sits in it without
being all of it, or when it is being edited on its own. A double click on a selected group goes one level in.
Escape goes one level up; Enter goes one level in. The marquee picks whole groups the same way.

## Duplicate and paste

- `duplicateSelected({ dx, dy, commit })` copies objects (groups with their nested groups), names copies with
  `copyName`, gives copies link ids of their own, and returns the new ids.
- Alt-drag: the copy is made on pointer down without an undo step, dragged, then committed as "Duplicate layer";
  a click without movement jumps back to the previous history step, so nothing is left behind.
- `noteDuplicate` records the source and copies; `smartDuplicate` (Ctrl+D with no pixel selection) repeats the
  offset between the last source and copy (step and repeat).
- `copyLayers` keeps layer data in memory and writes a PNG to the system clipboard. `pasteLayers(inPlace, view)`
  inserts above the active layer outside its group, with new ids and groups; the paste event recognises our own
  PNG by size and pastes the layers instead of a picture. Plain text pastes as a text layer, SVG as a picture.

## Snapping

`snapTargets(layer, skip)` in Stage: the edges and centre of the layer's board (the page without boards), guides,
and edges and centres of up to 60 layers on that board. Ctrl or Cmd turns snapping off for one drag. Between two
neighbours a moving layer settles where the gaps are equal. Resizing an unrotated layer snaps the moving edge.
Alt on a handle resizes from the centre.

## Rotation

The round handle above several layers turns them around their shared centre (`grotate`). For one layer the round
handle and the rotation field turn around the pivot set in Properties (`useUi.pivot`, nine points, see `pivot.ts`).

## Undo

`commit(label, { merge, ifChanged })`. `merge` replaces the last step with the same label made within that many
milliseconds (nudging, number fields). `ifChanged` skips the step when layers, groups, the document and the
selection are the same as the last step: layers are replaced, never changed in place, so references are compared.
Sliders only commit when their value changed between press and release. A click on a resize handle, a text box
opened and closed without typing, and a field left as it was add nothing.

## Number fields

`NumField` in `components/ui.tsx` reads `evalNumber(text, current)`: numbers, "+10", "-=10", "*2", "x2", "/2",
"50%", and sums with brackets. Enter or blur applies, Escape restores, arrow keys step (Shift for ten). X and Y are
measured from the layer's board.

## Browser keys

Actions can carry a `webHotkey` for keys a browser tab keeps (Ctrl+T, Ctrl+Shift+N, Ctrl+Shift+P become Alt+T,
Alt+Shift+N, Alt+Shift+P). `keyFor(action)` picks the key shown in menus, the palette and the shortcut sheet. The
desktop app (`window.voidDesktop`) uses the usual keys.

## Sizes in print units

Canvas size, Image size and the custom size on the start screen take pixels, millimetres, centimetres, inches and
points (and percent in the two dialogs), through `src/editor/units.ts`. A print unit needs a resolution: the
design's own dpi, or 300 for designs over 2000 px on a side and 72 otherwise (300 for a new custom size). The
fields keep what is typed while typing, so a decimal point can be entered. The pixel result is shown under the
fields. Choosing a print unit and applying records the dpi on the design. The last unit chosen is remembered on
the device (`vc-size-unit`).

## Replace image

Layer, Replace image… (and Replace on the phone) puts a new picture in a photo layer: it covers the box the old
picture showed in, centred, turned and flipped the same way; the layer keeps its name, effects, styles and mask
(resampled to the new picture). One undo step.

## Fonts take effect at once

Picking a font, weight or italic (Character panel, Properties, the text bar, the floating bar, the brand panel, and
the phone's Font sheet) changes the text straight away through `ops.setFontNow`; the text is redrawn when the font
file has arrived. Before, the change waited for the download, which on a slow connection felt like a dead click.
