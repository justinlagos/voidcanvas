# Boards, Cascade, Export and Zoom Quality: Plan

Date: 26 Sept 2026
Test file: R2 Banner 605x195cm (Black Diamond, Nigeria Independence Day)

## What is wrong today (from the code)

1. **Cascade is a blind scale.** `cascade.ts` moves every layer on its own: it keeps the layer's relative centre and scales it by "fit" or "cover". It knows nothing about groups, panels or hierarchy. The logo group falls apart (emblem in the middle, BLACK/DIAMOND letters blown up at the bottom), the Farfallino script gets "cover" scaled across the board, and the three panels pile on top of each other.
2. **Two layout engines.** A smarter role-based engine already exists (`adapt.ts`, used by Studio "Formats"), but Cascade does not use it. It also works layer by layer, so it breaks groups the same way.
3. **Cascade breaks groups and undo.** Copied layers keep the master's `groupId`, so one group spans several boards. Cascade then calls `loadFramed`, which wipes the undo history, so a bad cascade cannot be undone.
4. **Board placement.** New boards go in one long row at `y: 0` with a fixed 120px gap, whatever the size (tiny next to a 9850px banner). "Add a board" does the same. Nothing checks for overlap with existing boards or with content that spills outside a board.
5. **Duplicate is buried.** Only a small copy icon inside the Boards dialog. No on-canvas control.
6. **Export squashes boards.** PNG/JPG/WEBP/PDF render the whole pasteboard (every board plus the gaps) into one image. Size options are capped at 8192px on the long side of the whole pasteboard, so a wide set only offers 0.5x. PDF is one page. "Each board as PNG (zip)" renders the full pasteboard once per board, then crops: slow and hits canvas size limits.
7. **Export dialog is cluttered.** Five competing actions at the same weight; "Save editable file" is not an export; no way to choose boards.
8. **Blurry zoom.** The Stage renders the whole document into one canvas capped at 2000px on the long side, then stretches it to the screen. On a 9850px banner plus boards, each board is drawn at roughly 1/7 of its size, then scaled up. It also ignores the screen's pixel density, and switches image smoothing off at 3x zoom, which makes it blocky.

## 1. Cascade that re-lays the design properly

One layout engine for Cascade, Studio Formats and Resize. It works on **blocks**, not layers.

**Read the master's structure**
- A block is a top-level group, or a loose layer. Groups are never split. Everything inside a group gets one shared transform, so a logo or a text lockup stays exactly as designed.
- Find **panels**: blocks are clustered into columns (for wide designs) or rows (for tall ones) using the gaps between them and full-height images or shape panels as dividers. The Black Diamond banner reads as three panels: logo + offer, photo strip, Farfallino event.
- Rank blocks: logo, headline/offer, key image, supporting info, decoration. Existing role inference in `adapt.ts` feeds this, working on groups instead of single layers.
- Background layers and full-bleed panel fills are marked as "extendable" (they stretch or cover, never scale content with them).

**Lay out for the target**
- Similar shape: keep the arrangement, scale uniformly, keep edge margins.
- Much taller (story, square from a banner): stack the panels. Brand panel on top, image as a band, event panel below. Panel fills extend to the full width.
- Much wider (LinkedIn, X header): keep panels in a row, drop to the highest-ranked panels if a panel would go below a readable size.
- Minimum readable type per format (based on the board's short side). If something cannot stay readable, the lowest-ranked block is left out rather than shrunk to nothing, and the board notes what was left out so it can be added back.
- Everything stays inside the board with a safe margin (and inside the platform safe zones for stories and YouTube).

**Flow**
- In the Cascade tab, each picked size shows a **live preview thumbnail** before anything is created. Per format: "Include" chips for each panel, so you can switch one off.
- Created boards stay linked to the master (existing sync: text, colours, images follow the master; each format keeps its own layout).
- Cascade becomes one undoable step. Groups get new ids per board.

## 2. Tidy canvas placement

- One placement function used by Cascade, Add board and Duplicate.
- Cascaded formats sit in a row **below** the master, top-aligned, ordered by aspect (wide to tall), with a gap scaled to board size (about 8% of the median board side, never under 120px).
- Nothing is ever placed over another board or over content that spills past a board edge; the next free spot is used.
- "Organise boards" groups each master with its formats: master on one row, its formats on the row below.

## 3. Easy duplicate (as in Photoshop)

- When a board is selected, **+ buttons** appear on its top, right, bottom and left edges on the canvas.
- Click: duplicate the board with its content in that direction, with the standard gap. Neighbours on that side shift along so nothing overlaps.
- Option/Alt-click: add an empty board of the same size.
- Also: Cmd/Ctrl+D with a board selected, Option/Alt-drag the board name to drop a copy anywhere, and Duplicate in the board's right-click menu.
- Copies get their own group ids (already done in `duplicateFrame`) and the name "Square post copy", "copy 2" and so on.

## 4. Export, rebuilt

Every board is rendered on its own at its own size. No more pasteboard renders.

**Layout of the dialog (top to bottom)**
1. **Boards**: a thumbnail strip with numbers and names. Shortcuts: This board, Selected, All. A "Pages" field accepts `1-3, 5`. Designs without boards skip this row.
2. **Format**: PNG, JPG, WEBP, PDF, one line of help under the choice.
3. **Size**: 1x, 2x, 3x, or a custom width. Shown per board ("Square post 2160 x 2160"). For print sizes it shows mm and dpi.
4. **More options** (collapsed): quality, transparent background, file naming (number + name), PDF as one file or one file per board.
5. **One primary button** that states the result: "Download 4 PNGs (zip)", "Download PDF, 4 pages", "Download PNG". Copy image only appears for a single board.

**Output**
- Several images: zip, files named `01 Square post 1080x1080.png`.
- PDF: one file, one page per board, each page at its own size (print sizes at their real mm), in board order. Option for separate PDFs in a zip.
- "Save editable file (.void.png)" moves to File > Save a copy, with a small link at the bottom of Export.

## 5. Crisp at every zoom

- The Stage keeps the fast low-resolution preview only while you pan or zoom. When the view settles (about 120ms), it re-renders **just the visible area** at screen resolution (zoom x pixel density), so text and vectors are re-drawn sharp at any zoom.
- Images are drawn from their full-resolution source with high-quality smoothing. Hard pixels only at 8x and above (pixel-edit level), or when the pixel grid is on.
- The sharp view is cached and reused until the document changes or the view moves out of the cached area.
- Check the PSD import path: raster layers are capped at 4096px on import. For large print banners that cap is raised, or the layer keeps its source resolution for export.

## Order of work

1. Export rebuild (per-board render, board picker, multi-page PDF, new dialog). Fixes the squashing straight away.
2. Crisp zoom (viewport render).
3. Placement function, Cascade undo and group-id fixes, on-canvas + duplicate.
4. Block and panel layout engine, previews in the Cascade tab, then point Studio Formats and Resize at it.
5. Test on the R2 banner file, all 12 presets, plus a portrait flyer and a plain photo post. Unit tests for panel detection, placement (no overlaps) and page ranges; an end-to-end test that exports 4 boards as PNG zip and as a 4-page PDF.
