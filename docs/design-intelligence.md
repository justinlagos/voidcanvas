# Design intelligence

Built 27 Sept 2026 from the deep UX audit (`docs/plans/ux-audit-2026-09-26.md`). Code: `src/lib/intelligence/`. Every
module is deterministic, runs on the device, and is unit tested in `src/lib/__tests__/intelligence.test.ts`; the browser
walk is `e2e/intelligence.mjs`.

Language rule everywhere it surfaces: a value is **Detected** (measured), **Suggested** or **Recommended** (from the
measurement), or **Set by you**. Nothing claims to be the client's official rule unless the designer set it.

## Modules

| File | What it does |
|---|---|
| `asset.ts` | `profilePixels(rgba, w, h)`: artwork bounds, aspect, transparency, a flat background knocked out (JPG on white), colour clusters from solid interior pixels (anti-aliased edges never vote) with each cluster's share of the outline, mono or multicolour, tone, share of edges that run between colours inside the mark, the pair of colours that share the most boundary, thinnest stroke (chamfer distance ridge), separate pieces, and a kind guess: symbol, wordmark, lockup |
| `contrast.ts` | WCAG ratio; `markContrast(profile, bg)`: the weakest colour that meets the background, 4.5:1 target for text-like marks and 3:1 for symbols, with a sentence of why; `scrimFor`: the lightest black or white overlay that would clear the target |
| `logo.ts` | `planVariants(profile)`: primary, reversed, mono dark, one colour, greyscale, each valid or refused with a reason. A knockout is refused when internal colour boundaries carry the mark (`internalEdges >= 0.12`); greyscale is refused when two main colours land on the same grey. Pixel ops `knockoutPixels`, `grayscalePixels` keep alpha |
| `backgrounds.ts` | The background set a designer meets (white, black, grey, brand colours, surfaces, tints) and `placeOn`: full colour if it clears, else the best honest version, else the scrim and the ratio it reaches |
| `photo.ts` | `readPhoto`: a 3 × 3 grid of tone and busyness with a subject guess; `placeOnPhoto`: corners scored for contrast, busyness and subject overlap, least destructive fix first; `markOnTone` for the Editor |
| `naming.ts` | `suggestImageName`: `Image · Portrait` for camera and screenshot names; `suggestLogoName`: `Logo / Horizontal / Reversed` from file-name hints and the profile |
| `fonts.ts` | `classifyFontName`: kind of face, width and weight from a table of common families plus name words and PostScript abbreviations (BdCn); `suggestReplacements`: closest match, safer fallback, ranked list with reasons |
| `brand.ts` | `suggestRules(profile)`: clear space from the shape, minimum width so the thinnest stroke stays 1 px, minimum print so it stays 0.3 mm; `brandHealth`: four quiet groups; `LogoRules` with a source per rule |
| `preflight.ts` | `exportPreflight`: soft images in ppi and inches, text past the edge, empty text, hidden layers, sizes past the canvas limit, missing fonts, off-brand fonts; `deliveryPreflight`: unbuilt formats, print without PDF, unapproved or changed version, open comments and to-dos, open link, duplicate names |
| `dom.ts` | Browser glue: file or canvas to pixels, variants to canvases, recolour, photo reading |

## Where it is used

- **Guideline builder** (`src/studio/BrandGuideline.tsx`, `brand-pages.ts`, `brand/logo.ts`): detection line and
  suggested name under the logo; versions with Derived or Refused and a reason, each derived one can be left out;
  rules labelled Suggested or Set by you; "Logo on backgrounds" with a treatment select per row (a chosen row is set by
  you and survives in the checks and pages); a brand colour from the logo is applied only while the brand colour is
  the default, otherwise offered; Vary layout (layout tokens only) beside New take of everything; the health popover.
  Pages: Logo backgrounds grid with scrims drawn in, Clear space with Correct and Incorrect, Minimum size with actual
  sizes and a magnifier, Do not made from the real logo. Decisions (`LogoDecisions`) are saved with the draft and
  passed to every render and export.
- **Client brands** (`src/studio/jobs.ts`, `brands/BrandsView.tsx`): `ClientBrand.logos[]` carries `variant`,
  `derivedFrom`, `profile`; `logoRules` carries clear space, minimum width, minimum print and the background rules,
  each with a source. `logoMin` and `clearSpace` mirror the rules for older readers. Adding a file measures it, names
  it and derives the honest versions; Test the logo runs the background set against the brand's own colours; the
  health panel sits at the top.
- **Editor** (`src/editor/brand-logo.ts`, `components/panels.tsx`, `AddMenu.tsx`, `store.ts`): the job brand's
  versions in the Add menu; `addImage` with `placement: 'corner'` puts a logo at about a fifth of the shorter side in
  the emptiest corner with its clear space, role `logo`, `brandLogoId` set; `logoContrastFindings` renders the pixels
  under the on-board part of the logo, reads their tone and busyness, judges the mark and offers a version that would
  hold (`swapLogoVersion` keeps size and place); Keep declines that suggestion for the session; the clear-space check
  no longer counts the layer the logo sits on. Imported pictures with camera names are named by orientation.
- **Export** (`components/ExportDialog.tsx`): destinations PNG · Social, PNG · Transparent, JPG · Web, PDF · Print,
  PDF · Client proof; preflight list before the button (print sizes from the job's formats or `doc.dpi >= 150`);
  failures say what was too big and what to do.
- **Delivery** (`studio/job/DeliverTab.tsx`): readiness next to the package title with a jump per finding.
- **Missing fonts** (`components/MoreDialogs.tsx`): closest match and safer fallback per missing family.
- **Effects** (`components/effect-presets.ts`): starting points on the Effects page and on filter layers.

## Not done, by design

- No AI. Everything above is measurement and rules, so it is the same on every device and explains itself.
- A simplified small-size mark is never generated; the health read says when one is worth asking for.
- Scrims are suggested and drawn on the guideline pages, never applied to a design automatically.
