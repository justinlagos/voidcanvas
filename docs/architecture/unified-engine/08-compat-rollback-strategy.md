# Compatibility + Rollback Strategy (Sprint A; migration in later stages)
- **Read:** v1–v5 always readable (v1/2 inline base64, v3+ ZIP + hash blobs). Unknown fields/types preserved with note, never silently dropped. `minReader` enforced; newer `version` opens what is understood + warns.
- **Write:** default path writes SAME version as opened (no upgrade). v6 (SceneNode ids, TextStory, Appearance/Resource/Variant/Style graphs, AssetRecord/Recipe) ships behind flag with backup of original file + round-trip fixtures (v1–v5 → v6 → verify) before any default switch.
- **Flags:** `newGraph`, `variantMerge`, `assetFlow`, `remoteProvider` — independent, off by default. Rollback = flag off; old saves untouched (never rewrite on rollback). Emergency provider switch kills new tasks only.
- **Parity harness:** legacy vs new renderer behind flag (Stage 2 exit); preview/export diff tool (B05); external press-PDF validation before any PDF/X-4 claim change.
- **Release:** docs-only Sprint A needs no migration. Each later slice: small vertical PR + scenario + compat impact + screenshots/replay + perf + risks + fallback (per governance).
