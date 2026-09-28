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
| `brief.ts` | `briefCheck(fields, text, today, { hasBrand })`: what is worth asking the client. Missing: date, time and venue (for events), call to action, contact, formats or sizes, logo, deadline. Clashes: two dates (a range is one), two prices with nothing saying they are different tickets, a weekday that does not match its date, a date that has passed, files due after the event. Each finding is a question with the words it came from. `datesIn` reads written and numeric dates (day first) and tells a file deadline ("need it by", "deadline", "due") from the date of the thing; `resolveDate` puts a yearless date in the coming year unless it passed in the last 60 days. `sizesIn`: pixel sizes, print sizes in mm, cm, inches or feet, and A0 to A6, matched to known formats. `formatsIn`: formats named by kind. `questionsEmail`: the questions as a short plain email |

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
- **Brief check** (`studio/job/BriefTab.tsx`, `editor/components/panels.tsx`, `editor/ops.ts`): "Worth asking the
  client" under the brief, each question with the words it came from, set aside per question (`Job.briefSkip`) and
  Copy as questions; sizes read from the brief as chips that add the format. Brief items carry which detail they are
  (`key`: headline, date, time, venue, price, cta, contact) and text added from the checklist remembers it
  (`TextLayer.briefKey`). `applyBrief` runs when a job's design opens from Studio and when the brief is edited in the
  Editor: a changed detail is replaced in every text made from it, and in any text that still says the old value
  (ignoring case, keeping capitals), on every board, as one undo step. The Editor's Brief panel checks each board on
  its own, with a count per board. `readBrief` takes the event date, not the date the files are due.
- **Photography page** (`brand-pages.ts` `pagePhoto`, `brand/store.ts`): up to three photos in the builder's Identity
  tab, kept in the draft and saved with the client brand as `imagery`. The page (after Do not, only while there are
  photos) crops each photo to its cell, reads it with `readPhoto`, and shows the logo where `placeOnPhoto` puts it
  (Suggested, with the version that reads there and a scrim only when needed) beside the logo as supplied over the
  subject or in the worst corner (Avoid, with the reason). Without a logo the corner is still chosen from the photo.
- **Logo on a photo in the Editor** (`brand-logo.ts` `photoCorners`): when a photo covers at least half of the board,
  the board is read and the logo goes in the best corner for the version picked, unless type or shapes are already
  there; otherwise the emptiest corner as before.

## Not done, by design

- No AI. Everything above is measurement and rules, so it is the same on every device and explains itself.
- A simplified small-size mark is never generated; the health read says when one is worth asking for.
- Scrims are suggested and drawn on the guideline pages, never applied to a design automatically.
