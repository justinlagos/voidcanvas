# A05 — Golden-Job Fixtures + Measurable Baselines (capture only, no claims)
Reference jobs extend Phase-9 torture + boards-cascade plan. Store fixtures under `e2e/fixtures/` (new `unified-*.void`); screenshots under `e2e/goldens/unified/`. Budgets are gates for Sprint B05 diff tool, not CI failures until measured on reference hardware.

## Jobs
1. `logo-vector` — complex editable logo (pen/node, booleans, multi-fill/stroke, symbols). Asserts: SVG round-trip tolerance, reopen equivalence, export determinism (fixed fonts/profile).
2. `photo-poster` — 1080×1350 poster, masked photo + vector + type. Asserts: preview vs export pixel diff ≤ tolerance, FX_WORK scaling holds per-board.
3. `brochure-16page` — threaded text, linked frames, overset/DPI/profile warnings. Today: simulate with boards (pages Missing) + document gaps. Asserts: save/reopen, print PDF structure.
4. `campaign-cascade-10` — master → 10 formats via `cascadeToFrames`. Asserts: placement no-overlap, group integrity, `dropped` reasons, one-undo removal. Expected: override-preservation fixtures RED until Stage 5 (see 02).
5. `rocket-mocked` — blank → mocked generate → region edit → cascade → ZIP (see 07). Asserts: lineage + stale-revision guard, offline reopen.

## Baselines to capture (Sprint B05 `preview/export diff` tool)
- Interaction ≤100ms ordinary actions; 60fps direct manipulation on reference hardware (measure, don't assert in CI).
- Render parity: fixed browser/fonts/profile/assets, explicit tolerances; no flash/blank/stale.
- Memory: tile residency tiers, OPFS scratch disposable (Phase 9 policy re-verified).
- Procedure: `npm run build` + `e2e/run.mjs` subset on `npx next start -p 3123`; record wall-clock + screenshots; file under `e2e/goldens/unified/BASELINE.md`. Never claim full Playwright matrix (normal CI skips it).
