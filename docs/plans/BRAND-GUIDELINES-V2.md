# Brand Guidelines V2

Status: Phase 1 shipped with a CI parity gate. Phase 2 engine on master, off for designers (`?brandv2=1` to review) since `3a8d8a9`, until every current page keeps its real content and the Phase 2 gates and contact-sheet review pass.
Date: 5 October 2026
Owner: Voidcanvas

## Goal

A designer should be able to drop a logo and get a brand guideline that feels designed for that identity, not filled into a common template. The builder must stay easy on the surface, keep all existing depth, explain every recommendation, and preserve designer control.

The programme has four linked outcomes:

1. A composition engine that produces structurally different guidelines from brand inputs, direction and seed.
2. Deterministic brand intelligence that catches real logo, colour, type and content problems and offers a one-click fix without blocking the designer.
3. A direct manipulation builder that exposes only the controls relevant to the current decision.
4. A published `/b/{slug}` portal rendered from the same guideline data, with copyable values, downloads, section URLs and a direct route into Editor.

Image generation in Editor is a separate track and is not part of this programme.

## Current baseline, confirmed from master

Master at the start of Phase 0: `665685e3ae2687a5ac030e308fd2dd4283687eb2`.

### Builder structure

- `src/studio/brand-pages.ts` has 16 page kinds.
- Those page kinds expose 23 hand-drawn variants in total.
- 10 of the 16 page kinds have only one variant.
- The default document is a fixed 15-page sequence.
- `src/studio/brand/tokens.ts` exposes 3 art directions: `editorial`, `graphic`, `systematic`.
- It exposes 6 personalities and 4 palette harmonies.
- Art direction is read directly by the cover. Most interior page functions do not branch on it.
- Current generated voice is selected from six fixed personality entries.
- Current principles come from three fixed art-direction tables.
- The default brand colour before logo-derived replacement is `#3d5afe`.

Current page-variant counts:

| Kind | Variants |
|---|---:|
| cover | 3 |
| principles | 2 |
| logo | 2 |
| clearspace | 1 |
| minsize | 1 |
| misuse | 1 |
| photo | 1 |
| colour | 2 |
| ramps | 1 |
| access | 1 |
| type | 1 |
| scale | 1 |
| mockups | 1 |
| voice | 2 |
| tokens | 1 |
| closing | 2 |
| **Total** | **23** |

This explains the current ceiling on visual diversity. Token variation changes colour, font and a few layout values, but most page composition remains fixed.

### Portal structure

The Brand workspace and living portal already exist. Keep them and replace their rendering path rather than starting a second product.

Existing behaviour to preserve:

- `/brand` workspace.
- `/b/{slug}` and section routes.
- publish and unpublish state.
- `link` and `public` visibility.
- copy brand link and share.
- section sharing.
- colour copy formats.
- PDF, assets and token downloads.
- `Create with this brand`.
- changed-since-publish fingerprint.
- 4 MB snapshot validation cap.

Current portal limitation:

- One neutral cream presentation shell is shared by every brand.
- Guideline pages are stored as JPEG assets and are still a primary representation of the document.
- The portal therefore does not yet carry the composition family, brand-derived graphic language or responsive semantic layout of the guideline itself.

### Design intelligence baseline

Keep the existing contract exactly:

- Detected
- Suggested
- Recommended
- Set by you

Keep the existing severity language:

- Good
- Worth checking
- Needs attention

Keep all existing deterministic intelligence for asset profiling, contrast, logo variants, background placement, photography, naming, fonts, logo rules, health, preflight and brief checks.

### Known regression fixtures

The following become permanent fixtures:

- B22: accented leading capital collides with the cover eyebrow.
- B23: single-colour mark disappears on a same or near-same brand-colour surface.
- B28: phone page strip covers the brand-name field.

## Baseline diversity measurement

Phase 0 adds a reproducible baseline runner before Phase 2 changes composition behaviour.

Corpus target:

- 12 fixture identities.
- 10 names per fixture.
- 10 seeds per name.
- 1,200 generated documents.
- Cover plus three representative interior pages per document for visual comparison.

Metrics:

1. Structural distance from page kind, variant, grid, axis, margins, type treatment, colour blocking, device use and density.
2. Cover perceptual hash distance, 64-bit.
3. Same-position structure reuse across documents.
4. Same-brand consecutive-take repetition.

The Phase 0 scripts write raw JSON and contact sheets under `e2e/.out/brand-diversity/`. Phase 2 is not allowed to tune thresholds without comparing against these numbers and reviewing the contact sheets.

### Measured Phase 0 baseline

Measured in GitHub Actions on 5 October 2026 from the 12 x 10 x 10 corpus.

Structural baseline:

- Documents: 1,200.
- Page kinds: 16.
- Available hand-drawn variants: 23.
- Page kinds with one variant: 10.
- Default visible pages: 15.
- Observed art directions: editorial, graphic, systematic.
- Unique document structure signatures: **1**.
- Mean same-position structure reuse: **1.0000 / 100%**.
- Maximum same-position structure reuse: **1.0000 / 100%**.
- Share held by the most common structure: **1.0000 / 100%**.

The structural result is unambiguous: all 1,200 baseline documents use the same page-kind and page-variant sequence. Colour, font, radius, grid and art-direction changes create surface variation, but the document skeleton does not vary.

Rendered cover baseline, using an 8 x 8 64-bit average perceptual hash:

- Covers measured: 1,200.
- Pairwise Hamming distance minimum: **0 bits**.
- Pairwise Hamming distance maximum: **63 bits**.
- Pairwise Hamming distance mean: **14.042 bits**.
- Same-brand ten-take minimum: **0 bits**.
- Same-brand ten-take maximum: **53 bits**.
- Same-brand ten-take mean: **17.667 bits**.

A minimum distance of 0 means some generated covers are visually indistinguishable at the baseline perceptual-hash resolution. This is the failure condition the Phase 2 uniqueness gate is intended to remove.

Contact-sheet review of the baseline confirms the same pattern: the cover and palette sometimes change, while Colour, Clear space and Typography retain almost the same composition across takes and brands. The black-wordmark fixture also demonstrates why an achromatic logo must not silently inherit the current default blue. The accented-capital and language fixtures make glyph-bound measurement a correctness requirement rather than a visual-polish task.

Release target after Phase 2:

- No two corpus documents share more than 30% of page structures in the same positions.
- Every pair of covers in the required comparisons differs by at least 12 pHash bits.
- No cover composition repeats within 8 consecutive takes for one brand.
- Mean pairwise document distance is at least 3 times the measured Phase 0 baseline.

## Architecture decisions

### 1. Add a layout IR, do not put more branches into page draw functions

Add `src/brand/compose/` as the shared composition domain.

The IR is the canonical representation of a generated guideline page. It contains semantic nodes and layout geometry before anything is painted.

Core concepts:

- `Page`
- `PageGenome`
- `DocGenome`
- `Node`
- `Paint`
- `TextRole`
- `Composition`
- `DirectionFamily`
- `CompositionCandidate`
- `LintFinding`

Node types initially cover frame, text, logo, swatch, image, device, specimen and table. New node types are added only when a current page cannot be represented honestly.

### 2. One composition, three outputs

The same IR feeds:

- `paintCanvas(page, ctx)` for builder preview, screen PDF, print PDF and the recorder.
- `paintHtml(page)` for the published portal and single-file HTML handoff.
- `lint(page, raster)` for quality gates.

Do not maintain a second independent portal layout system.

### 3. Keep recorder parity as a release gate

`recordPages()` remains the route into editable Editor boards.

For every IR page kind, parity tests compare:

- text content.
- box geometry within 1 page unit.
- colours.
- logo treatment.
- image placement.

A page is not migrated until preview, PDF and recorder output agree.

### 4. Migrate page by page

Phase 1 ports only Cover, Colour and Clear space first. Old and new renderers coexist behind page-kind routing. This avoids a half-migrated builder.

When parity is proven, Phase 2 moves the remaining page kinds and removes the old draw-function path only after all pages are on the IR.

### 5. Composition functions return candidates, not templates

A composition is a function of content, brand, direction family and seeded RNG. It returns `Page | null`.

The engine:

1. asks compatible compositions for candidates.
2. lints every candidate.
3. rejects failures.
4. scores passing candidates for fit and document rhythm.
5. steers away from recently seen genomes.
6. selects the strongest remaining candidate deterministically for the seed.

### 6. Direction families are parameter distributions

Initial families:

1. Swiss grid
2. Editorial
3. Poster
4. Quiet luxury
5. Spec sheet
6. Geometric
7. Soft
8. Archive
9. Raw
10. Kinetic
11. Warm craft
12. Monochrome studio

A family sets distributions for grid, margins, axis, display scale, weight contrast, case, tracking, colour-flood frequency, surface sequence, image crop, rules, numbering, page furniture, devices, density, radius and eye movement.

Compatibility scores affect ordering only. They never prevent a designer from choosing a family.

### 7. Brand-derived graphic language is deterministic

Add `src/lib/intelligence/shape.ts`.

Measure:

- dominant edge angles.
- orthogonal, diagonal or curved character.
- roundness and corner sharpness.
- relative stroke weight.
- aspect and major-part proportion.
- negative-space share.
- symmetry axis.

Derive:

- supergraphic eligibility.
- tiled mark patterns or angle fields.
- corner-radius language.
- rule weight.
- diagonal device angle.
- image-frame proportions.
- colour proportions from mark colour share.

Every generated device records its source so the UI can say what was detected.

### 8. Document rhythm is selected at document level

The document composer owns pacing. Individual page composers do not decide sequence in isolation.

Rules:

- no consecutive identical structures.
- dense and airy pages alternate according to family character.
- colour floods are rationed.
- optional section openers depend on family.
- empty-content pages do not exist.
- target length grows from about 14 to about 30 pages according to real content.

### 9. Achromatic marks never inherit the default blue as identity

Logo colour character is classified before palette generation.

For achromatic dark marks, show three real routes:

- monochrome plus one signal colour.
- palette from chosen brand feel and industry.
- palette from supplied reference imagery.

For achromatic light marks, use the mirrored logic.

For a chromatic single-colour mark, the measured logo colour becomes the brand colour. Near-same background placement is prohibited unless the designer explicitly keeps it.

### 10. Glyph safety is a hard generation rule

Before a font can be suggested, it must render the brand name, tagline and selected languages without fallback.

Fixture coverage includes Yoruba tone marks and Hausa hooked letters.

Real glyph bounds are used by composition lint, so accents and ascenders cannot collide with neighbouring text.

### 11. Builder UX uses progressive disclosure

First run:

- one logo drop surface.
- one analysis sentence.
- optional industry, feel and medium chips.
- three deliberately distant live directions.
- Use this, More like this and Three different.

Builder:

- page in the centre.
- collapsible page strip.
- contextual inspector.
- brand name, health, Present, Publish and Export in the top bar.
- direct manipulation on page content.
- six-layout filmstrip from page background.
- five macro dials in Tune.
- existing token controls under Advanced.
- New take scope selector.
- take history, stars and compare.

Phone at 390 x 844 uses a bottom page strip and bottom-sheet inspector. No desktop hover dependency is allowed.

### 12. Portal becomes a native IR view

Keep the current routes and publication model, but extend the snapshot with validated serialisable IR and version metadata.

`paintHtml` renders the guideline natively so typography, colour, spacing, graphic devices and composition family belong to the brand.

Section URLs remain stable.

Every useful value is directly copyable:

- HEX
- RGB
- OKLCH
- CSS variable
- Tailwind token name
- type as CSS
- spacing and other design tokens

Downloads remain available for PDF, logo assets and token formats.

`Create with this brand` remains a first-class action.

JPEG pages stay only as compatibility and PDF fallback while IR migration completes.

No new public data fields are exposed beyond this approved programme without owner review.

### 13. Publishing uses explicit versions

A publication is a versioned snapshot. Editing a brand does not mutate the last published version.

Before publish, show a plain-language diff covering:

- colours.
- fonts.
- rules.
- pages added.
- pages removed.

Previous published snapshots remain restorable.

### 14. Plan gating stays centralised and inactive until billing exists

Free, Team and Pro capability rules live in one data file.

Team is the first intended paid plan. Until billing exists, all programme capabilities stay on behind a feature flag. This programme does not add billing UI.

## Quality gates

Every generated page must pass layout lint before it can be shown.

Lint checks:

- text stays inside frame and safe area.
- no unintended text, logo or swatch overlap.
- contrast reaches WCAG thresholds against the rendered pixels below the text.
- no text below 7 pt print equivalent.
- logo clear space and minimum size hold except on demonstration pages.
- avoid a short orphaned final word where rebreak can solve it.
- document margins stay consistent.
- required fonts are loaded.
- the brand name has no fallback glyphs.

Speed targets on a mid-range laptop:

- three direction previews within 1.5 s after analysis.
- full guideline and sharp first page within 3 s.
- dial preview repaint within 100 ms.
- average single-page composition below 30 ms.

Phone budgets are twice those values.

## Fixture set

Permanent identities:

1. black wordmark on transparency.
2. black symbol on white JPG.
3. white transparent mark.
4. strong red symbol.
5. multicolour lockup with meaningful internal edges.
6. gradient mark.
7. thin line mark.
8. very wide wordmark.
9. tall stacked mark.
10. SVG logo.
11. leading accented capital: `Òké`.
12. Yoruba tone marks plus a Hausa hooked letter in the tagline.

Each fixture has expected colour character, allowed and refused logo variants, palette markers, cover-surface expectations and glyph-safe fonts.

## Phase plan and acceptance criteria

### Phase 0: plan and baseline

Deliver:

- this architecture plan.
- fixture definitions and regression cases.
- baseline diversity renderer and metrics.
- baseline contact sheets.
- recorded baseline scores.

Done when:

- baseline corpus runs reproducibly.
- structural and visual scores are recorded here.
- B22, B23 and B28 exist as regression cases.
- no user-facing behaviour changes.

### Phase 1: layout IR and painters

Deliver:

- IR types.
- canvas painter.
- HTML painter.
- lint framework.
- recorder parity harness.
- Cover, Colour and Clear space migrated without visual change.

Done when:

- migrated-page parity tests pass.
- current PDF output is unchanged for migrated pages within raster tolerance.
- current Editor board recording is unchanged within 1 unit.
- all existing Brand tests remain green.

### Phase 2: families, shape language, rhythm and uniqueness

Deliver:

- 12 direction families.
- shape intelligence.
- brand-derived graphic devices.
- minimum 8 cover compositions.
- minimum 6 compositions per interior kind.
- document rhythm.
- all current pages migrated.
- new page kinds with real-content conditions.
- diversity scoring and recent-genome avoidance.

Done when:

- corpus structure overlap stays below 30%.
- required cover pHash distances are at least 12 bits.
- no cover composition repeats inside 8 consecutive takes.
- all-token locks survive Vary layout.
- mean document distance reaches at least 3 times baseline.
- review contact sheets have no professional-send-back findings.

### Phase 3: brand intelligence

Deliver every deterministic check in the V2 brief for logo colour character, colour, type, logo shape and content.

Done when:

- achromatic fixtures never silently use `#3d5afe` as their brand colour.
- every palette surface has a logo marker.
- B22 and B23 cannot recur.
- glyph fallback blocks a font suggestion.
- all findings explain why and offer one fix plus Keep mine.

### Phase 4: builder UX

Deliver:

- first-run direction chooser.
- contextual inspector.
- direct manipulation.
- layout filmstrip.
- five Tune dials.
- take history and compare.
- keyboard flow.
- first-class phone flow.

Done when:

- logo drop to exported PDF completes under two minutes in e2e.
- phone passes at 390 x 844.
- B28 cannot recur.
- all speed budgets hold.

### Phase 5: applications and outputs

Deliver:

- applications pages and mockups.
- Open in Editor per application.
- asset pack.
- favicon and avatar sizes.
- email signature.
- DTCG tokens.
- Brand at a glance outputs.
- guideline PDF import.

Done when each output opens correctly in its intended consumer and filenames are stable.

### Phase 6: portal

Deliver:

- native IR portal.
- per-section Open Graph images.
- richer copy formats.
- Create with this brand from the native system.
- version history and restore.
- publish diff.

Done when:

- every fixture portal looks like its own guideline rather than a common shell.
- section routes remain stable.
- current portal e2e is extended and green.
- snapshot size is reported and below the strict cap.

### Phase 7: present, review and learning

Deliver:

- Present mode.
- review pins and comments in builder.
- privacy-safe analytics events.
- Learn updates.
- landing-page brand-flow demo update.

Done when events appear in `/admin`, the privacy article lists every new field and Learn covers every new visible control.

## Shipping discipline

Every phase is independently releasable.

Before merge:

1. strict TypeScript passes.
2. unit tests pass.
3. production build passes.
4. relevant e2e passes.
5. full `e2e/run.mjs` passes when CI can run it.
6. brand-specific suites pass.
7. contact sheets are reviewed by a reviewer that did not write the implementation.
8. professional-send-back findings are fixed.
9. docs and Learn are updated with visible behaviour.
10. Netlify preview is green.

After merge:

- confirm master SHA.
- confirm Netlify production is on that SHA and ready.
- confirm GitHub Actions.
- bump desktop patch version at the end of a user-facing slice, then confirm desktop release artefacts.

## Decisions deliberately deferred

- Image generation in Editor.
- AI connector or design API.
- AI-written guideline copy.
- custom domains.
- password-protected portals.
- portal analytics UI.
- portal team roles.
- billing UI.

The data model may reserve space for the later portal capabilities, but no visible UI for them ships in this programme.