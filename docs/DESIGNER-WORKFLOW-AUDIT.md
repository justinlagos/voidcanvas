# Designer workflow audit

Review date: 4 October 2026. Baseline: `7108fbd`, including the Effects workspace improvements shown in the supplied screenshot.

These are three simulated designer perspectives, supported by code inspection and browser regression checks. They are not interviews or a claim that three independent designers tested the product. The review focuses on everyday composition and manipulation; it does not certify full Photoshop or Illustrator parity.

## Three perspectives

| Perspective | Representative work | What familiarity requires | Findings addressed |
| --- | --- | --- | --- |
| Expert, 20+ years | Load type transparency, paint texture on a separate layer, retouch, use paths and transformed masks | Precise selection boundaries; stable feathering; editable originals; correct sample source; consistent locks | Initial dab leaked; feathered edges were repeatedly attenuated; type and shape masks rasterized their host; clone on an empty layer sampled nothing; path painting ignored selections |
| Experienced, 10 years | Build a poster with type, clipping, gradients, brush accents and multiple boards | Predictable previews; identical restrictions across tools; reversible operations | Alpha-lock preview and commit differed; bucket fill and path operations bypassed alpha lock; painting could bypass locked type/adjustments; retouch feathering could spill outside selections |
| Newer, 5 years | Select lettering, create a layer, brush inside it, refine a mask and recover with undo | Clear distinction between object selection and pixel selection; visible painting target; discoverable commands | No clear paint-boundary status; mask foreground colour did not control visibility; layer-pixel selection was buried; a stale clone source survived document changes |

## Confirmed fixes

1. The first brush dab and later dabs use the same pixel-selection constraint. Includes brush, eraser, clone and retouch stroke overlays.
2. Strokes accumulate in an unmasked buffer. The selection is applied once to each rebuilt preview, preserving feathered and antialiased edges as the pointer moves.
3. The selection at stroke start remains the stroke boundary.
4. Layer masks can be added to live text and shapes without rasterizing them. Painting converts document coordinates to local mask coordinates; scale and rotation remain editable.
5. Mask painting uses foreground luminance: black hides, white reveals, grey produces partial visibility. Eraser hides. Preview and commit share one mask compositor.
6. Disabled masks report why painting is blocked.
7. Locked layers are checked before creating masks, rasterizing or adding an automatic paint layer. Transparent-pixel lock prevents erasure and selected-pixel deletion.
8. Alpha-lock painting previews match committed strokes. Store fill, bucket fill, gradients, path fill, path stroke and selection stroke preserve existing alpha where appropriate. Selection stroke intentionally retains its inside/centre/outside semantics.
9. Path fills and strokes, including tapered strokes, respect the pixel selection.
10. Clone offers Sample all layers, enabling visible artwork to be cloned onto an empty retouch layer; turning it off samples the destination layer only. The source resets when documents change.
11. Healing and object removal enforce the selection on their final result, after algorithmic edge feathering. Asynchronous removal keeps its original target and discards results if that layer/document changes during processing.
12. Brush options identify an active pixel selection and alpha lock. The canvas context menu exposes Layer pixels for loading an object's silhouette.

Selecting an object alone remains different from making a pixel selection. The Move tool's bounding box should not silently constrain every paint operation. Use Select > Layer pixels (or Ctrl/Cmd-click its layer thumbnail) to load a silhouette, then add the paint layer. Existing clipping masks provide a live relationship to the base object.

## Existing capabilities checked against the request

The editor already has clipping masks, layer/group effects, per-layer masks, vector masks, groups, paths, on-path text, selection modifiers, channels, transforms, undo/history, artboards and export. These should be strengthened through workflow checks rather than rebuilt from a stale feature list. The inherited Effects workspace change also keeps previews stable and exposes movable controls; it is an earlier change, not a new implementation in this audit.

## Gaps identified in the initial selection-painting patch

These were the follow-up scope. Their implementations and remaining boundaries are now documented in [Designer production workflows](DESIGNER-PRODUCTION-WORKFLOWS.md).

| Gap | Practical consequence | Recommended next implementation |
| --- | --- | --- |
| Smart objects | Imported smart-object content is retained as pixels; painting can bake image transforms | Embedded editable sources, explicit rasterization, replace-content workflow and nested editing |
| Dedicated Draw Inside mode | Illustrator users must manually establish a pixel selection or clipping relationship | Explicit mode with a visible host and exit control; new objects should inherit a live clip relationship |
| Brush tip and preset system | Only round tips; size, hardness, opacity, flow, smoothing and pressure do not provide textured brushes | Tip assets, spacing, angle, roundness and saved presets, with performance limits |
| Non-destructive healing sample modes | Clone now supports separate-layer sampling; healing/removal still operate on destination pixels | Current/current-and-below/all-layer source modes and separate patch output |
| Mask unlinking and resizing policy | Independent mask positioning and changing text geometry need a defined workflow | Mask link state and explicit policies for masks when type dimensions change |
| Pattern overlays | PSD pattern overlays are reported as unsupported | Pattern assets, transform controls and reliable import/render parity |
| CMYK/soft proof | RGB editing is not a complete print colour workflow | Colour-managed proofing and verified print export, treated as a separate engineering project |
| Advanced deformation | Perspective and warp exist, but a dedicated liquify workflow is missing | Reversible deformation with a source snapshot and clear apply/cancel |

These larger additions need their own editing, persistence, import/export and undo implementations. A superficial button for them would introduce new reliability problems.

## Reference expectations

- Adobe, [Edit and refine layer masks](https://helpx.adobe.com/photoshop/desktop/create-masks/layer-masks/edit-and-refine-layer-masks.html): mask target indication and black/white/grey behaviour.
- Adobe, [Nondestructive editing](https://helpx.adobe.com/photoshop/using/nondestructive-editing.html): original preservation, separate retouch layers and sample-all-layer workflows.
- Adobe, [Illustrator drawing modes](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/learn-drawing-basics/drawing-modes-overview.html): explicit Draw Inside mode and automatic clipping.

## Verification

`e2e/paint-workflows.mjs` uses real pointer input, live compositor reads and bitmap assertions. It covers the screenshot's text-selection sequence, first-dab preview, feather stability, transformed editable masks, foreground mask colours, alpha locks, layer locks, separate-layer cloning, document changes and selected path painting. It is included in the standard E2E runner. Broader checks and outcomes are recorded in the pull request.
