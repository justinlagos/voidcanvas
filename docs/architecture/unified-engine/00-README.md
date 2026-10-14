# Unified Creative Engine 2.0 — Architecture Source Index
Date: 13 Oct 2026 | Status: Sprint A (Stage 0, gated) | Source of truth: `VoidCanvas_Unified_Creative_Engine_Master_Plan_v2.md`

No code or production behaviour changed in Sprint A. No scene-graph migration started. No billable AI generation enabled.

This folder is the committed architecture record. Earlier requirements are retained, not discarded:
- `docs/DESIGNER-WORKFLOW-AUDIT.md`, `docs/DESIGNER-PRODUCTION-WORKFLOWS.md` (14 audit categories, PR #8 baseline)
- `docs/plans/CURRENT-STATUS.md` (Phases 0–9 shipped, authoritative build status)
- `docs/plans/boards-cascade-export.md` (Cascade/export/zoom defects + plan)
- `docs/void-format.md` + `src/editor/voidfile.ts` (`.void` v5 contract)
- `CLAUDE.md` release discipline + privacy rules (`src/lib/vault.ts`, `src/lib/analytics.ts`, `supabase/analytics.md`)

Files:
- `01-ground-truth-audit.md` — evidence-backed ledger (A01–A03). Classifications: Implemented / Verified / Partial / Unverified / Missing / Blocked.
- `02-variantgraph-cascade-contracts.md` — VariantGraph identity/inheritance/override/conflict contracts (Cascade safety brought forward) + Sprint B fixtures. Full implementation stays Stage 5/6.
- `03-inspector-tools-spec-A04.md` — context-aware inspector + unified tool interaction spec.
- `04-golden-jobs-baselines-A05.md` — golden-job fixtures + measurable baselines.
- `05-asset-intelligence-RFC-A08.md` — AssetRecord / GenerationRecipe / AssetVariant RFC (schema only, no provider wired).
- `06-provider-feasibility-ADR.md` — image-generation feasibility ADR: local / cloud / BYOK, capabilities, licences, device reqs, costs, privacy/security, backend, spending controls. No provider integrated.
- `07-rocket-journey-A09.md` — Rocket Poster journey + compact UX prototype (mocked provider only).
- `08-compat-rollback-strategy.md` — compatibility + rollback strategy (v1–v5 read, v6 planning, flag discipline).
- `09`–`13` — Sprint B/B.1 slice, evidence gate, release-candidate runbook, fixes, Sprint C1.
- `14-u1-appearance-support.md` — U1 appearance contract: supported rules, pixel-verified combinations, and the deliberate limits documented instead of silently approximated.

Audited commit: `8d423b5a6a9bdca5c88ee11ff2d2317e91a26451` = `origin/master` HEAD at audit time (verified `git ls-remote origin master`). If master has moved, re-verify before Sprint B.
