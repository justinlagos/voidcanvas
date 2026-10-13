# VariantGraph — Identity, Inheritance, Override & Conflict Contracts (Sprint A; implement Stage 5/6)
Correction §1: do not defer override-preservation to Stage 5 discussion. Contracts are frozen now; Sprint B adds fixtures; Stage 5/6 implements.

## 1. Identity (normative)
- Every scene object keeps immutable `nodeId` across serialize/reopen and master revisions. Cascade MUST transfer identity, never delete/recreate without mapping.
- Variant instance = `(masterNodeId, variantBoardId) -> instanceNodeId` recorded in VariantGraph. `srcId` (current) is the precursor; v6 promotes it to `{ masterNodeId, masterRevision, instanceId }`.
- Group members share one transform; groups get new instance IDs per board but record `masterGroupId`. Current `regroup()` already re-ids groups — keep, but persist the map (today the map is discarded).
- Prohibited: copied layers sharing master's `groupId` across boards (old defect); `resyncVariants` wiping children then re-adding as new identities (current code — marked Missing/risk, must be replaced).

## 2. Inheritance (per-property, not whole-layer)
- Inherited props: text content (`briefKey` tokens), fill/stroke/colour tokens, image source ref, opacity/blend, style tokens. Layout props (x/y/w/h, board-relative placement) are variant-owned by default.
- Master revision `rev` increments per committed edit. Variant records `basedOnRev`. Resync = three-way merge (base, master-now, variant-now), not master-overwrite.
- Structural ops (add/delete/reorder on master) replay by `masterNodeId`, preserving variant-local layout unless conflict (see §4).

## 3. Overrides (explicit, scoped, survivable)
- Override = `{ nodeId, prop, variantValue, basedOnRev }`. Any direct edit on a variant creates one. UI shows "linked — overridden" badge; "Reset to master" removes it.
- `resyncVariants` MUST: (a) load master-now, (b) for each variant apply inherited changes where no override exists, (c) keep overridden props untouched, (d) never drop variant-only nodes.
- Current `relayout(masterLayers, master, child, ...)` violates (c,d) — Sprint B fixture must fail until fixed.

## 4. Conflicts (visible, never silent)
- Conflict when master changed a prop the variant also overrode since `basedOnRev`, or master deleted a node the variant edited, or type changed (text→shape).
- Behaviour: keep variant value, flag `{ masterValue, variantValue, resolution: pending }`, surface in Cascade panel + preflight warning. Required content (role `logo/headline/cta` or user-pinned) can never auto-drop; if unreadable at target size, mark `leftOut` with reason + one-click restore (current `dropped[]` + notes pattern retained, but must record per-node, not just names).
- No template-specific bypass. Cascade outputs are real editable scene objects.

## 5. Sprint B regression fixtures (schema only, no migration)
- `variant-identity.json`: master (logo group + headline + image) → cascade to 2 sizes → assert every instance has distinct id + `masterNodeId` map, no shared `groupId` across boards.
- `override-preserve.json`: override variant headline position + image crop → resync master text → assert override survives, non-overridden colour follows master.
- `conflict.json`: override + master change same prop → assert conflict record + variant value kept + warning emitted.
- `required-content.json`: tiny target → assert required nodes never silently omitted; `dropped` carries reason + restore path.
- All fixtures run against current `cascade.ts` to DOCUMENT failure (expected red), then gate Stage 5 implementation.

## 6. Full implementation (Stage 5/6, not Sprint B)
Replace `resyncVariants` delete/recreate with merge engine; persist VariantGraph in `.void` v6 (see 08); build 300 masters × 10 destinations benchmark (see 04); human acceptance per 07 steps 13–15.
