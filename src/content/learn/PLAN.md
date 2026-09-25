# Learn library plan

Every article lives in one of the group files below as `export const articles: Article[]` (type in `src/content/types.ts`).
Link between articles with `[label](/learn/<slug>)` using only slugs from this list.

## start.ts  (category 'start', plus 'help' articles)
- what-is-voidcanvas: What Voidcanvas is, the three modules, how they pass work
- your-first-design: Make and export a first design in five minutes
- saving-and-your-files: Where designs live (IndexedDB), autosave, templates, clearing data, backups by export
- moving-work-between-tools: Handoff from Effects/Studio/quick tools to the Editor, Open in Editor, the inbox
- install-as-an-app: Install to home screen / dock, offline use
- designing-on-a-phone: The mobile Editor, touch gestures, pinch zoom, pen pressure, what differs
- privacy-and-data (help): Exactly what is and is not sent, usage counts, turning them off
- private-session (help): What a private session does, when to use it, Delete all my data
- troubleshooting (help): Fonts, exports, storage, performance, big files, what to try
- browser-support (help): Browsers and devices, WebGPU/WASM notes for the background model
- report-a-bug-well (help): How to write a useful bug report, what is attached automatically

## editor-core.ts  (category 'editor')
- editor-tour: The Editor layout: menu bar, tool rail, options bar, dock, panels, status bar
- layers: Layers: kinds, order, lock, hide, rename, duplicate, merge, colour labels, find
- groups-align-guides: Groups, multi-select, align and distribute, smart guides, snapping
- masks: Masks: paint to show and hide, quick mask, mask from selection
- blend-modes-and-opacity: Blend modes, opacity and fill, when to use which
- selections: Marquee, lasso, magic wand, add/subtract/intersect, select subject if present, feather
- type: Type on the canvas, fonts (Google and local), character and paragraph, outline and shadow
- shapes-and-pen: Shapes, polygons, stars, the Pen tool and paths
- brand-kit: Brand kit: colours, fonts and logos ready in every design
- colour-and-swatches: Colour picker, main and second colour, swatches, eyedropper, gradients, fill

## editor-image.ts  (category 'editor')
- adjustment-layers: Curves, levels, hue/saturation, brightness/contrast, temperature, B&W, invert, blur as layers
- filters-in-the-editor: Filter gallery, filters as layers, stacking, masking, fading, preview vs export size
- layer-styles: Drop shadow, outline/stroke and the other layer styles
- retouching: Brush, eraser, heal, clone stamp, smoothing, pressure, flow
- remove-background: On-device background removal, the model download, refining the mask
- crop-and-canvas: Crop, canvas size, image size, rotate and flip
- ai-on-this-device: Other on-device AI tools if present in src/editor/ai-tools.ts

## editor-output.ts  (category 'editor')
- artboards: Boards / artboards: add, move, resize, close, delete
- resize-to-every-format: Resize one design to every preset, ZIP download, save each as a design
- import-psd-and-pdf: What PSD import keeps and what it doesn't, PDF pages as layers, other import formats
- export-for-screen: PNG, JPG, WebP, scale, transparency, copy to clipboard
- export-for-print: PDF at 300 dpi, bleed and crop marks, what to ask the printer
- templates-and-versions: Save as template, versions if present
- history-and-undo: Undo depth, History panel, jumping back, before/after with backslash
- command-palette-and-menus: Ctrl+K, menus, the ? sheet, finding any action
- workspaces-and-panels: Dock, tab groups, floating panels, workspaces, preferences

## studio.ts  (category 'studio')
- studio-overview: What Studio is for and how a job moves: direction, design, review, delivered
- start-a-job-from-a-brief: Paste a brief, what the reader proposes, seeding a design
- references-and-palettes: Reference boards, palette pulled from images, locking colours
- directions-and-review: Directions, sending for review, recording the client's answer, changes
- delivering-files: Delivery list, naming and versioning, handing over
- brands-library: Saving brands and reusing them across jobs
- brand-guidelines: The brand guideline builder: ramps, contrast, type scale, logo rules, lock and new take
- brand-guideline-exports: Every export: screen PDF, print PDF, HTML handoff, CSS, Tailwind, tokens JSON, .ase, Editor layers

## effects.ts  (category 'effects')
- effects-overview: Using Effects: load, pick, tune, randomise, compare, export, send to Editor
- artistic-effects: Every artistic effect and its settings
- stylise-effects: Every stylise effect and its settings
- colour-effects: Every colour effect and its settings
- distortion-effects: Every distortion effect and its settings
- texture-effects: Every texture effect (and any other category) and its settings
- quick-tools: The Halftone, Dither and Glitch quick tools

## craft.ts  (category 'craft')  General design education, tied to the tools
- typography-fundamentals: Hierarchy, pairing, size, measure, leading, tracking
- colour-that-works: Palettes, OKLCH ramps, contrast and WCAG 2.2, colour on screen vs print
- layout-and-composition: Grids, alignment, space, focal point, reading order
- image-resolution-explained: Pixels, dpi, scaling, why things look soft, file size
- designing-for-print: Bleed, trim, safe area, 300 dpi, RGB vs CMYK, paper, proofing
- designing-for-social: Formats, safe zones, legibility on phones, series design
- building-a-brand-identity: From brief to logo, colour, type and rules

## workflows.ts  (category 'workflows')  End-to-end recipes, every step in the product
- workflow-event-poster: An event poster from photo to print-ready PDF
- workflow-social-campaign: One launch post in every social format
- workflow-print-flyer: An A5 flyer with bleed for the printer
- workflow-client-brand-guideline: A brand guideline for a client, from logo to handoff
- workflow-portrait-retouch: Retouch a portrait non-destructively
- workflow-psd-to-social: Take a PSD from a colleague and adapt it
- workflow-textured-print-look: A risograph or screen-print look with Effects and the Editor

## reference.ts  (category 'reference')
- keyboard-shortcuts: Every shortcut, generated from src/editor/actions.ts and Stage tool keys
- size-presets: Every size preset with pixel size and use
- file-formats: Every format you can open and export, and what each keeps
- glossary: Design and product terms used in Voidcanvas
