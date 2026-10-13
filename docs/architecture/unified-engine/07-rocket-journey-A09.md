# A09 — Rocket Poster Journey + Compact UX Prototype (mocked provider, Sprint A/B)
Flagship acceptance (20 steps in directive §12) runs end-to-end on MOCKED provider in Sprint B; real provider only after 06 gates + consent/cost controls land (Stage 3/4).

## Journey
1 Blank 1080×1350 → 2 draw image frame → 3 Generate/Search/Upload (empty-state + Insert/Add + selection context ONLY) → 4 brief ("rocket launch") + source/provider + cost disclosed → 5 candidates gallery (Place/Replace/Keep-as-alternate) → 6 place into frame (reversible, source-linked) → 7 select exhaust region → 8 "thick fire + smoke" edit (exact crop + recipient shown, consent) → 9 before/after compare → 10 accept (one atomic history op; original preserved; outside-mask pixels bit-identical modulo feather) → 11 mask/crop/colour + vector/title/logo → 12 Cascade Story/square/landscape (subject-safe, per-variant override allowed; never silent invention) → 13 manual tweak one variant → 14 master update preserves override or flags conflict (per 02) → 15 preflight (resolution/alpha/missing/licence/Cascade crop) → 16 batch ZIP export (correct naming) → 17 save portable `.void` → 18 reopen: original + variants + recipe + masks intact → 19 offline variant: uploads/local/tools only, no request until retry → 20 stale-result guard: task from old revision waits in tray, never overwrites.

## UX (compact, non-blocking)
- Entry: exactly 3 places (empty frame, Insert/Add incl. Project/Brand/Saved, selection context). Dismissible, never overlays art.
- Composer: prompt, refs, region, aspect/style/brand (opt-in), count, source choice; advanced collapsed. No surprise network/charge.
- Tray: progress/cancel/retry, thumbnail gallery, stale-revision quarantine. Editing continues during tasks.
- Placement: fill frame / new object / clip to path / replace-preserving-transform / above-behind / reference / project asset. Default reversible + obvious.
- A11y: labelled composer/results/progress/consent/compare, full keyboard.

## Prototype scope (Sprint B, no network)
Local-only tray + placement into raster node with original/derived lineage (B07); mocked generate/search + consent machine + failure/stale tests (B08). Metrics: actions/timings/results only — never prompt content.
