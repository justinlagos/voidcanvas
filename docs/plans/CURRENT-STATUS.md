# VoidCanvas current build status

Updated: 4 October 2026

This file is the authoritative status summary for active product work. Older plan files remain useful as historical specifications, but their build-status tables may be stale.

The AI connector / MCP concept was explicitly removed from the current implementation sequence on 28 September. It remains a separate future product track and is not part of Phase 7.

## Workflow plan

| Phase | Status | Shipped evidence |
|---|---|---|
| 0 Stop losing work | Shipped | `452dd87` — save queue, reopen state, single-tab ownership, safe board/layer operations, invariant tests |
| 1 Phone | Shipped | `2e748a0`, with later phone fixes in `4367fb8` |
| 2 Everyday desktop speed | Shipped | `2e748a0` |
| 3 Versions and comments | Shipped | `a3f504e` |
| 4 Effect scope | Shipped | `d621010` — layer/group/board/document effect stacks, masks, persistence and parity |
| 5 Brief check + photography | Shipped | `5f73552` |
| 6 Export finish + coming back | Shipped | `4438995`, analytics quality work in `35aef30` |
| 7 Reuse, Library and campaigns | **Shipped** | 7A `a9e3ba6`, 7B `1fb45b9`, 7C/7D `577909f` |

## Phase 7A — reusable Looks and text styles

PR #10 shipped as `a9e3ba6`.

- Named editable Looks from layers and whole group composites.
- Reusable text styles that never replace copy or placement.
- Fresh effect IDs on apply; masks/links never leak to another target.
- Existing Studio colour-match Looks appear in the same Library.
- Desktop/phone Library workflow and Alt+Shift+L.
- Local-first persistence and portability tests.

## Phase 7B — cross-design Library and reference safety

PR #12 shipped as `1fb45b9`, reconciled on top of the newer designer-production work from PR #8.

- Logos, images, textures, colours, fonts and templates share the same Reuse Library as Looks/text styles.
- Search, filters and recent-use ordering.
- Local raster/font/template source preservation.
- Design and brand text-style scopes.
- Per-design/layer/slot dependency references and `used in N designs` counts.
- Safe delete with affected-design warning.
- Safe Replace source that never silently rewrites existing/approved designs.
- Raster replacement uses the existing Replace Image workflow or creates a new layer when appropriate.

## Phase 7C — campaign shared details

PR #13 shipped as `577909f`.

- A Studio job is the campaign container for its saved designs.
- Existing brief-linked text (`briefKey`) is the shared-token mechanism for date, time, venue, price, CTA and other parsed brief details.
- Studio exposes an explicit **Change everywhere** action rather than silently propagating edits.
- The batch updates every saved design belonging to the job.
- Only text that still contains the previous linked value changes. A designer-edited/per-format value is treated as an intentional override and left alone.
- The result reports affected designs/layers and preserved overrides.
- One-shot **Undo update** restores the saved project/index snapshots for the campaign batch.
- No new `.void` schema was introduced for campaign dependency tracking.

## Phase 7D — reuse/brand finish and workspace cleanup

Also shipped through PR #13 as `577909f`.

- The floating **Reuse** pill was removed from the bottom-right canvas/work area. The artwork area stays clear.
- Reuse now lives in the controlled editor top chrome, with compact small-screen access and Alt+Shift+L retained.
- Contextual reuse guidance appears only inside the Library, one suggestion at a time.
- **Don't suggest again** is persistent on the device.
- Brand colour roles continue to use the existing primary/secondary/accent/neutral/background/text model rather than introducing another token system.
- Text styles use the design/brand scope model established in 7B.

Validation for the final 7C/7D head (`4132d497`): strict TypeScript passed, unit tests passed, production build passed, and the Netlify deploy preview passed. The full Playwright browser suite was not executed by the normal CI workflow and is not claimed as passed.

## Designer production workflows

PR #8 shipped as `c8ab5b5` before Phase 7B.

- Embedded editable smart sources, nested source tabs, replace content and explicit rasterisation.
- Draw Inside with visible host and inherited live clipping.
- Textured/custom brush tips and saved presets.
- Selected-area repair preview, sampling modes and separate retouch patches.
- Mask link/unlink, independent placement and fixed/scale geometry policies.
- Pattern assets and embedded PSD pattern import.
- Reversible Liquify.
- User-ICC soft proof and verified CMYK TIFF export; editing remains RGB.

See `../DESIGNER-PRODUCTION-WORKFLOWS.md` for engineering boundaries and verification details.

## Effects work already shipped

- PR #6 `07518f6`: deeper controls, gradient types, blur modes, aligned sliders and numeric entry.
- PR #7 `6173b8c`: stable Effects preview, movable controls, selection-safe painting/masks and safer retouch workflows.
- PR #8 `c8ab5b5`: production-grade retouch/smart-source/brush/mask/pattern/Liquify/print additions.

## Remaining product work

### 1. Effects completion

- Live on-canvas gradient handles.
- Saved personal gradient presets shared between painted/editable gradients.
- Gradient opacity stops and midpoint interpolation for stronger PSD parity.
- Before/after split view.
- Preview performance budget for large/heavy stacks.
- Better physical/unit semantics for parameters.

### 2. Large-document engine

- WebGL/tiled compositor for documents beyond the comfortable Canvas 2D range.
- Tile-level invalidation and memory budgeting.
- OPFS-backed scratch/history if required by the tiled engine.
- Real-GPU validation for WebGPU background removal.

### 3. Import/export and print depth

- Layered PSD export is still not shipped.
- Continue smart-object/PSD round-trip fidelity where source formats permit it.
- Native CMYK editing and certified print formats remain beyond the current ICC proof/CMYK TIFF path.
- SVG export already shipped in Phase 6; older documentation saying otherwise is stale.

### 4. Studio production automation

With campaigns, dependencies and reusable assets now established, later Studio work can safely build production automation: stale-deliverable detection, approved-master propagation, batch delivery packaging and version-aware output.

## Separate future track: AI connector / design API

Keep this outside the current sequence until deliberately reactivated. If revived, it should operate structured editable VoidCanvas projects with permissions, protected elements, transaction-level undo, AI-created versions, project ownership and explicit privacy boundaries.

## Branch housekeeping

- `master` is the deployment source of truth.
- Phase 7A merged through PR #10.
- Phase 7B merged through PR #12.
- Phase 7C/7D merged through PR #13.
- PR #8 designer-production workflows are on master.
- `campaign/make-something` is an old experimental branch and must not be merged wholesale.
- Old feature branches are historical unless a current issue/PR explicitly revives them.

## Next execution order

1. Effects completion: gradient handles/presets, before/after and remaining control polish.
2. Large-document/tiled rendering engine.
3. Layered PSD/export and deeper print/colour workflows.
4. Studio production automation.
5. AI/design API only when deliberately reactivated as a separate track.

Phase 7 is complete. New work should no longer be filed as Phase 7 unless it is a regression in the shipped reuse/campaign system.
