# Phase 9 — Production Engine

Phase 9 upgrades VoidCanvas infrastructure without adding an AI/design API.

## 9A — GPU render graph + tiled compositor

The document model remains the source of truth. Rendering is split into a dependency graph and bounded tiles. A change invalidates the changed node and dependent composite nodes only; tile identity includes project, tile coordinate, scale bucket and revision.

WebGL2 is the accelerated baseline. CPU Canvas rendering remains a required fallback. The first implementation deliberately separates invalidation/cache ownership from shader implementation so existing document semantics are not duplicated inside the GPU renderer.

Acceptance targets for the completed 9A tranche:

- deterministic tile invalidation
- bounded GPU texture residency and explicit disposal
- no full-document redraw for local edits when effects/composite dependencies permit locality
- existing full-resolution export fidelity retained
- context-loss recovery without losing the editable document
- CPU fallback produces the same document semantics

## 9B — OPFS virtual scratch / memory system

OPFS is an optional spill tier below GPU and RAM caches. Scratch failure must never make a document unreadable.

Buckets:

- `tiles` — evicted rendered tiles
- `composites` — expensive reusable intermediate results
- `previews` — replaceable screen-resolution representations
- `history` — reversible tile/operation state for deep undo

The storage manager exposes quota and persistence state. Scratch data is disposable; original project/source data remains governed by the existing project persistence model.

Acceptance targets for completed 9B:

- pressure-driven GPU → RAM → OPFS spill
- cache restore by the same stable tile key
- per-project cleanup
- quota-aware eviction
- persisted-storage request where the browser permits it
- browser denial/unavailability falls back cleanly to RAM

## 9C — native ICC/RGB/CMYK colour engine

Build on the existing LittleCMS/WASM and proof/export path. A document gains an explicit working colour model/profile instead of converting only at output. RGB remains supported; CMYK values and profile identity must survive edit/save/reopen/export.

Required before calling this native CMYK editing:

- document working-space metadata and migration
- RGB ↔ CMYK and CMYK ↔ CMYK transforms through ICC profiles
- colour picker/value model that preserves native channel values
- preserve-K/black handling and total-area-coverage diagnostics
- proof/gamut display independent of stored channel values
- deterministic raster and solid-colour conversions

## 9D — PDF/X-4 + preflight/validation

PDF/X-4 is a production export, not a filename option. Export must emit the required output intent, page boxes, font/image resources, transparency behaviour and conformance metadata, then pass an independent validator in the regression suite.

VoidCanvas preflight additionally checks product policy such as bleed, effective image DPI, missing fonts/assets, unresolved RGB conversion and spot-colour consistency.

## 9E — production torture suite and hardening

Use representative production fixtures rather than synthetic size claims. Fixtures should include large photography, many-board campaigns, deep groups/effects, imported PSD/smart sources and print/CMYK work.

Measure at minimum:

- open time
- pan/zoom frame time
- local-edit invalidation area and completion latency
- GPU/RAM/scratch residency
- history depth under memory pressure
- visual parity against CPU/reference rendering
- context loss/recovery
- export fidelity and PDF/X validator result

Performance regressions become CI data, not subjective reports.

## Sequence

1. Stabilise render-graph, tile identity and residency contracts.
2. Integrate Stage with the graph while preserving CPU fallback.
3. Move eligible composites/effects to WebGL2 shaders.
4. Connect OPFS spill/restore and history pressure handling.
5. Introduce document-native colour model/profile migrations.
6. Implement PDF/X-4 writer/preflight plus independent validation.
7. Gate release with production torture fixtures and budgets.
