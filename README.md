# Voidcanvas

**Your files don't leave your browser.** Edit locally, no cloud, no account, private by default. Projects are stored only in the browser via IndexedDB. The only outbound calls are web fonts (Google Fonts) and a one-time background-removal model download; neither sends any image or design. A **private session** mode keeps everything in memory (nothing written to disk) for shared computers, and **Delete all my data** wipes the local database.


One app, three modules. Each works alone and they pass work to each other.

| Route | Module | What it does |
|---|---|---|
| `/` | Hub | Entry point and recent designs |
| `/studio` | Studio | Brief, reference board, palette pulled from references, size preset. "Start design in Editor" opens it all as a design. |
| `/editor` | Editor | Layered image editor: raster, text, shape and adjustment layers, masks, 16 blend modes, selections, retouching, 60 live filters, export. |
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
- Brand guideline builder: a full landscape deck or portrait document, 8 designed pages (cover, principles, logo, colour with usage ratios, type specimens, real mockups, voice, close), three art directions chosen per build so no two match. Page-by-page preview. Exports a real multi-page PDF or opens in the Editor as layers.
- Masks on any layer, painted with Brush (show) and Eraser (hide). "Remove background" creates a mask, so nothing is destroyed.
- Adjustments as layers: curves, brightness and contrast, hue and saturation, temperature, levels, black and white, blur, invert.
- All 60 Void effects as live filter layers. They always compute at max 1200px so preview, export and the Effects tool match.
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

- Groups are one level deep. No smart objects, though image layers keep full resolution through any resize until you paint on them.
- Heal and clone are patch based, not generative.
- Background removal: fast people model everywhere, plus an any-subject model (BiRefNet lite, MIT, 115 MB) that needs WebGPU. The any-subject path has not been tested on a real GPU browser yet.
- Canvas 2D engine. Fine to around 4000px; a WebGL compositor is the next step for very large documents.
- Templates are local. Accounts, cloud sync, the community gallery and Artie's live brief analysis come with the Art Director Studio port (Supabase). ADS is a Vite/React/Supabase app; its edge functions (process-brief, artie-chat, community) are the pieces to bring over.
- No PSD import or SVG export yet.
- Resize scales backgrounds to cover and keeps other layers in place; very different aspect ratios may still need a nudge by hand.

## License

MIT
