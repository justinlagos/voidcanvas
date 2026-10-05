# VoidCanvas current build status

Updated: 5 October 2026

This file is the authoritative status summary for active product work. Older plan files remain useful as historical specifications, but their build-status tables may be stale.

The AI connector / MCP / design-API concept is explicitly outside the current implementation sequence.

## Workflow plan

| Phase | Status | Shipped evidence |
|---|---|---|
| 0 Stop losing work | Shipped | `452dd87` |
| 1 Phone | Shipped | `2e748a0`, later fixes `4367fb8` |
| 2 Everyday desktop speed | Shipped | `2e748a0` |
| 3 Versions and comments | Shipped | `a3f504e` |
| 4 Effect scope | Shipped | `d621010` |
| 5 Brief check + photography | Shipped | `5f73552` |
| 6 Export finish + coming back | Shipped | `4438995`, analytics `35aef30` |
| 7 Reuse, Library and campaigns | Shipped | 7A `a9e3ba6`, 7B `1fb45b9`, 7C/7D `577909f` |
| 8 Professional production depth | Shipped | PR #15 merge `93da991` |
| 9 Production Engine | **Shipped** | PR #17 `c1d32b5`, PR #18 `2b4dc96`, PR #19 `e3b51dd`, PR #20 `665685e`, completion PR #21 |

## Phase 7 summary

Phase 7 established the reusable production model rather than another set of disconnected presets.

- Named editable Looks and text styles; fresh effect identities on apply.
- Cross-design Library for logos, images, textures, colours, fonts, Looks and templates.
- Search/filter/recent ordering, dependency references, `used in` counts, safe delete and safe Replace source.
- Design/brand text-style scopes and existing Studio colour Looks bridged into the same Library.
- Studio jobs act as campaign containers. Brief-linked text is the shared-token mechanism for date/time/venue/price/CTA and other details.
- Explicit **Change everywhere** is reversible and preserves manual/per-format overrides.
- Reuse moved out of the bottom-right canvas area into controlled editor chrome; contextual guidance stays inside the Library and can be dismissed permanently.

Phase 7C/7D validation: strict TypeScript, unit tests, production build and Netlify preview passed. Normal CI did not run the full Playwright suite, so it was not claimed.

## Designer production workflows

PR #8 (`c8ab5b5`) remains the main nondestructive production-workflow baseline:

- Embedded editable smart sources, nested source tabs, replace content and explicit rasterisation.
- Draw Inside with visible host and inherited live clipping.
- Textured/custom brush tips and saved presets.
- Selected-area repair, sampling modes and separate retouch patches.
- Mask link/unlink, independent placement and fixed/scale geometry policies.
- Pattern assets and embedded PSD pattern import.
- Reversible Liquify.
- Printer ICC soft proof and profile-based CMYK TIFF export.

See `../DESIGNER-PRODUCTION-WORKFLOWS.md` for practical boundaries.

## Phase 8 shipped — professional production depth

PR #15 merged as `93da991` after being reconciled with the Brand workspace/portal work from PR #14.

### Effects finish

- Selected live gradient overlays expose on-canvas centre and angle/scale handles.
- Gradient colour stops support their own opacity and midpoint interpolation.
- Designers can save personal gradient presets from the existing gradient controls.
- The Effects workspace retains stable no-black-blink rendering, quick/full preview channels and a draggable before/after Compare split.

### Large-document path

- One render-budget policy classifies normal, large and huge documents and caps interactive overview/sharp-preview work without changing production resolution.
- Visible-region tile planning is a shared engine primitive.
- Large layered-PSD rendering uses bounded tiles for expensive per-layer rendering.

### PSD / export parity

- Layered PSD export is shipped through the existing `ag-psd` dependency.
- Artwork remains in separate PSD layers with group nesting retained.
- Unsupported live constructs rasterise per layer, not as one flattened document.
- Production invariants run before layered export.

### Colour and print

- Production Export combines layered PSD and printer-profile workflows.
- ICC soft proof, rendering intent, black-point compensation and embedded-profile CMYK TIFF are shipped.
- Phase 9 extends this with explicit working-colour metadata and PDF/X-4 production output.

### Studio production automation

- Studio derives missing formats, open feedback, post-approval edits and stale deliveries and routes the designer to the appropriate production surface.

### Professional hardening

- Production/export invariants catch invalid dimensions/transforms, duplicate IDs, empty raster sources and orphan group references before expensive handoff work.

Final PR #15 validation on `0c59dfc6`: strict TypeScript passed, unit tests passed, production build passed and Netlify deploy preview passed. The full Playwright browser suite was not run by normal CI and is not claimed as passed.

## Phase 9 shipped — Production Engine

Phase 9 completed the requested non-AI production infrastructure sequence:

**9A WebGL render graph + tiled compositor → 9B OPFS scratch/memory → 9C native working colour + printer profiles → 9D PDF/X-4 + preflight → 9E production torture suite and hardening.**

### 9A — WebGL2 tiled compositor

- Renderer-independent dependency graph covers layers, nested groups, adjustments, boards and document composites.
- Visible-region tiles use stable identities across accelerated/resident/scratch tiers.
- WebGL2 compositor implements explicit pixel math for Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge/Burn, Hard/Soft Light, Difference and Exclusion.
- Hybrid tiled rendering uses GPU only where parity is explicit; unsupported blend modes, old devices, allocation failures and context loss fall back per tile to CPU Canvas.
- GPU resources remain disposable acceleration data; editable document state is never owned by WebGL.

### 9B — pressure-driven OPFS scratch

- GPU/RAM residency is bounded by tile count and bytes.
- Normal/elevated/critical pressure decisions can rebudget residency and force LRU eviction into OPFS through the shared tile key.
- Scratch supports restore, invalidation, quota inspection, persistence requests and per-project cleanup.
- Critical origin-storage pressure may purge scratch.
- OPFS is explicitly disposable. It is not and must not become the canonical project save; clearing site data may remove scratch without invalidating the design model.

### 9C — native working colour and printer profiles

- Documents have an explicit working colour model/profile; old documents default safely to sRGB.
- Native RGB/CMYK/Gray/Lab values, CMYK TAC diagnostics and pure-K intent helpers are part of the colour model.
- LittleCMS/WASM provides bidirectional sRGB ↔ CMYK transforms for embedded CMYK working profiles.
- Working profile and output/proof printer profile are separate concepts.
- Production Export can deliberately promote a validated loaded CMYK ICC profile to the document working space.
- UK/Europe and Nigeria profile choices are starting guidance only. VoidCanvas never silently substitutes a regional guess for the printer's profile.

Browser display canvases remain RGB display surfaces. Native CMYK identity/channel intent belongs to the document colour engine rather than pretending the browser framebuffer itself is CMYK.

### 9D — PDF/X-4 and production preflight

- PDF/X export blocks when the output-intent profile is missing or a selected target/raster source is invalid.
- VoidCanvas policy warns for no bleed and low document DPI; those are production policies, not invented PDF/X requirements.
- Full-resolution artwork is converted through the selected ICC to CMYK.
- The PDF/X writer emits PDF 1.6, an embedded CMYK ICCBased image colour space, `/GTS_PDFX` OutputIntent, XMP PDF/X-4 identification, TrimBox/BleedBox and trapped metadata.
- The dedicated production writer does not emit DeviceRGB artwork.
- PDF/X-4 is a flattened colour-managed print handoff. `.void` and layered PSD remain the editable/source handoff paths.

### 9E — torture/performance hardening

Deterministic CI fixtures cover:

- 8K photo poster — 61 layers / 14 effects
- 120-board campaign — 438 layers
- 30,000 × 20,000 exhibition artwork
- deep PSD workload — 320 layers / 48 effects
- CMYK brochure workload

CI gates bounded residency/overview policy, memory/storage pressure decisions, tile planning/readback orientation, PDF/X blocking preflight and PDF/X structural colour/output-intent requirements. Wall-clock timing/FPS/GPU memory remain real-browser measurements rather than flaky hosted-runner thresholds.

See `PHASE-9-COMPLETION.md` for the shipped contract and fidelity boundaries.

## Brand workspace

PR #14 (`8872a90`) promoted Brand into a dedicated workspace and added living published brand-guideline portals. PR #16 later simplified the guided Brand/mobile Effects UI before Phase 9.

## Separate future track: AI connector / design API

Do not include this in the active production sequence. If deliberately revived later, it should operate structured editable VoidCanvas projects with permissions, protected elements, transaction-level undo, explicit versions, ownership and privacy boundaries.

## Branch housekeeping

- `master` is the deployment source of truth.
- Phase 7A merged through PR #10; 7B through PR #12; 7C/7D through PR #13.
- Brand workspace/portals merged through PR #14.
- Professional production depth merged through PR #15.
- Guided workspace/mobile Effects refinement merged through PR #16.
- Phase 9 foundation merged through PR #17 and Stage controller through PR #18.
- WebGL2 composition core merged through PR #19; printer-profile colour foundation through PR #20.
- Phase 9 completion is PR #21.
- PR #8 designer-production workflows are on master.
- `campaign/make-something` is historical and must not be merged wholesale.

## Next execution order

Phase 9 is complete as an infrastructure/product run. New work should be driven by real production documents, browser/device measurements and regression reports rather than another broad architecture phase. Priority follow-up is measured parity/performance tuning on representative mobile and desktop hardware, plus any printer-specific PDF/X fixes found by receiving prepress workflows.

AI/design API remains excluded unless explicitly reactivated.
