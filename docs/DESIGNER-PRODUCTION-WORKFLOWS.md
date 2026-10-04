# Designer production workflows

The reported case was raster text on a repeating red background, with several rectangular selections. The old healing implementation copied a single nearby patch, could sample other selected lettering, and blurred the result. The new repair excludes **all** selected regions, rejects contaminated/transparent donor rectangles, scores clean context and refines translation phase. Disconnected selections are repaired independently. It changes only the selected coverage.

## How to use

Select the text **and a small margin of background**, then choose **Filter → Remove selected area** or the selection context menu. Compare Original/Repair and Apply. The output is a separate patch with one undo step; the source is retained. A clean translation cannot reconstruct every scene: insufficient clean context leaves the image unchanged and explains the next step. The AI Remove tool remains available for complex backgrounds, subject to the existing download consent.

Healing and Remove offer Current, Current and below, and All visible layer sources. Separate patch is on by default, including on empty retouch layers; source and destination are captured before the asynchronous operation. A changed design rejects a stale result. Feathered coverage is emitted once. Large pixel operations run in a worker with a processing timeout.

## Implemented workflows and boundaries

| Workflow | Entry point and behavior | Persistence / current boundary |
|---|---|---|
| Smart objects | Layer → Smart objects: convert, edit in a contents tab, save to parent, replace with image or `.void`, explicit Rasterize | Embedded `.void` source, original imported bytes when available, and cached appearance are separate assets. Native embedded PSD sources open as layered contents. Undecodable/missing originals retain an editable cache and an import report. Updating complex placed artwork preserves its displayed bounds, not Photoshop warp parameters. |
| Draw Inside | Layer → Draw Inside selected object; named host and Exit in tool options | New raster, text and vector artwork inherits a live `clipId`, host group and board. Moving the host changes the clip; deleting it releases orphan clips and exits. The mode resets between documents; clip relationships persist. |
| Brush presets | Tool options → Brush preset, or Layer → Brush tips and presets | Round, chalk, scatter and flat tips; imported black/white tips, spacing, angle, roundness and saved dynamics. Up to 24 local presets, 512px imported tips, 1024px generated tips, bounded tip caches. Presets live in browser preferences, not the document. |
| Non-destructive healing | Healing/Remove options; Remove selected area preview | Captured sampling mode and separate patch output; source transforms are retained. Editable objects require separate output. |
| Mask positioning | Layer → Layer mask → Mask position and resize | Unlink freezes a document transform, X/Y position is independently editable, relinking resamples into local space preserving appearance. Fixed pixels is the default geometry policy; Scale resizes a linked mask as text/shape dimensions change. Painting, live preview and clipping use the same mask mapping. |
| Pattern overlay | Layer style → Pattern overlay | Lines/dots/grid and imported repeating image tiles; scale, angle, offsets, opacity and blend. Tile data is stored in styles; PSD embedded RGB/grayscale patterns map to the same rendering engine. Missing/undecodable tiles are reported. |
| Print proof / CMYK | File → Print proof and CMYK export | LittleCMS transforms using the printer's supplied CMYK ICC profile; relative or perceptual intent, black point compensation. Canvas proof uses a 33³ interpolated LUT. Full-resolution CMYK TIFF uses the actual ICC transform, embeds the profile, and records DPI. Transparency is flattened to white. Editing stays RGB; this is not a native CMYK document editor or PDF/X/prepress certification. |
| Liquify | Filter → Liquify, or Liquify badge in Layers | Push, pinch, bloat and restore; original snapshot plus normalized dabs. Preview, Undo dab, Reset, Apply/Cancel; reopened adjustments resample the preserved original once. Snapshot and dabs survive `.void` saves. Up to 600 dabs; rasterize explicitly before further pixel painting. |

## Three designer perspectives

These are simulated expert reviews, not claims of testing by three real designers.

- **20+ years:** source preservation and explicit rasterization; separate retouch layers; clipping follows a host; unlinked masks remain stationary; print output must use a real ICC transform. The engineering boundaries above stay explicit rather than implying complete Adobe format parity.
- **10 years:** repeated selection repairs should not copy neighboring selected text, textures should meet at their edges, named brush presets should restore their dynamics, patterns should look the same in preview/export, and Liquify should remain revisable.
- **5 years:** selected-area removal is visible beside the selection workflow; before/after preview and Apply/Cancel make the effect understandable; the active Draw Inside host has a clear exit; layer badges lead back to source/deformation editing.

## Verification

- `src/editor/__tests__/designer-workflows.test.ts`: texture phase, disconnected selection exclusion, larger-selection context, feather coverage, no-donor refusal, immutable deformation source, premultiplied-alpha sampling and TIFF tags.
- `e2e/designer-production.mjs`: real editor actions, pointer deformation, nested source editing, named presets, live clips, mask mapping, pattern parity, ICC profile loading, TIFF download and portable document round trips. Set `CMYK_PROFILE` to a CMYK ICC fixture; system Ghostscript profile is used locally when present and is not shipped with Voidcanvas.
- Independently decoded `/tmp/voidcanvas-print-qa.tif` using Pillow/LCMS: CMYK, 320×240, 300 DPI, 187484-byte embedded printer profile. White: `(0,0,0,0)`; red: `(0,255,255,0)`. ICC decoding produces white `(255,255,255)` and print red `(238,51,56)`.
- Existing selection/mask painting and Effects regression suites are rerun alongside these checks. Downloaded AI model inference is not part of the local regression fixture.

## Runtime licenses

LittleCMS 2 and `lcms-wasm` use the MIT license. Their runtime is copied from the locked dependency by `scripts/install-colour.mjs` at install time and served locally. Printer profiles are supplied by the user; no third-party printer profile is bundled.
