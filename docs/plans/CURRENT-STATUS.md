# VoidCanvas current build status

Updated: 4 October 2026

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
| 8 Professional production depth | **Shipped** | PR #15 merge `93da991` |

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

- Selected live gradient overlays now expose on-canvas centre and angle/scale handles.
- Gradient colour stops support their own opacity and midpoint interpolation.
- Designers can save personal gradient presets from the existing gradient controls.
- The Effects workspace already has stable no-black-blink rendering, quick/full preview channels and a draggable before/after Compare split; Phase 8 keeps that as the comparison path rather than adding a second competing UI.

### Large-document path

- One render-budget policy classifies normal, large and huge documents and caps interactive overview/sharp-preview work without changing production resolution.
- Visible-region tile planning is now a shared engine primitive.
- Large layered-PSD rendering uses bounded tiles for expensive per-layer rendering instead of requiring document-sized scratch renders.
- The Editor Stage continues to use its existing whole-design overview plus settled sharp visible-region renderer. Phase 8 extends that architecture rather than replacing it with an unrelated compositor.

### PSD / export parity

- Layered PSD export is shipped through the existing `ag-psd` dependency.
- Artwork remains in separate PSD layers with group nesting retained.
- Unsupported live constructs rasterise per layer, not as one flattened document, preserving practical downstream editability.
- Production invariants run before layered export.

### Colour and print

- The print dialog is now a broader **Production export** surface.
- Layered PSD handoff sits beside the existing printer-profile workflow.
- Explicit 72/150/300 DPI document resolution choices are available.
- ICC soft proof, perceptual/relative rendering intent, black-point compensation and embedded-profile CMYK TIFF remain the colour-managed print path.
- Editing is still RGB; Phase 8 does not pretend VoidCanvas is a native CMYK document editor.

### Studio production automation

- Studio continuously derives production state for a job: missing formats, open feedback, design changes after approval and deliveries made stale by later design edits.
- The status is actionable and routes the designer directly to Key visual, Review or Deliver as appropriate.
- Existing Studio batch packaging, approval/version selection and delivery history remain the execution path; Phase 8 adds the missing stale/incomplete awareness rather than duplicating them.

### Professional hardening

- Production/export invariants catch invalid document dimensions/transforms, duplicate layer/group IDs, empty raster sources and orphan group references before expensive handoff work.
- Unit coverage was added for gradient midpoint/opacity behaviour, large-document budgets/tiling, Studio production readiness and export invariants.

Final PR #15 validation on `0c59dfc6`: strict TypeScript passed, unit tests passed, production build passed and Netlify deploy preview passed. The full Playwright browser suite was not run by normal CI and is not claimed as passed.

## Brand workspace

PR #14 (`8872a90`) promoted Brand into a dedicated workspace and added living published brand-guideline portals. This work was merged into `master` before Phase 8 and Phase 8 was reconciled on top of it.

## Remaining infrastructure boundaries

These are deeper infrastructure/research projects, not unfinished Phase 8 UI promises:

- A true GPU/WebGL tiled compositor if real documents prove the current overview + sharp-region + tiled-production path insufficient.
- OPFS-backed scratch/history if profiling shows browser memory pressure warrants it.
- Native CMYK document editing and certified PDF/X/prepress output beyond the current ICC proof/CMYK TIFF workflow.
- Further smart-object/PSD round-trip fidelity where source formats expose enough information.
- Real-GPU validation for the WebGPU background-removal path.

## Separate future track: AI connector / design API

Do not include this in the active production sequence. If deliberately revived later, it should operate structured editable VoidCanvas projects with permissions, protected elements, transaction-level undo, explicit versions, ownership and privacy boundaries.

## Branch housekeeping

- `master` is the deployment source of truth.
- Phase 7A merged through PR #10; 7B through PR #12; 7C/7D through PR #13.
- Brand workspace/portals merged through PR #14.
- Professional production depth merged through PR #15.
- PR #8 designer-production workflows are on master.
- `campaign/make-something` is historical and must not be merged wholesale.

## Next execution order

Phase 7 and the requested Phase 8 production-depth run are complete. New work should now be driven by measured regressions, real production files and performance evidence rather than opening another broad feature phase. AI/design API remains excluded unless explicitly reactivated.
