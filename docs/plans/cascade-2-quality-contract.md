# Cascade 2.0: Quality Contract and Release Plan

Status: **Stage 1 implementation on feature branch; not certified for production**  
Owner: VoidCanvas Editor / Formats  
Principle: **A design that cannot be adapted safely must never be reported as ready.**

## What we are promising

Cascade is an editable, linked **campaign adaptation system**, not image resizing. A master board should generate new boards at different aspect ratios while retaining design intent, brand hierarchy, essential content, editable layers and deliberate local adjustments.

A universal guarantee of automatically perfect aesthetics is not technically defensible. Our enforceable guarantee is **no silent, known loss of required content or known-invalid export marked ready**.

## Stage 1: Fail-closed content integrity (this branch)

- Cascade invokes layout in **preserve-all** mode instead of silently dropping lower-ranked source panels.
- Large source groups stay protected in this mode. Complex designs may therefore fit poorly until more sophisticated role/constraint inference is implemented.
- Designer-initiated omissions are identified by panel IDs, not display names.
- Source layer IDs deliberately excluded from a variant are persisted in `Frame.cascadeExcludedSrcIds` and are respected by content-sync.
- Tiny generated type is flagged for review using a conservative heuristic. **This is not an exact rendered-glyph validator.**
- Previews reveal warnings and render errors, and cannot be mistaken for export certification.
- Cascade generation refuses to apply partial results when panels are unexpectedly omitted. If it refuses, the dialog stays open.
- Re-sync of linked variants uses shared-content synchronisation, rather than silently regenerating all variant layouts.
- Regression tests cover preserve-all layouts, explicit panel exclusions, image-only designs and excluded source-layer persistence.

## Stage 2: Semantic source analysis

Introduce a structured source-to-variant graph with stable `srcId`, deep group and mask relationships, text/role metadata, and precedence between manual and inferred classifications. Every source element receives:
- A semantic role: brand, headline, body, legal/disclaimer, pricing, CTA, image, decoration, background.
- An importance policy: **required / preferred / optional**.
- Spatial constraints: align, anchor, containment, safe zone, reserved negative space.
- Scaling and cropping policies, including protected image focal areas.
- An explicit relationship type for items that must move together.

Never infer permission to omit a required element solely from apparent low visual salience.

## Stage 3: Adaptive composition and solver

For each aspect ratio, generate multiple candidate trees. Hard requirements: required content, group/mask integrity, no unintended clipping, known safe-zone constraints, exact target dimensions. Soft scoring: hierarchy, balance, whitespace, source resemblance and image focal quality. Return diagnostics when no candidate satisfies hard requirements rather than claiming success.

Support faithful, adaptive and compact strategies, with one recommended result by default.

## Stage 4: Non-destructive linked updates

Merge `src/editor/cascade.ts`, `src/editor/adapt.ts`, Studio formats and Resize onto one canonical solver and variant update path. Persist:
- Stable source references, including nested grouped elements.
- Per-variant exclusions and manual geometry/crop overrides.
- Whether updates should affect content, styles, geometry or all three.
- A user-visible, undoable **Re-layout from master** action distinct from **Update content**.

The Stage 1 update route must still be audited for newly inserted grouped layers, changes to nested masks/effects and multi-style text. These are **not** certified by Stage 1.

## Stage 5: Production preflight, not preview heuristics

After fonts and assets load, validate actual **final-resolution exports** with the same renderer that produces delivery files. Preflight must cover:
- Required source content and exact copy;
- True glyph bounds, overflow, minimum accessible/readable type;
- No unapproved clipping or collision;
- Grouped logo proportions, margins, safe areas and minimum sizes;
- Image focal preservation and raster source resolution;
- Correct target dimensions, colour profile, transparency and PDF geometry;
- Source/variant persistence, multi-board isolation and re-export equivalence.

Quality status per format:
1. **Ready**: all mandatory checks completed and passed.
2. **Review required**: an aesthetic/ambiguous issue remains, or an accepted exception requires a human.
3. **Blocked**: missing required content, failed render, corrupt output or violated mandatory constraint.

**Do not introduce a Ready label or a bulk Ready export path until this preflight genuinely exists.**

## Stage 6: Certification dataset and CI gates

Start with 100 real, legally usable master designs across 12 standard formats: **at least 1,200 adaptations**, then expand with every regression found in production. Include:
- Festival poster, brand campaign, finance promotion, retail offer, editorial typography, portrait-led design, pure photography, layered PSD, large print banner and complex nested vector/mask design.
- Very long/short copy, missing fonts, non-Latin glyphs, QR codes, tiny legal text, transparent assets, print bleed, rotated typography and deliberate artistic overlap.
- Save/reopen, undo/redo, duplicate, resync, relayout, custom sizes and final export.
- Desktop browsers and representative mobile/tablet devices.

Hard gates: **0 silent omissions**, **0 known-invalid exports marked Ready**, **100% required-content accounting**, **100% deterministic layout decisions for identical inputs/settings**. A separate designer-blind acceptance study measures visual quality and genuine production effort saved; initial target 95% first-pass acceptance for a precisely scoped set of supported use cases, not a claim about every possible design.

## Engineering locations

- `src/editor/layout.ts`: candidates, group preservation, constraint evaluation.
- `src/editor/cascade.ts`: creation policy, exclusion persistence, variant updates.
- `src/editor/adapt.ts`: role inference and linked content synchronization.
- `src/editor/types.ts` / `voidfile.ts`: serializable semantic and override metadata.
- `src/editor/components/BoardsPanel.tsx`: progressive disclosure, warnings and per-format review.
- `src/editor/resize.ts` / `src/editor/ops.ts`: canonical shared adaptation pipeline.
- `e2e/boards-cascade-export.mjs`: real-browser generation, comparison and export assertions.
- `src/editor/__tests__/cascade-fit.test.ts`: initial preserve-all regression tests.

## Release policy

Do not merge this branch straight to production on the strength of source inspection. Run `npm test`, a complete `next build`, Cascade-focused Playwright and manual export review. Expand acceptance gates before launching the 100%-integrity marketing claim.

For marketing, use the defensible position **“Design once. Adapt intelligently. Deliver everywhere.”** Tie stronger numerical statements to measured success rates, not aspirational targets.
