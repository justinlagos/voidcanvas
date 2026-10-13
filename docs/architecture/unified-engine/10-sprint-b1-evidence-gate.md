# Sprint B.1 — Integration and Evidence Gate (record)
Branch: `feat/unified-sprint-b`. Flag: `?unified=1`, off by default.

## Thin integration bridge (new, minimal diff)
- `useUnifiedBinding.ts` + `binding-describe.ts`: hook over the ONE `useEditor` store (selectors only); edits call `updateLayer` + `commit` — the same functions as the existing Opacity control (`PropertiesPanel.tsx:215`).
- `UnifiedContextSection.tsx`: View (prop-driven, SSR-testable) + Section (store wiring). Mounted as one line in `PropertiesPanel` layer branch; renders nothing when the flag is absent.
- Existing editor paths otherwise unchanged (one import + one mount line in `PropertiesPanel.tsx`).

## Verified (this sandbox)
- `tsc --noEmit`: clean.
- Full unit suite: 66 files / 351 tests green (30 unified, incl. new binding-describe, panel-integration, variant-structure, void-roundtrip).
- Panel integration: real store seeded → View renders shape/text context + capability chips; `commitOpacityEdit` → value 0.4 → `undo` → 1 → `redo` → 0.4, all on the live store. Switching selection preserves doc/history.
- VariantGraph structural replay: adopt-added, keep-variant-only, deleted-edited conflict, rename/reorder conflicts.
- Real `.void` round-trip (binary PNG + mask + text) via `writeVoid`/`readVoid`, zero notes.
- Dev server serves `/editor` HTTP 200 (before shutdown for memory).
- `e2e/unified-slice.mjs`: ready-to-run Playwright script (flag-on selection/inspector/edit/undo/screenshots + flag-off inertness). NOT executed here (see blocked).

## Blocked (environment, with proof — not code failures)
- Production `next build`: cgroup-OOM-killed twice (dmesg: MainThread anon-rss ~1.3GB killed; sandbox has 2 CPUs and a low container cap). Partial `.next` removed. Rerun on CI/a bigger machine; log tail preserved in report.
- Real-browser Playwright: chromium binaries downloaded but OS libs (libnss3/libatk/libasound/…) absent and `sudo`/`apt` unavailable (no-new-privileges container). Tried `apt-get download` fallback — no package lists without root.
- Screenshots/pixel goldens: pending first green browser run. Proposed tolerances (to ratify): antialias ±2/255 per channel on text/vector edges, exact match on flat fills, export-dimension exact, mask-edge feather zone excluded.
- SSR caveat: zustand `useSyncExternalStore` returns creation snapshot under `renderToString`; hook subscription therefore proven by types + browser script, not the node test (documented in test header).

## Handoff
Push unavailable (no credentials). Transfer: `unified-sprint-b1.bundle` (git bundle, all branches) + this record. Do NOT merge to `master` before CI build + browser gate pass.
