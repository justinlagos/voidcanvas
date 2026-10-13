# Sprint C1 — Native Creative Asset Flow (implemented)

Branch: `feat/native-asset-flow-c1`. Status: implemented, unit-gated, browser-evidence via harness + CI gate.

## What was built (actual, not intended)

**C1.1 Ingestion** — `src/editor/assets/ingest.ts`
- Entry points reuse the existing import path: `importFiles` (`src/editor/io.ts`) now runs
  validated ingest for every image (file picker, Stage drag-and-drop, paste handler,
  phone upload/camera, launch-queue files). No parallel import system.
- Validation: MIME whitelist PNG/JPEG/WebP/GIF (with `.jpg`-extension fallback for empty
  paste/drop types), 50 MB file cap, 12000 px side cap, 50 MP decompression-bomb guard,
  empty-file rejection. Rejections toast a plain-English reason; nothing is placed.
- EXIF orientation via `createImageBitmap(blob, { imageOrientation: 'from-image' })` with an
  `<img>` fallback (both paths revoke their object URL). Embedded ICC is honoured by the
  browser's colour-managed decode where supported; canvas stays in sRGB (limitation below).
- Editing resolution stays 4096 px max side (unchanged); the **original Blob is never
  re-encoded** and is registered in the asset store for lineage + portable save.
- Thumbnails are 256 px JPEG data URLs rendered from the decoded canvas; they never
  replace the source. Object URLs are created only in the decode fallback and revoked
  on load/error; the asset path holds no persistent object URLs.

**Asset registry** — `src/editor/assets/asset-store.ts` (+ `place.ts`, `ops.ts`)
- Reuses B07 semantics: `lineageOf`/`placementPatch` from `src/editor/unified/asset-tray.ts`
  are the lineage/placement authority (mock tests still green); the native store adds
  real bytes (in-memory original Blobs), registry metadata and thumbnail previews.
- No duplicate storage, scene graph, selection or undo: placement helpers return ordinary
  Layer patches; `ops.ts` commits them with `addLayer`/`updateLayer` + `commit` (one named
  history step per place/fill/replace). B08 generation-task model untouched (C2 reuses it).

**C1.2 Interface** — three entry points, one tray, contextual surfacing
- Empty image frame (new placeholder concept, no new layer type): an ordinary raster layer
  with `emptyFrame: true` and a 1x1 transparent canvas; displayed box = scale. Stage draws
  a dashed overlay + label on the canvas overlay only (never in `renderDoc`/exports).
  Selected empty frames show Upload / Search (gated) / Generate (gated) in PropertiesPanel
  plus a Fit control (cover/contain for the next fill).
- Insert: Add menu gains an Image-frame tile (centred placeholder); Photo now validates.
- Contextual: FloatingBar gains Replace on raster layers (hidden for empty frames, where
  Replace fills); raster PropertiesPanel gains an Image-source section (source info,
  lineage position, Replace, Open asset tray); shape panels offer Frame-this-shape and
  Clip-to-below (existing `clipId` machinery).
- Asset tray: new `assets` dock panel (`AssetTray.tsx`, registered in `ui-store`,
  `actions`, `Dock`; old layouts receive it via `complete()` into the strip, fresh
  workspaces pair it with Layers). Upload (multi + drag-drop onto the tray), per-asset
  Place / Fill (needs selected empty frame) / Replace (needs selected image), MIME +
  dimensions + lineage position per card, local-only footer. Search/Generate are disabled
  buttons with milestone tooltips, never dead ends. Keyboard: labelled buttons, focus ring;
  phone: uploads route through the same validated `importFiles`.

**C1.3 Placement / replacement** — `place.ts` + `ops.ts`
- Place as new layer (contain-fit into the active board), fill frame (cover default,
  centred; contain optional), clip to shape via existing clipping masks, replace content.
- Replace swaps canvas + asset pointer only; x/y/scale/rotation, mask, frameFit,
  effects/styles, clipId, frameId are untouched (unit + browser asserted).

**C1.4 Non-destructive** — originals preserved in the store; adjustments ride existing
  effect stacks/adjustment layers/masks; every op is one atomic history transaction
  (undo/redo symmetric, asserted in browser).

**C1.5 Persistence (no format bump)** — additive on `.void` v5, see `docs/void-format.md`
- `RasterLayer.asset` (plain JSON ref) + `Doc.assets` registry (resourceId -> record);
  original bytes ride as `asset:<sha256>` blobs through the existing content-addressed
  manifest, so identical bytes are stored once across uploads and replacements.
- C1.1 safeguard: files with lineage are stamped `version: 6, minReader: 6`, so v5 and
  older clients refuse them outright instead of silently discarding originals on
  resave. Lineage-free files stay v5/5 and open everywhere. Same ZIP container, no
  migration; `manifestCompatibility` + `projectHasLineage` are unit-covered
  (`src/editor/assets/__tests__/compat.test.ts`), as are v6 round-trips.
- Every upload joins `doc.assets` immediately (`syncRegistryState` in `ingestFile`), so
  unplaced tray assets persist through save/reopen. Uploads create no history entry.
- The module registry is scoped per document (`scopeRegistryToDoc` on new/open/close):
  one design's tray never leaks into another and saves never carry foreign originals.
- Empty frames show only their contextual UI: Quick actions (bg-remove, filters, mirror,
  flip) and FloatingBar equivalents stay hidden until the frame holds pixels.
- Contract verified by `src/editor/assets/__tests__/persistence.test.ts` (round-trip,
  graceful degradation, missing-part tolerance) and the browser save/close/reopen leg.

## Evidence
- Unit: `src/editor/assets/__tests__/` (ingest validation, cover/contain math, lineage,
  void round-trip) + full suite 371 green + `tsc` clean.
- Browser, module level (real Chromium, real canvas): `harness/` +
  `e2e/native-asset-harness.mjs` (28/28: full 14-step acceptance incl. alpha/rotation
  fixtures, parity tol 6/40, 6-replacement perf + heap check, save/reopen, 1080x1350
  PNG + %PDF export).
- Browser, real UI (real Chromium, real production components): `harness/harness-ui.tsx`
  mounts the actual Stage (+FloatingBar), PropertiesPanel (C1 sections) and AssetTray
  against the real store, driven by `e2e/native-asset-ui.mjs` with genuine interactions
  (file inputs, Fill/Replace clicks, keyboard focus audit). 23/23, zero page errors,
  screenshots in `e2e/evidence/ui-*.png`. Only the Next.js app shell is stubbed, because
  this sandbox cannot compile it (see Limitations).
- UI gate for CI: `e2e/native-asset-flow.mjs` + `.github/workflows/native-asset-flow.yml`
  (build, serve exact commit, run, upload `e2e/evidence/`). Not yet observed green: this
  sandbox cannot compile `/editor` (OOM, 3.9 GB) nor push (no credentials).

## Known limitations
- Colour: browser decode honours embedded ICC where supported; editing stays sRGB, no
  soft-proof here (that remains the print-profile path). No CMYK source support.
- GIF: first frame only (animated GIFs place as stills).
- Frame fill is cover-fit placement, not a hard clip; hard edges use Clip-to-below.
- Refit after fill is manual (move/resize); changing Fit only affects the next fill.
- Old builds resaving a C1 file keep pixels but drop lineage originals.
- Full Next build + UI-gate run pending in CI (sandbox OOM); PR not opened (no push
  credentials in this environment).
