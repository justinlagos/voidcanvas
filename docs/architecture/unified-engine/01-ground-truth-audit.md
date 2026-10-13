# A01–A03 Ground-Truth Audit — live master vs Unified Engine 2.0
Commit: `8d423b5` (matches `origin/master` HEAD at audit, 13 Oct 2026). Classification key: Implemented (code present) / Verified (code + passing test/e2e cited) / Partial (subset or adapter needed) / Unverified (claimed in docs, no test found) / Missing (no code) / Blocked (needs decision/procurement).

## Document / scene model (Sec 3 domain RFC)
| Capability | Class | Evidence | Limitation |
|---|---|---|---|
| Layer doc (raster/text/shape/adjustment + Group + Frame boards) | Verified | `src/editor/types.ts:130-310`, `src/editor/store.ts` (1634 lines), `src/editor/__tests__/voidfile.test.ts`, `src/editor/__tests__/invariants.test.ts` | Not Sec-3 SceneNode graph; no stable cross-serialize identity guarantees beyond layer/group/frame ids |
| `.void` v5 round-trip (ZIP, content-hash blobs, smart/liquify/pattern/proof) | Verified | `src/editor/voidfile.ts` (267 lines), `docs/void-format.md`, `e2e/disk-and-format.mjs` | v6 (AssetRecord/Recipe/Variant/Page) not designed; writers must not upgrade default path (Sprint B03 rule) |
| Masks / vector masks / clipping / blend+isolate | Verified | `types.ts: vmask, clipId, maskMatrix/maskResize`, `e2e/designer-production.mjs`, `designer-workflows.test.ts` | No unified AppearanceGraph with stable IDs + explicit eval order |
| Effect stacks on layer/group/board/doc + layer styles order + reach | Verified | `types.ts: Effect{id,on,opacity,blend,link,mask}`, `src/editor/__tests__/effects.test.ts`, `e2e/effects-scope.mjs`, `e2e/bake-fullres.mjs` | Effect ordering ADR still open (Sec 14.1) |
| Text (point + paragraph box, justify, on-path, briefKey) | Partial | `types.ts: TextLayer`, `src/editor/components/*`, `e2e/editing.mjs` | Missing TextStory (threaded frames, overset, bidi/shaping engine); shaping lib ADR open |
| Symbols / shared defs + overrides | Missing | Only `Group` + Library reuse (`src/editor/reuse.ts`, `reuse-replace.ts`, `__tests__/reuse.test.ts`) | Needs Symbol def/instance + StyleGraph (Sec 3) |
| Pages / spreads / parent pages | Missing | Only `Frame` boards (`linkedFrom`, `deliverableId`); `src/editor/frames.ts` (90 lines) | Page numbering vs artboard variants conflated risk — ADR required (Sec 14.4) |
| Resources (hash blobs, fonts, ICC proof) | Partial | `voidfile.ts`, `src/editor/io.ts` (972 lines), `document-colour.test.ts`, `print-profiles.test.ts` | No ResourceGraph (licence/missing/fallback/relink provenance) |
| History / undo / versions / crash recovery | Verified | `store.ts applyBoards` one-step Cascade, `src/editor/versions.ts`, `__tests__/versions.test.ts`, `e2e/export-return.mjs` | No transactional journal + checkpoint semantics yet |

## Interaction (Sec 2)
| Capability | Class | Evidence |
|---|---|---|
| Single `/editor`, command registry drives menus/palette/shortcuts/sheet | Verified | `src/editor/actions.ts` (212 cmds), `CommandPalette.tsx`, `MenuBar.tsx`, `e2e/editor-muscle-memory.mjs` |
| Tool rail families, options bar, dock workspaces (Essentials/Photo/Design/Minimal) | Verified | `ToolRail.tsx`, `OptionsBar.tsx`, `Dock.tsx`, `e2e/guided-workspace.mjs` |
| Focus presets change layout only | Partial | Workspaces exist but not mapped to Vector/Photo/Typography/Publication/Production contract; Sec-2 rule (never switch pipeline/eligibility/route) untested |
| Edit-target / scope badges | Missing | No object/mask/pixel/story/instance + layer/selection/group/board/page/document indicator |
| Top-5 contextual actions (FloatingBar) | Partial | `FloatingBar.tsx` exists; "5 most likely, power stays searchable" rule unverified |

## Cascade (flagship — safety brought forward, see 02-*)
| Capability | Class | Evidence |
|---|---|---|
| Block/panel relayout + preview thumbs + skip chips + tidy placement + one undo | Verified | `src/editor/cascade.ts` (80 lines), `layout.ts` (401), `adapt.ts` (253), `e2e/boards-cascade-export.mjs`, `__tests__/boards.test.ts` |
| Master-linked boards (`linkedFrom`, `srcId`, `role`) | Partial | `types.ts:67-69,302`; `adapt.ts` role inference layer-level |
| Override-preserving resync + conflicts | Missing (risk) | `resyncVariants` deletes/recreates children, drops local overrides, no identity transfer — violates Sec 1.6/3. Contracts defined now (02), fixtures Sprint B, implementation Stage 5/6 |
| 300×10 benchmark | Missing | Torture fixtures exist (Phase 9) but not Cascade correctness benchmark |

## Production (Sec 10–11)
WebGL2 tiled compositor + CPU fallback (`webgl-compositor.test.ts`, `gpu-tile-pipeline.ts`, `hybrid-tiled-renderer.ts`), FX_WORK preview→export scaling (`e2e/bake-fullres.mjs`), PDF/X-4 + preflight (`pdfx4.ts`, `pdfx-preflight.ts`, `production-engine.test.ts`), PSD import/export (`ag-psd`, `production-depth.test.ts`), ICC proof/CMYK TIFF (`document-colour`, `print-profiles`) — all Verified as shipped; external press-PDF validation still Unverified (needs independent prepress check per spec §10).

## Asset Intelligence (Sec 6 — greenfield)
Upload + Library/Brand assets: Implemented. On-device AI (MODNet/BiRefNet/LaMa, download-consent, "nothing uploaded"): Verified (`src/editor/ai-tools.ts:226`, `ai.ts`). Cloud generation / region edit / variations / outpaint / search-with-licence / task queue / composer / tray / lineage: **Missing**. No provider integrated — GEN-05/08 must not be marked built (see 06 ADR).

## What remains uncertain
- `loadFramed` history-wipe from old plan: not found in current `cascade.ts` (uses `applyBoards`) — treat as fixed pending e2e confirmation, keep regression test in Sprint B.
- Full Playwright matrix + desktop parity: normal CI does not run full suite (per CURRENT-STATUS) — do not claim.
- Exact perf numbers (≤100ms / 60fps): fixtures exist, wall-clock stays manual — baselines in 04 are capture instructions, not claims.
