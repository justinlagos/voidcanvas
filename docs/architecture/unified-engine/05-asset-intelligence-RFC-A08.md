# A08 — AssetRecord / GenerationRecipe / AssetVariant RFC (schema only, Sprint A)
No provider wired. No network by default. Sprint B07 builds local-only tray + lineage on existing raster nodes; B08 adds mocked providers + consent state machine.

## AssetSource
`user_upload | local_library | brand_library | external_search | generated | derived` + immutable `resourceId` + `SHA-256` of bytes. Never place raw remote URLs into renderer; controlled import path only (scan, size/dimension/mime validate, EXIF strip, decompression-bomb guard).

## AssetRecord
`{ resourceId, sha256, bytesRef (v6 blob, explicit storage choice), preview/thumbnail, width/height, mime, colourProfile, alpha, localAvailable, rights: RightsRecord, createdAt, title, parentRefs }`. Portable in `.void` v6 for accepted outputs; previews regenerable. Export flattening never deletes project source.

## GenerationRecipe (privacy-separated, optional)
`{ prompt, negativePrompt?, provider/model/version, params/seed (as returned), referenceIds+hashes, sceneContext (board size, region, brand tokens — only with per-request opt-in), regionMaskId, editInstructions, policyConsentVersion, costEstimate/actual }`. User can exclude prompts/references from project + opt out of prompt history. Prompts/references NEVER in analytics (`supabase/analytics.md` + privacy article gate per CLAUDE.md).

## AssetVariant (branchable lineage, not overwrite chain)
`{ parentAssetId, outputAssetId, operation (generate/variation/region-edit/extend/replace/upscale), regionMaskId?, recipeId, contentFingerprint, status (proposed/accepted/rejected), acceptanceState }`. PlacedAssetNode = ordinary scene node → resource/version; transform/crop/mask/effects/clip owned by scene systems.

## GenerationTask (consent lifecycle)
`draft → awaiting_consent → queued → running → ready | failed | canceled → committed`. Fields: `taskId, docRevision, targetObjectIds+maskIds, provider, capability, requestFingerprint, costEstimate/confirmed, error`. Rules: no request before explicit action + disclosure (provider, data sent, licence, price); stale-revision results never auto-commit (tray only); cancel where supported; user keeps editing while running.

## RightsRecord
`{ supplier, sourceUrl, licenceType, verificationState (verified/unknown/unlicensed), commercialAllowed?, attributionRequired, restrictions, creditLine }`. Search results are candidates. Never infer universal commercial rights. Insertion requires licence/attribution display + receipt stored with project.

## Storage / history
Accepted output = one atomic history transaction; original bytes preserved; regional edit = patch layer or derived version + mask; feather boundary documented per-operation. Offline reopen uses embedded accepted assets without provider.
