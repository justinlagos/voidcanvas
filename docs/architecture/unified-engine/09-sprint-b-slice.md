# Sprint B — Controlled Vertical Slice (feature-flagged, mocked, no migration)
Branch: `feat/unified-sprint-b` (from `8d423b5`). Flag: `?unified=1` (`src/editor/unified/flags.ts`, off by default). Sprint A contracts live on `docs/unified-engine-sprint-a` (`c7f8fb73e49f5c84563846f6f3040c8c77abaa95`, files `00-README.md` … `08-compat-rollback-strategy.md`).

## Boundaries (enforced)
One `useEditor` state, one selection model, one undo. New modules are pure selectors/adapters (`capabilities`, `selection-bridge`, `graph-adapter`) or isolated prototypes (`variant-prototype`, `asset-tray`, `generation-tasks`); no zustand `create`, no parallel history. No existing shortcuts/panels/effects/masks/import/export/brand/Cascade/recovery changed. No `.void` upgrade (adapter reads v1–v5, writes same version). Mock provider id `mock-test-provider`, zero cost, no network.

## Implemented / tested (21 new unit tests, full suite 342 green, tsc clean)
- B01 `capabilities.ts` + `UnifiedInspector.tsx` (delegates to existing panels; at most 5 primary, full list searchable; presets never gate eligibility).
- B02 `selection-bridge.ts` (stable identity/key, locked-safe transform patches via caller's single commit).
- B03 `graph-adapter.ts` (NodeRef map, dangling/duplicate validation, cycle check, round-trip ids).
- B04 `mixed-media.ts` (vector badge + masked raster ref + headline type, stable ids, consecutive edit order) — unit covers shape/text; browser mask-painting + export is e2e-gated.
- B05 `diff-harness.ts` (preview/export setting match, perf budget recorder — budgets recorded, not CI-gated).
- B06 `variant-prototype.ts` (legacy loss pinned as regression, three-way merge preserves overrides + conflicts, required-content guard).
- B07 `asset-tray.ts` (ingest/derive/accept, original-never-overwritten lineage, transform-preserving placement).
- B08 `generation-tasks.ts` (disclosure to consent to queue to run to ready to commit; cancel/fail; stale-revision quarantine; out-of-order guards).

## Partial / blocked
- Browser e2e with real canvas/mask painting + export goldens: NOT run (needs Playwright + prod server; same honesty rule as CURRENT-STATUS).
- `npm run build`: OOM-killed (137) in this sandbox; not a type/test failure — rerun on CI/dev machine before any merge.
- Production Cascade still uses delete/recreate `resyncVariants`; prototype merge lands Stage 5/6 after fixtures pass in CI.
- Real providers: intentionally unwired (Stage 3-gated).

## Rollback
Flag off = zero behaviour change (all imports inert unless `?unified=1`). Revert slice by reverting its commits; `.void` files untouched.
