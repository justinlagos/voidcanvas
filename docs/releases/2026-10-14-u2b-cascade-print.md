# U2-B, Cascade review and physical print fidelity

## Released baseline

PR #79 was merged with the user's explicit approval on 14 October 2026.
Merge commit: `6df15e5175ddd12bbe5659061bf76c281c5541a7`.
Netlify production deploy: `6acfbe3dfffdb1c6da91135c`, published at
2026-10-14T17:40:38.953Z. Netlify reported `ready`, `context: production`,
and the exact merge commit as `commit_ref`.

The production domain passed `e2e/pen-u2a.mjs` and `e2e/cascade-corpus.mjs`:
real anchor/handle editing, grid snaps, Undo/Redo, .void persistence, nested
linked-group changes and overrides, six destination formats, and all seven
independent PNG dimensions inside the exported ZIP. No uncaught page errors.

## Next candidate behaviour

- Boolean geometry replaces selected native shapes in one transaction, retaining
  the chosen source identity and restoring both geometry and selection on Undo.
  Divide retains each piece's owning style and selects all resulting pieces.
- Make compound path retains editable contours and even-odd holes. Release
  compound path produces separate native shapes. Direct Selection's Path menu
  changes the operations of picked contours without changing unrelated contours.
- Geometry operations reject locked, masked, clipped and cross-board/group input
  instead of silently consuming unsupported content. Nested group locks apply.
- SVG export resolves live Boolean operations into vector geometry in the exported
  copy; the original editable subpaths remain unchanged.
- Cascade measures full content before fitting, including headlines beyond the
  original board edge. Hidden/transparent required content and invalid geometry
  cannot silently pass. Larger previews expose every warning and physical trim
  dimensions, with a Back control returning to the same selected formats.
- Print presets retain per-board millimetres and DPI through .void reopening.
  PDF pages honour this metadata before document DPI or legacy dimension inference.
- PDF/X artwork bleed renders outside the trim from that board's actual artwork,
  with neighbouring boards excluded. Outward pixel rounding covers the requested
  bleed; the PDF image transform registers original artwork exactly to TrimBox.
- Production preflight warns for low effective raster DPI and critical content
  within 3 mm of the cut. CMYK TIFF uses the selected board's resolution.

## Acceptance commands

```sh
npx tsc --noEmit -p .
npm test
npm run build
# With a production Next server at BASE:
BASE=http://localhost:3000 node e2e/vector-u2b.mjs
BASE=http://localhost:3000 node e2e/pen-u2a.mjs
BASE=http://localhost:3000 node e2e/cascade-corpus.mjs
BASE=http://localhost:3000 node e2e/print-fidelity.mjs
python3 scripts/verify-print-files.py
```

Print acceptance needs a real CMYK ICC fixture; `ICC_PROFILE` can supply its path.
The new U2-B CI workflow installs Ghostscript's default CMYK test profile and
independently parses downloaded PDFs and TIFF using pypdf and Pillow. The profile
is a test fixture, never silently chosen for a user's print job. CI publishes
rendered evidence as an artifact.

## Limits

Geometry diagnostics do not certify design taste, image crops or photographic
quality. Review the enlarged previews. Required-content checks are geometric and
visibility based; pixel occlusion through arbitrary masks/effects is not proven.

The PDF/X output remains a flattened, ICC-managed CMYK handoff. Structural,
physical-size and pixel checks are independently tested, but printer-specific
PDF/X certification and an actual printed proof still require external validation.
Editable interchange remains .void/SVG/PSD. Existing files without per-board print
metadata retain their legacy export-size fallback; older clients do not interpret
new per-board physical intent.

This candidate is a separate PR. PR #79's release approval does not publish this
new candidate automatically.

## Local acceptance result

Passed: TypeScript, production build, all 546 unit tests across 92 files, the
U2-A and U2-B real browser checks, the six-format Cascade corpus including its
expanded A4 preview and seven PNG downloads, and the actual ICC-managed PDF/X
and TIFF downloads. Independent pypdf/Pillow checks and a Poppler rendering
confirmed physical trim, bleed registration, real bleed artwork, embedded
CMYK profile, and 300 DPI TIFF metadata. Browser checks reported no uncaught
page errors. GitHub and Netlify preview gates must also pass before release.
