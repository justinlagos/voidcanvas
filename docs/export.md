# Export and coming back

Phase 6 of the workflow plan (`plans/workflow-reliability-2026-09-28.md` in the Claude project). Code:
`src/editor/components/ExportDialog.tsx`, `src/editor/io.ts` (`exportBoards`, `exportSelection`, `noteExport`,
`exportProjectPng`, `duplicateAsVariation`), `src/editor/svg-export.ts`, `src/studio/brand-pdf.ts` (`assemble`,
`flateRgb`), `src/editor/export.ts` (names, sizes, `alsoNeeded`), `src/editor/components/AfterExport.tsx`,
`src/lib/desk.ts` (Home lines), `src/editor/workflow.ts` (analytics). Tests: `e2e/export-return.mjs`,
`src/lib/__tests__/desk.test.ts`, `src/editor/__tests__/boards.test.ts`.

## The dialog

- What: the boards (This board, All N, a range, thumbnails), or **Selected layers** when layers are selected.
- Where it is going: PNG · Social, PNG · Transparent, JPG · Web, PDF · Print (lossless), PDF · Client proof.
- File type: PNG, JPG, WEBP, PDF, SVG. Size: 1× to 4× within the browser's canvas limits.
- More options: quality (JPG, WEBP, PDF with JPEG pages), transparent background (PNG, WEBP, SVG), lossless
  pages (PDF), one PDF or a PDF per board, numbered files, and the file name pattern.
- Preflight (boards, not SVG or a selection), then Download and Copy (one file, not SVG).

## Remembered choices and the export record

`doc.exportPrefs` is written on every board export (not a selection export, which is a one-off) and the dialog
opens from it. A design never exported starts from the last choices used in this window, with the active board.
`boards: 'all'` picks every board next time, new ones included.

`doc.exports` keeps the last 20 exports. Neither is an undo step, and neither moves the design's "edited" time:
undo, redo and restoring a version keep the current record and choices (`store.jumpTo`, `restoreSnapshot`,
`versions.restoreVersion`). A template or a variation starts with an empty record. Phone exports and exports
from the start screen are recorded too.

"Edited" (`ProjectSummary.editedAt`) moves only on an undo step or an undo (`st.history` or `st.historyIndex`
changing). Fonts arriving after a design opens rewrite text layers but are not an edit. A design saved before
this existed takes its last save time.

## File names

`boardFileName(board, index, total, format, scale, numbered, pattern, design, date)` with the pattern
`{design}_{board}_{w}x{h}` by default. Parts: `{design} {board} {n} {w} {h} {scale} {date}`. `{w}` and `{h}` are
output pixels. A board name that already holds its size drops `{w}x{h}`. Several files in a zip get `{n}_` in
front unless the pattern has `{n}`. Names are cleaned of characters file systems refuse and made unique.

## A selection

`selectionExtent()` takes the selected visible layers (adjustments included, for what they do to the layers
under them), their bounds grown by how far their effects, styles, text shadows and parent group effects reach,
and a name (the layer, a whole group, or Selection). `exportSelection` renders only those layers over that
area with `inner: true` (no board or design effects) and no board clip, trims to the pixels, and writes the
format. Switching to Selected layers turns transparency on.

## SVG

`svgFor({ doc, layers, groups }, { region, board, scale, transparent, background, pageFx, localFonts, googleFonts })`.
The file keeps document units in its `viewBox` and states the output size in `width` and `height`. Everything is
inside a clip to the region and a translate to its corner.

| On the canvas | In the SVG |
|---|---|
| Text layer | `<g transform>` with `<text xml:space="preserve">` and a `<tspan>` per line, using the engine's line layout, baseline and alignment rules; justified lines place each word. Font family, size, weight, italic, letter and word spacing, small caps, stretch, kerning off, colour. Underline and strike as rectangles |
| Shape | `<rect rx>`, `<ellipse>`, `<line>`, `<polygon>` or `<path>` (pen paths with `fill-rule="evenodd"`), with fill, stroke, width, caps, joins and dashes |
| Raster layer | `<image>` with its mask and vector mask applied; JPEG 0.95 when solid, PNG when see-through |
| Group | `<g>` with opacity and blend (`mix-blend-mode`) |
| Layer blend mode | `style="mix-blend-mode:…"` |
| Effects, styles, masks on type or shapes, clipping, text on a path, text shadow or outline, path operations, inside or outside strokes; a group with effects, styles, a mask or an adjustment inside | the engine draws that layer or group alone, trimmed, as an `<image>` in place |
| Adjustment layers | everything up to the topmost visible adjustment (to the end of its outermost group) is one image, with the board colour |
| Board or design effects | the whole board is one image |

Element ids come from layer and group names (unique). Built-in fonts are asked for with `@import` from Google
Fonts the way the Editor asks for them; any other family one style at a time; fonts added from files are
embedded as `@font-face` data. Fonts from `@import` load when the SVG is opened as a page or in a design tool,
not when it is shown through `<img>`.

## PDF

`assemble(pages, withFont)` writes one image per page. A page carries `jpeg` (DCTDecode) or `flate`
(FlateDecode): `flateRgb(canvas)` draws the board on white and deflates RGB rows in bands with
`CompressionStream('deflate')` (zlib format, which FlateDecode reads). PDF · Print turns lossless on; PDF ·
Client proof and a plain PDF use JPEG at 90 or more. Page size per board: 300 dpi when the long side is over
2000 px, else 96 dpi.

## After an export

`vc:exported` (`{ format, boards, files, what, name }`) shows the card in the corner (desktop). It goes after
25 s unless the pointer or focus is on it, when another design opens, or once a choice is used.
`alsoNeeded(doc)` gives boards never exported (a click opens Export with them), and for a design outside a
Studio job up to three sizes from the same family as the exported master that the design does not have (a
click runs Cascade from that board). Use this again: Save as template, Duplicate as variation (File menu too:
a full copy named "Name variation 2", opened in a tab beside it, with an empty export record).

## Coming back

Home (`StartScreen`) and the landing page list designs under "Pick up where you left off" with a line from
`designStatus(summary, job)`:

| Line | When |
|---|---|
| Not exported yet | edited in the last 30 days, never exported |
| N of M formats exported | some boards exported (selection exports do not count) |
| Changed since export | edited after the last export |
| Exported 2 hours ago | every board exported, unchanged since |
| Waiting for client, Changes asked, Approved, ready to deliver, N comments open, Delivered | the design's Studio job, from its newest version (`jobStatus`) |

A count beside the heading: designs, client brands, templates, exports, only those there are. Export PNG(s) on
a card renders each board without opening the design, by the design's name pattern, and records it.
`ProjectSummary` carries `editedAt, boards, exportedBoards, exports, lastExport, jobId` for this.

## Analytics

See `supabase/analytics.md`: `doc.open` with `from`, `doc.resume`, `storage.full`, `activation`, `workflow`,
`version.make`, `version.restore`, `template.save`, `template.use`, `variation.make`, `after_export`.
Workflows count once per design per browsing session (`sessionStorage` `vc-workflows`).
