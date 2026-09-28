# Effects and where they apply

Phase 4 of `plans/workflow-reliability-2026-09-28.md`. This is how effects work in the Editor after it: what can carry them, how their scope is chosen, how they are drawn, saved and tested.

## The model

Every layer, group, board and the design has an ordered effect stack, `effects: Effect[]` (`src/editor/types.ts`).

- An `Effect` is an adjustment or a Void effect (`kind`, `values`, `effectParams` and so on, as `AdjustmentSettings`) plus `id`, `on`, `opacity` (shown as Strength), `blend`, an optional `link`, an optional `mask`, and `unknown` for kinds from a newer Voidcanvas.
- Effects run top to bottom of the list, each on the result of the one before. The Effects section says "Order matters here" when a spatial effect sits with others.
- Layer styles (shadow, glow, stroke, overlays) stay in `styles` and still draw after the effect stack. They are listed as rows in the same Effects section, so there is one place to look. Groups can carry styles too.
- The pure helpers are in `src/editor/effects.ts`: `newEffect`, `copyEffect`, `freshFx`, `stackOf`, `withStacks`, `patchEffect`, `linkedCopies`, `groupUnits`, `markUnknown`, `fxKey`, `isSpatial`.

## Scope

| Scope | How it works |
|---|---|
| One layer | The layer's own stack. Nothing below it changes |
| Several layers | A copy on each layer, sharing a `link`. Changing one changes all. The row says "On: Portrait, Texture", with Unlink this one and Add the selected layers |
| A group, as one image | The group's stack, run on what the group's layers make together. A group with effects, styles or a mask always draws as one image |
| A group's contents | "Put these effects on each layer instead" turns the group's effects into linked copies on each thing directly inside it |
| An adjustment layer | Reaches everything below (the default), only its own group, or just the layer below (a clipping mask). Properties shows this as **Changes** |
| A board | The board's stack, run on the board's area, on the canvas and in export alike |
| The whole design | The design's stack, run last. On a design with boards it runs on each board |

**Asked once.** A spatial effect (blur, grain, noise, dots, distortion) added to a group, or to several layers in the same group, asks "one image, or each layer?". Each choice shows a small preview, and "Remember for X" keeps the answer for that effect (`fxScope` in the UI preferences). Colour effects never ask: they look the same either way, so they go on the group.

**Adjustment layer above.** With several layers selected, the Add menu has "As an adjustment layer above them". The layers are grouped if they are not already one group, and the adjustment goes inside the group, reaching only the group. It is one undo step.

**Leave out of the group's effects.** A child's `fxExclude` flag. The group's run is cut at that child (`groupUnits`): each run of included children is drawn and processed as one image, the child left out draws clean in its place. A blur does not cross a child that is left out.

**Masks.** An effect can show only in part of its target: in its ⋯ menu, "Show only in the selection" or "Hide in the selection", then Invert mask, Turn mask off, Remove mask. The row says Masked. Groups can also have a mask, which applies after their effects.

**Where masks sit.** Adjustment layer masks, group masks and the masks of effects on groups, boards and the design are page pixels with a position, `maskAt` (none means 0,0). They are drawn one mask pixel to one page pixel from there, never stretched. Moving a board moves the masks of what is on it; a board placed left of or above the others shifts every mask with everything else; adding a board or growing the page leaves them where they are; duplicating a board, a group, or pasting, moves the copies' masks with the copies; resizing, rotating, flipping, cropping and changing the canvas size change them with the page (`mapDocMasks`, `shiftMask`, `maskOnPage` in `store.ts`). An effect mask on a layer sits relative to the layer (`maskAt` is from the layer's x and y), so it moves when the layer moves; it does not scale or turn with the layer. Painting on an adjustment mask, and inverting any of these masks, works on the whole page at 0,0.

## Controls

- **Properties > Effects** for a layer, several layers, a group, a board or the design (nothing selected). "+ Effect" lists effects that fit, searchable. Each row has an eye, the name (click to open its settings, Strength and Blend), a link icon when linked, Masked when masked, and a ⋯ menu: Duplicate, Copy, Move up, Move down, Reset, the mask items, Remove. Rows can be dragged to reorder. A newly added effect opens.
- **A group** also gets: Blend as a group (forced on while it has effects or a mask), Mask (Add mask, From selection, Hide selection, Invert, Turn off, Remove) and Put these effects on each layer instead.
- **A child of a group with effects** gets "Leave out of “Group” effects".
- **Right-click on the canvas** and the Layer menu: Copy effects, Paste effects, Paste effects in place of theirs.
- **Command search**: every effect as "Add effect: …", added to the selection, or with nothing selected to the active board or the design.
- **View > Effects off while looking** (`fxOff`) and holding `\` show the design without effects. Neither is an edit, and export is not affected.
- **Phone**: the Effects sheet shows the same Effects section for the selection, above the Filters and Adjustments buttons. The Select sheet shows it inside Properties.

## Duplicates and copies

Duplicating a layer, a group or a board, and pasting layers, gives every effect a new id. Links are remapped per duplicate: copies made together stay linked to each other, never to the originals (`freshFx`). Copy effects and Paste effects make unlinked copies.

## Drawing

In `src/editor/engine.ts`:

- `processSettings(src, settings, scale, fullRes, refLong)` runs one effect. `refLong` is the long side of the target in document pixels. A Void effect's settings are for its target at the reference size, `min(1200, refLong)`. The preview always works at that size, whatever size the target is drawn at, and is scaled to fit; an export runs at the output size with pixel settings scaled by `scaleParams`. So dots, grain and edges look the same on the canvas, zoomed out, with many boards and in export.
- `applyFxStack(canvas, rect, list, o)` runs a stack on one area of a canvas, mixing each effect by its strength and blend, and by its mask (`before × (1 − mask) + after × mask`).
- Group composites are cached in `groupCache`, layers with effects in `fxCache`, keyed by content, settings (`fxKey`), the mask and the boards. Items above 12 million pixels are not cached.
- Normal-blend adjustment layers now replace what is below them where they apply (destination-out, then add), instead of stacking over it, so a partly transparent area is not doubled.
- Void effects keep the transparency they were given, so grain or dots on a cut-out stay inside it.

## Saving

- Effect stacks are saved with their targets. An effect mask is stored beside the layers as `fx:<owner>:<effect id>:mask` (owner: layer id, `g<group id>`, `f<board id>` or `doc`), with `hasMask: true` on the effect. Group masks are `g:<id>:mask`. `maskAt` is saved with the effect, the group or the adjustment layer.
- `.void` version 4 carries all of it (`docs/void-format.md`). A reader keeps effects of kinds it does not know, marks them `unknown`, does not draw them and says so when the file opens.
- PSD import keeps group masks, and a clipped adjustment becomes an adjustment with `reach: 'clip'`.

## Effects page

- The page keeps a stack: `below`, the effect being edited, `above` (`src/store/useStore.ts`). "Add another effect" keeps the current one and starts a new one on top; tapping an effect in **Your effects** edits it; × removes it; Undo covers all of this.
- The preview, the download and Open in Editor use the whole stack. The download name lists the effects in order.
- **Open in Editor** puts the effects on the photo layer as its own effects, still editable (the filter-layer handoff `liveEffect` from tool pages lands the same way).
- **Add to my design** appears when a design is open in the Editor in the same browser tab. It opens that design and adds the effects to what was selected there (the saved selection), or to the active board or the design when nothing was. One undo step. The toast says where they went.

## Tests

- `e2e/effects-scope.mjs`: the night-session cases by their pixels (blur one layer, colour on two linked layers, group blend and opacity as a unit, grain on a group as one image with the question and its previews, colour on a group without a question, an adjustment layer above a selection that reaches only its group, group grain at 12% with the Logo left out), each through undo, redo, save and reload, and export; an effect mask; duplicates; grouping as one undo step; copy and paste effects; effects off; 30 combinations of effect and scope compared between the canvas at half size and the export; the Effects page stack and both handoffs; the phone Effects sheet.
- Unit tests: `src/editor/__tests__/effects.test.ts` (stacks, links, duplicates, cache keys, leaving children out, unknown effects, `.void` round trip with masks) and `src/store/__tests__/stack.test.ts` (the Effects page stack).
- `e2e/bake-fullres.mjs` checks that a board's filter keeps its size when a second board is added.
- `e2e/effects-scope.mjs` also checks that masks stay with their board through moving it, moving it left of the others, adding a board, duplicating it, and save and reload, and that an effect mask on a layer moves with the layer.
