# Voidcanvas

**Your files don't leave your browser.** Edit locally, no cloud, no account, private by default. Projects are stored only in the browser via IndexedDB. The only outbound calls are web fonts (Google Fonts) and a one-time background-removal model download; neither sends any image or design. A **private session** mode keeps everything in memory (nothing written to disk) for shared computers, and **Delete all my data** wipes the local database.


One app, three modules. Each works alone and they pass work to each other.

| Route | Module | What it does |
|---|---|---|
| `/` | Hub | Entry point and recent designs |
| `/studio` | Studio | Brief, reference board, palette pulled from references, size preset. "Start design in Editor" opens it all as a design. |
| `/editor` | Editor | Layered image editor: raster, text, shape and adjustment layers, masks, 16 blend modes, selections, retouching, 58 live filters, export. |
| `/effects` | Effects | The original one-click effects tool. "Open in Editor" sends the result across. |

Everything is stored on the user's device (IndexedDB database `voidcanvas`). No backend yet.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Deploys to Netlify as before. No new npm dependencies were added.

## Editor

- Layers: image, text, shape, adjustment. Reorder by drag, rename, lock, hide, duplicate, merge down.
- Multi-select (Shift-click), move together, align to each other or the page, groups with their own visibility and opacity (Ctrl+G).
- Smart guides: layers snap to the page and to each other's edges and centres.
- Type directly on the canvas. Double-click or press Enter on a text layer.
- Command palette (Ctrl+K): every tool, adjustment, filter and action, searchable.
- Resize to every format: pick Instagram, Story, YouTube etc., download all as a ZIP or save each as its own design. Backgrounds cover, everything else keeps its place.
- Brand kit: colours, fonts and logos saved once, ready in every design and in the Add menu.
- History panel with named steps; click any step to jump back.
- Hold \\ to see the design before adjustments and filters.
- Drag any slider's label sideways to scrub the value (Shift for big steps).
- Floating action bar above the selected layer with its most likely next actions.
- Filter gallery previews every filter on your own image.
- Text outline and drop shadow.
- Templates: save any design as a reusable template; opening one makes a fresh copy.
- Export to PDF (300 dpi for print sizes) alongside PNG, JPG, WebP.
- First-time tips that teach, shown once.
- ? opens the shortcut sheet.
- Import PSD (keeps layers, groups, opacity, blend modes) and PDF (each page becomes a layer).
- Studio brief reader now proposes a colour direction, palette and type feel, and opens a design pre-seeded with them (local now, swaps to live Artie once Supabase is wired).
- Brand guideline builder: a token-based brand system. Every value can be set and locked; New take only changes what is unlocked. OKLCH 50 to 900 ramps, semantic colours, WCAG 2.2 contrast pairings, modular type scales, any Google font or a local font file that never leaves the browser. Logo analysis trims and knocks out flat backgrounds, tests the mark's outer edge against every background and picks full colour, reversed or dark mono. Clear-space blueprint and minimum size page. Page outliner: drag or arrow to reorder, include or leave out, and switch layouts (Alt-click a thumbnail to cycle). Exports: screen PDF, print PDF (300 dpi, 3 mm bleed, crop marks, TrimBox and BleedBox), a self-contained HTML handoff with arrow-key pages, logo downloads and click-to-copy colours, Editor layers, CSS, Tailwind, design tokens JSON and Adobe .ase.
- Masks on any layer, painted with Brush (show) and Eraser (hide). "Remove background" creates a mask, so nothing is destroyed.
- Adjustments as layers: curves, brightness and contrast, hue and saturation, temperature, levels, black and white, blur, invert.
- All 58 Void effects as live filter layers. Previews compute at 1200 px so the Editor and the Effects tool match; exports run at full size with pixel settings scaled up, so they look the same, only sharper.
- Tools: move/resize/rotate with snapping, crop, text, shape, brush, eraser, fill, gradient, heal, clone stamp, rectangle/ellipse/lasso select, magic wand, eyedropper, pan, zoom. Pen pressure and pinch zoom supported.
- 40-step undo, autosave, PNG/JPG/WebP export at 0.5x to 3x, transparent export, copy to clipboard, paste and drag-drop import.
- Shortcuts follow Photoshop: V B E S J M L W G T U I C H Z, Ctrl+Z, Ctrl+J, Ctrl+D, [ ], Space to pan.

### Code map

```
src/editor/types.ts     layer and document types
src/editor/engine.ts    compositor, adjustments, brush tip, flood select, heal, palette
src/editor/store.ts     zustand store: document, layers, masks, selection, history
src/editor/io.ts        IndexedDB, module handoff, import, export, fonts
src/editor/ai.ts        in-browser background removal (transformers.js + MODNet, both Apache-2.0, loaded from CDN on first use)
src/editor/components/  Stage (canvas + all tool logic) and UI
src/studio/             Studio module
src/components/AppNav   shared logo and module switch
```

Handoff between modules: `sendHandoff()` writes images, palette and size to the `inbox` store, then routes to `/editor?inbox=<id>`.

## Editor layout (Photopea-style, September 2026)

The editor now follows the layout designers know from Photoshop and Photopea, without losing anything that was here before.

- **Menu bar**: File, Edit, Image, Layer, Select, Filter, View, Window, Help. Menus, the command palette (Ctrl+K), the shortcut sheet (?) and keyboard shortcuts all read from one action list in `src/editor/actions.ts`, so a command is written once and shows the same name and shortcut everywhere. Alt on its own focuses the menu bar.
- **Tool rail** with tool families (right-click or long-press a tool; Shift plus its key cycles the family), main and second colour chips with swap and reset, and a quick mask toggle (Q).
- **Options bar** changes with the tool: auto-select, transform controls and distances for Move; size, hardness, opacity, flow, smoothing and pen pressure for brushes; new, add, subtract and intersect for selections; points and star depth for polygons; apply and cancel for transforms.
- **Dock**: an icon strip plus tab groups you can reorder, resize, collapse, merge by dragging tabs, or pull out as floating windows. Workspaces: Essentials, Photo, Design, Minimal, plus your own (Window, Workspace).
- **Panels**: Properties, Layers, Channels, Paths, History, Colour and swatches, Adjustments, Character, Paragraph, Layer styles, Info (with histogram), Navigator, Brand kit.
- **Layers panel**: blend, opacity, four locks (transparent pixels, pixels, position, all) and fill at the top; link, fx, mask, adjustment, group, new and delete at the bottom; right-click menu; colour labels; find by name or kind; nested groups; Ctrl-click a thumbnail to select its pixels; Alt-click an eye to show only that layer.
- **Rulers and guides** (Ctrl+R, Ctrl+;): drag from a ruler, drag back to delete, guide layouts, snapping to guides. Pixel grid past 800%.
- **Status bar**: editable zoom, size, pointer position, memory in use, save state.
- **Interface size and density** (Window, Interface size, or Preferences): 80 to 160 percent, compact or comfortable. The canvas is never scaled. **Touch mode**: bigger controls; with a pen, fingers pan instead of painting; two-finger tap undoes, three-finger tap redoes.

## Never lose work

- Autosave as before, plus a save whenever the tab is hidden.
- **Crash recovery**: if the browser or tab closes unexpectedly, the start screen offers to reopen every design that was open.
- **Version history** (File, Version history; Ctrl+Alt+S saves one): automatic versions every few minutes while you work and on every export, kept on this device, restorable in place or as a copy.
- **History**: 100 steps by default, adjustable, and bounded by a memory budget so the browser never runs out. Delete a single step, or pin named snapshots.
- **Missing fonts**: opening a design or PSD with fonts that are not available shows which ones and on how many layers, with a replacement picker or a font file you add. Fonts added from files are saved inside the design.
- **Installable and offline**: a service worker caches the app after the first visit, and the manifest makes it installable, with file handling for images, PSD and .void.

## Editing depth

- **Layer styles**: drop shadow, inner shadow, outer glow, inner glow, stroke (outside, centre, inside), colour overlay, gradient overlay, bevel and emboss. Every effect has its own blend mode and opacity, they can be reordered by dragging, and fill opacity fades the layer while keeping its effects. Copy, paste and clear. Presets in the Layer styles panel. Rendering is canvas-only (shadow blur plus an alpha pass), so it works in Safari too (`src/editor/styles.ts`).
- **Pen tool and paths**: corners and curves, close by clicking the first point, direct selection to move points and handles, Alt-click to switch corner and smooth. Paths panel: make selection, fill, stroke, shape layer, layer mask, and trace a path from a selection.
- **Transform**: free transform (Ctrl+T), skew, distort, perspective and warp, with a live preview.
- **Image**: image size, canvas size with anchor, rotate and flip the whole canvas, crop to selection, trim, flatten, merge visible, stamp visible.
- **Adjustments**: new exposure, vibrance, colour balance, channel mixer, photo filter, gradient map, posterize, threshold and .cube LUT. Levels and curves work per channel; levels has black, grey and white pickers; hue and saturation can target one colour range, picked on the image.
- **Channels panel**: view red, green or blue alone (Ctrl+3 to 5), save selections as channels, and Ctrl-click to load any channel as a selection.
- **Type**: paragraph text boxes that wrap (drag with the Type tool), justify, first-line indent, paragraph spacing, underline, strikethrough, all caps, small caps, kerning, word spacing, baseline shift and width. Character and Paragraph panels.
- **Brushes**: flow, smoothing, pen pressure for size and opacity, lock transparent pixels. Dodge, burn and sponge. Number keys set opacity.
- **Selections**: polygonal lasso, colour range, expand, contract, feather, smooth, border, reselect, intersect mode, and edit the selection as a quick mask.
- **Clipboard**: copy, cut, copy merged, and paste in place.

## AI on your device

All AI runs in the browser. Nothing is uploaded and nothing is charged. The first use of each model shows its download size (Help, AI on this device lists every model, its size and licence, and can remove them).

- **Select subject** and **Object select** (draw a box) use MODNet, or BiRefNet lite when WebGPU is available.
- **Select and mask** (Ctrl+Alt+R): refine edge brush, add and subtract brushes, radius, smooth, feather, contrast, shift edge, colour fringe clean-up, with output to a selection, a layer mask or a new layer.
- **Remove object** (Shift+J): paint over something and it is filled in by LaMa (Apache-2.0, 208 MB once) through ONNX Runtime Web, using WebGPU where possible. If the model cannot load, it falls back to patch healing.
- **Expand with AI fill** (Image menu): enlarge the canvas and fill the new edges.

## PSD import

PSDs now keep much more: nested groups with their blend modes, layer masks, clipping, editable text (point and paragraph, when the text uses one style), adjustment layers (brightness and contrast, levels, curves, exposure, vibrance, hue and saturation per range, colour balance, black and white, photo filter, channel mixer, invert, posterize, threshold, gradient map), layer styles, locks and colour labels. Anything that cannot be rebuilt is kept as pixels, and a report lists exactly what was kept, changed or left out.

## Navigation and zoom

Fit to screen (Ctrl+0), fit selection (Shift+2), and fit board (Shift+1, when the doc uses boards) join the existing zoom in/out, 100%, wheel/trackpad zoom (Ctrl/Cmd+wheel), two-finger pan, spacebar-drag and middle-mouse pan. Fit to screen always brings all work back into view, so artwork is never lost off-screen.

## Tooltips and shortcuts

Every tool and icon button shows a styled tooltip after a short hover delay, with the action name and a shortcut keycap. The floating action bar now sits clear of the rotate handle above a selected element, flipping below the element when there is no room above.

## Precision and distribution

Selecting a single layer shows X, Y, W, H numeric fields for exact positioning and sizing (type a value, press Enter). Selecting three or more layers adds Distribute horizontally / vertically alongside the existing align controls. Clipping masks now support multiple layers sharing one base.

## Clipping masks

Select a layer and choose Clip to below (floating bar, the Layers-panel scissor button, or Alt+Ctrl/Cmd+G) to clip it to the layer directly beneath: it shows only where that base layer is opaque. The clipped layer moves and resizes non-destructively inside the base, and Release clip restores the full layer. Clipped layers appear indented under their base with a clip indicator.

## Tool pages

Standalone, SEO-friendly single-purpose tools at `/tools/<name>`, built on the effects engine and sharing the privacy model (image never leaves the browser). First three: `/tools/halftone`, `/tools/dither`, `/tools/glitch`. Each: upload, live preview, controls, reset, download PNG, and Open in Editor (hands the result to the editor as a layer). Linked from the hub, listed in sitemap.xml.

## Boards, tabs, cascade

- The editor supports **artboards** (called boards): multiple frames on one infinite canvas, each with its own layers. Drag a layer across a board boundary and it joins that board. Purely additive: a plain single-canvas design is unchanged.
- Brand guidelines open in the editor as one board per page. PSD files whose top level is layer groups import as one board per group.
- **File tabs** across the top with close buttons; a close-to-home button returns to the splash page. Switching tabs saves the current design.
- **Boards panel** (grid icon) to add, rename, delete boards and to **cascade**: take one board and lay it out at every touchpoint you pick (Instagram, Story, YouTube, LinkedIn, print) as new boards in one click.
- Export any single board, or every board as its own PNG in a zip.

## Studio

Studio can now read a pasted brief and pull out audience, tonal keywords and must-haves. This is a local stand-in shaped exactly like Art Director Studio's `process-brief` function, so it swaps for the real Artie call once accounts and Supabase are wired. The must-haves ride along in the handoff to the Editor.

## Known limits

- No smart objects yet: PSD smart objects open as pixels. Image layers keep full resolution through any resize until you paint on them.
- Heal and clone are patch based, not generative.
- Background removal: fast people model everywhere, plus an any-subject model (BiRefNet lite, MIT, 115 MB) that needs WebGPU. The any-subject path has not been tested on a real GPU browser yet.
- Canvas 2D engine. Fine to around 4000px; a WebGL compositor is the next step for very large documents.
- Templates are local. Accounts, cloud sync, the community gallery and Artie's live brief analysis come with the Art Director Studio port (Supabase). ADS is a Vite/React/Supabase app; its edge functions (process-brief, artie-chat, community) are the pieces to bring over.
- No PSD or SVG export yet.
- Resize scales backgrounds to cover and keeps other layers in place; very different aspect ratios may still need a nudge by hand.

## License

MIT

## Checks

- `npm test`: unit tests (the brief reader).
- `npm run build && npm run e2e`: 151 browser checks at desktop, tablet and phone sizes, one per QA bug and per UX phase (needs Playwright's Chromium; `npx playwright install chromium` once).
