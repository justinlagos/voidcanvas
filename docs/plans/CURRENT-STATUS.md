# VoidCanvas current build status

Updated: 6 October 2026

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
| 9 Production Engine | **Shipped** | PR #17 `c1d32b5`, PR #18 `2b4dc96`, PR #19 `e3b51dd`, PR #20 `665685e`, completion PR #21 |

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
- Printer ICC soft proof and profile-based CMYK TIFF export.

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
- Large layered-PSD rendering uses bounded tiles for expensive per-layer rendering.

### PSD / export parity

- Layered PSD export is shipped through the existing `ag-psd` dependency.
- Artwork remains in separate PSD layers with group nesting retained.
- Unsupported live constructs rasterise per layer, not as one flattened document.
- Production invariants run before layered export.

### Colour and print

- Production Export combines layered PSD and printer-profile workflows.
- ICC soft proof, rendering intent, black-point compensation and embedded-profile CMYK TIFF are shipped.
- Phase 9 extends this with explicit working-colour metadata and PDF/X-4 production output.

### Studio production automation

- Studio derives missing formats, open feedback, post-approval edits and stale deliveries and routes the designer to the appropriate production surface.

### Professional hardening

- Production/export invariants catch invalid dimensions/transforms, duplicate IDs, empty raster sources and orphan group references before expensive handoff work.

Final PR #15 validation on `0c59dfc6`: strict TypeScript passed, unit tests passed, production build passed and Netlify deploy preview passed. The full Playwright browser suite was not run by normal CI and is not claimed as passed.

## Phase 9 shipped — Production Engine

Phase 9 completed the requested non-AI production infrastructure sequence:

**9A WebGL render graph + tiled compositor → 9B OPFS scratch/memory → 9C native working colour + printer profiles → 9D PDF/X-4 + preflight → 9E production torture suite and hardening.**

### 9A — WebGL2 tiled compositor

- Renderer-independent dependency graph covers layers, nested groups, adjustments, boards and document composites.
- Visible-region tiles use stable identities across accelerated/resident/scratch tiers.
- WebGL2 compositor implements explicit pixel math for Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge/Burn, Hard/Soft Light, Difference and Exclusion.
- Hybrid tiled rendering uses GPU only where parity is explicit; unsupported blend modes, old devices, allocation failures and context loss fall back per tile to CPU Canvas.
- GPU resources remain disposable acceleration data; editable document state is never owned by WebGL.

### 9B — pressure-driven OPFS scratch

- GPU/RAM residency is bounded by tile count and bytes.
- Normal/elevated/critical pressure decisions can rebudget residency and force LRU eviction into OPFS through the shared tile key.
- Scratch supports restore, invalidation, quota inspection, persistence requests and per-project cleanup.
- Critical origin-storage pressure may purge scratch.
- OPFS is explicitly disposable. It is not and must not become the canonical project save; clearing site data may remove scratch without invalidating the design model.

### 9C — native working colour and printer profiles

- Documents have an explicit working colour model/profile; old documents default safely to sRGB.
- Native RGB/CMYK/Gray/Lab values, CMYK TAC diagnostics and pure-K intent helpers are part of the colour model.
- LittleCMS/WASM provides bidirectional sRGB ↔ CMYK transforms for embedded CMYK working profiles.
- Working profile and output/proof printer profile are separate concepts.
- Production Export can deliberately promote a validated loaded CMYK ICC profile to the document working space.
- UK/Europe and Nigeria profile choices are starting guidance only. VoidCanvas never silently substitutes a regional guess for the printer's profile.

Browser display canvases remain RGB display surfaces. Native CMYK identity/channel intent belongs to the document colour engine rather than pretending the browser framebuffer itself is CMYK.

### 9D — PDF/X-4 and production preflight

- PDF/X export blocks when the output-intent profile is missing or a selected target/raster source is invalid.
- VoidCanvas policy warns for no bleed and low document DPI; those are production policies, not invented PDF/X requirements.
- Full-resolution artwork is converted through the selected ICC to CMYK.
- The PDF/X writer emits PDF 1.6, an embedded CMYK ICCBased image colour space, `/GTS_PDFX` OutputIntent, XMP PDF/X-4 identification, TrimBox/BleedBox and trapped metadata.
- The dedicated production writer does not emit DeviceRGB artwork.
- PDF/X-4 is a flattened colour-managed print handoff. `.void` and layered PSD remain the editable/source handoff paths.

### 9E — torture/performance hardening

Deterministic CI fixtures cover:

- 8K photo poster — 61 layers / 14 effects
- 120-board campaign — 438 layers
- 30,000 × 20,000 exhibition artwork
- deep PSD workload — 320 layers / 48 effects
- CMYK brochure workload

CI gates bounded residency/overview policy, memory/storage pressure decisions, tile planning/readback orientation, PDF/X blocking preflight and PDF/X structural colour/output-intent requirements. Wall-clock timing/FPS/GPU memory remain real-browser measurements rather than flaky hosted-runner thresholds.

See `PHASE-9-COMPLETION.md` for the shipped contract and fidelity boundaries.

## Brand workspace

PR #14 (`8872a90`) promoted Brand into a dedicated workspace and added living published brand-guideline portals. PR #16 later simplified the guided Brand/mobile Effects UI before Phase 9.

## Brand Guidelines V2: in progress, not live

Plan and gates: `BRAND-GUIDELINES-V2.md`.

- Phase 0 baseline and Phase 1 layout IR are on master. Phase 1 parity (Cover, Colour, Clear space against the legacy renderer) is a CI gate: `e2e/brand-ir-parity.mjs` measures, `e2e/brand-ir-parity-gate.mjs` fails the build on drift.
- Phase 2 engine (families, cover and interior compositions, document composer, 1,200-document corpus, cover pHash proof) is on master but **off for designers**. It went live in the preview and exports on 5 Oct (`2fd8880`, `047624b`) and was rolled back the same evening (`3a8d8a9`): interior pages had generic copy and lost content (Logo listed refused versions, Do not lost its examples, Applications was a placeholder, Contrast swatches did not match their labels).
- V2 can be switched on in one browser with `?brandv2=1` (`?brandv2=0` turns it off). The switch is `src/brand/compose/flag.ts`. Preview, screen and print PDF, HTML handoff, saved pages, Open in Editor and published brand pages all follow the same switch, so one brand never shows different pages in different outputs.
- Phase 2 is done only when every current page keeps its real content in V2, the Phase 2 gates pass, and contact sheets are reviewed with no professional send-back findings. Then the default flips.

## Growth OS

Docs: `docs/GROWTH-OS.md`, `docs/GROWTH-DECISIONS.md`, `docs/GROWTH-DISCOVERY.md`, `docs/OPEN-IN-VOIDCANVAS.md`.

- Phases 1 to 6 shipped on 5 Oct: opportunity scoring and the /admin/growth control room, activation attribution, the registry-driven quick-tool factory and /tools hub, experiments with publication gates, `/open` (Open in Voidcanvas) and the Made with Voidcanvas link on shared pages, and the decision queue.
- Phase 7, the search-evidence backlog from the Learn SEO research, landed after reconciliation. `public/growth-discovery.json` is generated at build time and not committed.
- Live database: `vc_admin_growth` and `vc_admin_experiments` were applied to the `voidcanvas` Supabase project on 5 Oct 2026 (they had been committed but not applied, so the control room could not load data).
- New usage events `experiment.view` and `growth.touch`, and the landing and Learn click events, are listed in `supabase/analytics.md` and the privacy article.

## Separate future track: AI connector / design API

Do not include this in the active production sequence. If deliberately revived later, it should operate structured editable VoidCanvas projects with permissions, protected elements, transaction-level undo, explicit versions, ownership and privacy boundaries.

## Branch housekeeping

- `master` is the deployment source of truth.
- Phase 7A merged through PR #10; 7B through PR #12; 7C/7D through PR #13.
- Brand workspace/portals merged through PR #14.
- Professional production depth merged through PR #15.
- Guided workspace/mobile Effects refinement merged through PR #16.
- Phase 9 foundation merged through PR #17 and Stage controller through PR #18.
- WebGL2 composition core merged through PR #19; printer-profile colour foundation through PR #20.
- Phase 9 completion is PR #21.
- PR #8 designer-production workflows are on master.
- `campaign/make-something` is historical and must not be merged wholesale.
- 5 to 6 Oct 2026 clean-up: PR #48 (Growth discovery) and the Brand IR parity gate from `brand-guidelines-v2-phase1-route` were landed on master; PR #25 was closed as superseded by the reconciled Phase 1 commits. Every other remote branch is already on master, as a merge or as a reconciled squash, and is safe to delete; deleting them needs Justin's go-ahead, so they are still there. After clean-up only `master` and `campaign/make-something` should remain. Branch tips, restorable with `git push origin <sha>:refs/heads/<name>` while GitHub still holds the commit: `analytics-feedback` 4b6ee27, `brand-guidelines-v2-baseline` a9d034a, `brand-guidelines-v2-phase0` 558944e, `brand-guidelines-v2-phase0-baseline` d1aa297, `brand-guidelines-v2-phase1` 7c2490b, `brand-guidelines-v2-phase1-ir` 054f226, `brand-guidelines-v2-phase1-pages` 758c2ca, `brand-guidelines-v2-phase1-parity` 2c17f34, `brand-v2-phase2-composition` 01fb8d0, `brand-v2-phase2-corpus` 2afa25c, `brand-v2-phase2-cover-compositions` bd80fbf, `brand-v2-phase2-cover-distance` 7179802, `brand-v2-phase2-document-composer` 6be00a1, `brand-v2-phase2-foundation` ea9e8d3, `brand-v2-phase2-interiors` 0e68418, `brand-v2-phase2-output-switch` 35a94dd, `brand-v2-phase2-preview-switch` 287359a, `brand-v2-phase2-production-adapter` 263c5fd, `brand-v2-phase2-production-adapter-v2` 6f1b79f, `brand-v2-phase2-render-bridge` e9a111d, `brand-v2-phase2-visual-proof` 1cc96fa, `design/graphite-marketing-heroes` 93a330f, `editor-ux-phase1-4` af34a3a, `effects-controls-depth` eea9471, `effects-ux-workspace` 6f647d4, `feat/brand-portals` d175c91, `feat/guided-workspace-ui` d616ada, `feature/editor-studio` b3bfc13, `growth-os-attribution` 4e234dd, `growth-os-content-graph` fdeb9b6, `growth-os-decisions` de915c2, `growth-os-decisions-reconciled` 2108ecb, `growth-os-experiments` 40699d1, `growth-os-foundation` 91d7203, `growth-os-product-loops` d677071, `hotfix-brand-v2-ci-gates` 6cd013b, `hotfix-brand-v2-netlify-build` a1cd694, `landing-page` 2c6269f, `pen-pro-studio-plan` aaca12e, `phase7-reuse-foundation` 54356a2, `phase7b-library` de47333, `phase7b-reconciled` c8ab5b5, `phase7c-7d-finish` 4132d49, `phase8-production-depth` 0c59dfc, `phase9-completion` 580f822, `phase9-production-engine` 5de3282, `phase9a-stage-engine` 603d33a, `phase9a-webgl-compositor` f660017, `phase9c-colour-pdfx` 45aee34, `studio-desk` e04e427, `studio-drafts-pen-handoff` 445b7ec, `ux/simplification` f5d25b8.

## Next execution order

Active track (6 Oct 2026): finish Brand Guidelines V2 Phase 2 so V2 can be switched on for designers. See the Brand Guidelines V2 section above for the exit conditions.

Phase 9 is complete as an infrastructure/product run. New work should be driven by real production documents, browser/device measurements and regression reports rather than another broad architecture phase. Priority follow-up is measured parity/performance tuning on representative mobile and desktop hardware, plus any printer-specific PDF/X fixes found by receiving prepress workflows.

AI/design API remains excluded unless explicitly reactivated.
