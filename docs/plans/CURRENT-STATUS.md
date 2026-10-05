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
| 9 Production Engine | **In progress** | 9A/9B foundation PR #17 merge `c1d32b5` |

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
- Printer ICC soft proof and profile-based CMYK TIFF export; editing remains RGB.

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
- Large layered-PSD rendering uses bounded tiles for expensive per-layer rendering instead of requiring document-sized scratch renders.
- The Editor Stage continues to use its whole-design overview plus settled sharp visible-region renderer.

### PSD / export parity

- Layered PSD export is shipped through the existing `ag-psd` dependency.
- Artwork remains in separate PSD layers with group nesting retained.
- Unsupported live constructs rasterise per layer, not as one flattened document.
- Production invariants run before layered export.

### Colour and print

- The print dialog is a broader **Production export** surface.
- Layered PSD handoff sits beside the existing printer-profile workflow.
- Explicit 72/150/300 DPI document resolution choices are available.
- ICC soft proof, perceptual/relative rendering intent, black-point compensation and embedded-profile CMYK TIFF remain the colour-managed print path.
- Editing is still RGB; Phase 8 does not claim native CMYK document editing.

### Studio production automation

- Studio derives production state for a job: missing formats, open feedback, design changes after approval and deliveries made stale by later design edits.
- The status is actionable and routes the designer directly to Key visual, Review or Deliver as appropriate.

### Professional hardening

- Production/export invariants catch invalid document dimensions/transforms, duplicate layer/group IDs, empty raster sources and orphan group references before expensive handoff work.
- Unit coverage was added for gradient midpoint/opacity behaviour, large-document budgets/tiling, Studio production readiness and export invariants.

Final PR #15 validation on `0c59dfc6`: strict TypeScript passed, unit tests passed, production build passed and Netlify deploy preview passed. The full Playwright browser suite was not run by normal CI and is not claimed as passed.

## Phase 9 in progress — Production Engine

Phase 9 is now an active engineering programme rather than a future boundary. The accepted sequence is:

**9A GPU render graph + tiled compositor → 9B OPFS scratch/memory → 9C native ICC/RGB/CMYK document colour → 9D PDF/X-4 + preflight/validation → 9E production torture suite and performance hardening.**

The AI/design API is explicitly excluded.

### 9A/9B foundation shipped

PR #17 merged as `c1d32b5`, rebased on top of the guided-workspace UI work from PR #16.

- Added a renderer-independent dependency graph for layers/groups/adjustments/boards/document composites.
- Local changes can resolve to only the tiles touched by the changed node and its dependent composites.
- Added stable tile identity shared by GPU, RAM and scratch tiers.
- Added WebGL2 capability detection with mandatory CPU fallback.
- Added bounded LRU tile residency by both tile count and byte budget with explicit disposal hooks for GPU texture ownership.
- Added OPFS project scratch buckets for tiles, composites, previews and history.
- Added quota/persistence inspection and a persisted-storage request path.
- Scratch unavailability/denial is non-fatal by design; callers keep RAM/CPU fallbacks.
- Added deterministic unit coverage for dependency invalidation, cache eviction and cross-tier cache keys.
- The engineering contract and acceptance criteria for 9A through 9E live in `PHASE-9-PRODUCTION-ENGINE.md`.

Final PR #17 validation on `5de32827`: strict TypeScript passed, unit tests passed, production build passed and Netlify deploy preview passed. The full Playwright browser suite was not run by normal CI and is not claimed as passed.

### What is not yet claimed

- Stage is not yet driven by the new render graph; current CPU overview/sharp rendering remains the production path while integration is built.
- WebGL2 shaders do not yet own normal layer/effect compositing.
- OPFS scratch exists as a storage tier but pressure-driven GPU → RAM → OPFS spill/restore is not wired into Stage/history yet.
- Documents still store/edit colour as RGB; native CMYK values/profile identity are not yet part of the document schema.
- PDF/X-4 writer/conformance validation is not yet shipped.
- The production torture suite/performance gates are not yet release gates.

## Brand workspace

PR #14 (`8872a90`) promoted Brand into a dedicated workspace and added living published brand-guideline portals. PR #16 later simplified the guided Brand/mobile Effects UI before the Phase 9 foundation was rebased and merged.

## Separate future track: AI connector / design API

Do not include this in the active production sequence. If deliberately revived later, it should operate structured editable VoidCanvas projects with permissions, protected elements, transaction-level undo, explicit versions, ownership and privacy boundaries.

## Branch housekeeping

- `master` is the deployment source of truth.
- Phase 7A merged through PR #10; 7B through PR #12; 7C/7D through PR #13.
- Brand workspace/portals merged through PR #14.
- Professional production depth merged through PR #15.
- Guided workspace/mobile Effects refinement merged through PR #16.
- Phase 9A/9B foundation merged through PR #17.
- PR #8 designer-production workflows are on master.
- `campaign/make-something` is historical and must not be merged wholesale.

## Next execution order

1. Integrate Stage with the Phase 9 render graph and bounded tile residency while preserving CPU fallback.
2. Move eligible layer/group/effect compositing to WebGL2 shaders and add context-loss recovery.
3. Wire pressure-driven GPU → RAM → OPFS spill/restore and deep history storage.
4. Introduce document-native working colour model/profile metadata and RGB/CMYK conversion/edit semantics.
5. Implement PDF/X-4 output, print preflight and independent conformance validation.
6. Build the production torture fixture suite and make measured performance/fidelity budgets release gates.

Phase 9 is active. AI/design API remains excluded unless explicitly reactivated.
