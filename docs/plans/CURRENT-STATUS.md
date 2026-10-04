# VoidCanvas current build status

Updated: 4 October 2026

This file is the authoritative status summary for active product work. Older plan files remain useful as historical specifications, but their build-status tables may be stale.

## Recovered development-session note

A Claude development session from late September / early October was recovered on 4 October. It confirms the shipped sequence below and that the session stopped immediately after the post-Phase-6 mobile/text repair batch, just as Phase 7 reuse work was beginning.

The AI connector / MCP concept is strategically interesting, but it was explicitly removed from this implementation plan by Justin on 28 September. It is **not** part of the current Phase 7 build. Treat it as a separate future product track rather than mixing it into editor/reuse execution.

## Workflow, reliability and effect scope plan

| Phase | Status | Shipped evidence |
|---|---|---|
| 0 Stop losing work | Shipped | `452dd87` — save queue, reopen state, single-tab ownership, safe board/layer operations, lock guards, merge/cut fixes, invariant tests |
| 1 Phone | Shipped | `2e748a0`, with later phone fixes in `4367fb8` |
| 2 Everyday desktop speed | Shipped | `2e748a0` |
| 3 Versions and comments | Shipped | `a3f504e` |
| 4 Effect scope | Shipped | `d621010` — stacks on layers/groups/boards/document, linked effects, masks, `.void` v4 effect persistence, canvas/export parity suite |
| 5 Brief check + photography page | Shipped | `5f73552` |
| 6 Export finish + coming back | Shipped | `4438995`, with analytics quality work in `35aef30` |
| 7 Reuse: looks, library, campaigns | In progress | Phase 7A shipped in `a9e3ba6`; wider library, usage relationships and campaigns remain |

The four items that were originally listed as “next” in the 26 September audit are no longer pending: guideline photography shipped in Phase 5, brief checking shipped in Phase 5, named/staged review versions shipped in Phase 3, and client comments linked to layers shipped in Phase 3.

## Phase 7A shipped: reusable Looks and text styles

PR #10 shipped on `master` as `a9e3ba6`.

It adds:

- A local-first reusable-item model using the existing IndexedDB abstraction.
- Named Looks from layers, including opacity/blend/fill, layer styles, compatible text/shape appearance and ordered live effects.
- Named Looks from selected groups, preserving the group composite treatment rather than copying effects onto each child.
- Reusable text styles that preserve typography without replacing copy, position, opacity or effects.
- Fresh effect IDs on every Look application; effect links and painted masks never leak into another target.
- One undoable Look application to one/many layers or a whole group.
- One Reuse library surface for new Looks/text styles and the older Studio colour-match Looks.
- Desktop and phone reachability; narrow screens use a bottom sheet and desktop also supports Alt+Shift+L.
- Unit coverage for effect portability, fresh identity, text-content safety, shape styling and group-composite Looks.
- A browser regression for save/apply/undo/content preservation and phone reachability, included in the full e2e runner.
- `docs/reuse-library.md`.

Validation before merge: TypeScript passed, unit tests passed, production build passed and the Netlify deploy preview passed.

## Effects and painting follow-up

- PR #6 shipped on `master` as `07518f6`: deeper effect controls, gradient types, blur modes, aligned sliders and numeric entry.
- PR #7 shipped on `master` as `6173b8c`: stable Effects preview, movable controls, predictable painting inside selections, editable masks on live text/shapes, alpha-lock parity, safer clone/heal/removal workflows.

## Remaining planned product work

### 1. Phase 7B: wider library + relationships + campaigns

Next to build:

- Organise reusable text styles per design and allow promotion to a client brand.
- Extend the cross-design library to logos, images, textures, colours, fonts and templates.
- Add `used in` counts and dependency awareness before replace/delete.
- Add search/filter and recent-use ordering across reusable assets.
- Treat a Studio job as the campaign container with shared brief details/tokens across related designs.
- Campaign-wide updates such as changing one event date everywhere while preserving intentional per-format overrides.
- One-at-a-time contextual reuse suggestions that can be dismissed permanently.
- Brand-system colour roles and type-in-use documentation from the 26 Sept audit.

### 2. Professional nondestructive editing workflows

Implemented in PR #8; pending merge to `master`:

- Embedded editable smart sources, nested source tabs, replace content and explicit rasterisation.
- Draw Inside with a visible host and inherited live clipping.
- Textured/custom brush tips and saved presets with spacing, angle and roundness.
- Selected-area repair preview, three sampling modes and separate retouch patches.
- Mask link/unlink, independent placement and fixed/scale geometry policies.
- Pattern assets and embedded PSD pattern import.
- Reversible Liquify with retained source and Apply/Cancel.
- User-ICC soft proof and verified CMYK TIFF export; editing remains RGB.

See `../DESIGNER-PRODUCTION-WORKFLOWS.md` for entry points, validation and practical limits. Reviews at three experience levels are simulated, not human usability studies.

### 3. Effects follow-ups

PR #6 intentionally left these for later:

- Live on-canvas gradient handles.
- Saved personal gradient presets shared between painted and editable gradients.
- Gradient opacity stops and midpoint interpolation for better PSD parity.
- Before/after split view for effects.
- Large-document preview performance budget.
- Better physical/unit semantics for controls such as exposure, gamma and pixel-based parameters.

### 4. Engine and colour pipeline

Still a separate engineering track:

- WebGL/tiled compositor for very large documents beyond the comfortable Canvas 2D range.
- OPFS-backed scratch/history strategy if needed by the tiled engine.
- Native CMYK editing and certified print formats beyond the ICC proof/CMYK TIFF export in PR #8.
- Real-GPU browser validation for the WebGPU any-subject background-removal path.

### 5. Import/export gaps

- PR #8 retains embedded originals and opens supported sources for editing. Unsupported source formats retain a cached editable source and are reported; complex placed PSD updates preserve bounds rather than original warp parameters.
- Layered PSD export is still not shipped.
- SVG export has shipped in Phase 6, so older README text saying there is no SVG export is stale and should not be used as current status.

## Separate future track: AI connector / design API

Keep this outside the current implementation sequence until deliberately reactivated. The strategic concept is still valid: an MCP/design API through which Claude, ChatGPT or another compatible agent can inspect and operate structured, editable VoidCanvas projects. If revived, it should be designed around permissions, protected elements, transaction-level undo, AI-created versions, ownership of the resulting `.void` project, and explicit privacy boundaries. Do not bolt it onto Phase 7.

## Branch housekeeping

- `master` is the deployment source of truth.
- `phase7-reuse-foundation` was merged through PR #10 on 4 October 2026.
- The original `effects-ux-workspace` changes were merged through PR #7. This branch now carries PR #8 designer workflows.
- `effects-controls-depth` was merged through PR #6; its divergence follows the squash history.
- `campaign/make-something` is an older experimental branch from 25 September and is far behind current `master`; do not merge it wholesale. Any useful campaign mechanics should be re-evaluated against the current codebase and selectively reimplemented.
- Old feature branches should be considered historical unless a current issue or PR explicitly revives them.

## Next execution order

1. Phase 7B: wider reusable library, `used in` relationships and campaign shared tokens.
2. Review and merge PR #8 for embedded smart sources, brush presets, Draw Inside and the other designer workflows.
3. Gradient handles/presets and remaining Effects UX follow-ups.
4. Large-document engine and colour-management work as separate infrastructure projects.

Every new capability should ship with migration/persistence tests, undo/redo coverage where relevant, save/reload coverage, canvas/export parity where it affects rendering, phone reachability and Learn documentation.