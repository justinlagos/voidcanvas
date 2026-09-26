# VoidCanvas Editor: Photopea-grade UX plan

Date: 23 Sept 2026. Status: Phases 1 to 4 built on branch `editor-ux-phase1-4` (23 Sept 2026). Not yet pushed or deployed.
Rule: nothing already built is removed. Every change below either moves, restyles or extends what exists.

## 1. Where we are today (from the repo)

- Layout: TopBar (logo, module nav, name, undo/zoom, search, Add, Export) > TabBar > OptionsBar > ToolRail (52px, left) + Stage + one right column (288px: Properties on top, Layers/History tabs below).
- Strong already: layers (raster, text, shape, adjustment), masks, clipping, groups (1 level), 16 blend modes, 60 live filters, boards, PSD/PDF import, brand kit, command palette, smart guides, autosave to IndexedDB, private mode, background removal, pen pressure, floating action bar.
- Gaps: no menu bar, fg/bg colour lives in the OptionsBar not the rail, no rulers/guides you drag out, no layer styles panel (only text outline and shadow), no pen/path tool, no smart objects, no Channels/Paths, history capped at 40, Canvas 2D engine tops out around 4000px, no PWA/offline, no crash recovery screen, no SVG export, no UI scale setting.

## 2. What Photopea gets right (to adopt)

From the screenshots:

1. Classic menu bar (File, Edit, Image, Layer, Select, Filter, View, Window). Pros find anything by muscle memory.
2. Tool options bar that changes per tool (Move shows Auto-Select, Folder/Layer, Transform controls, Distances, align icons).
3. Narrow tool rail with fg/bg swatches and quick mask at the bottom.
4. Right side: a collapsed icon strip (Info, Adjustments, Brush, Character, Paragraph, CSS, Image) that pops panels out, next to docked tab groups (History/Swatches, Layers/Channels/Paths).
5. Layers panel header: blend mode dropdown, Opacity, Lock row (pixels, paint, position, all), Fill.
6. Layers panel footer: link, fx, mask, adjustment, new group, new layer, delete.
7. Document tabs with an unsaved dot.
8. Dense, dark, neutral chrome so the image is the loudest thing on screen.

What we will not copy: the ad column (we give that width back to panels), the tiny fixed UI, the dated icon set, and the hidden-until-you-know-it discoverability.

## 3. New layout (Photopea structure, VoidCanvas polish)

```
[Logo] File Edit Image Layer Select Filter View Window Help      [Search ⌘K] [Share] [Export]
[tab: poster.psd •] [tab: flyer] [+]
[Tool options bar: context per tool, right side holds zoom % and undo/redo]
[Tool rail] [Rulers + canvas + status bar]            [Icon strip] [Docked panel stack]
                                                                    Properties / Adjustments
                                                                    Layers | Channels | Paths
                                                                    History | Swatches | Brand
```

Changes, in detail:

- **Menu bar**: added above the tabs. Every menu item is backed by the existing command palette registry, so one list of actions drives menus, palette and shortcuts. Module nav (Studio, Editor, Effects) moves into the logo menu to free space.
- **Top right**: keep Add and Export as the only filled buttons. Privacy lock and close move into File and the logo menu.
- **Options bar**: already exists; extend to full per-tool context (Move: auto-select layer/group, show transform controls, show distances, align/distribute icons; Brush: size, hardness, opacity, flow, smoothing, pressure toggles; Select: new/add/subtract/intersect, feather, anti-alias, Select Subject, Select and Mask).
- **Tool rail**: keep current tools and grouping. Add fg/bg swatches, swap and reset icons, and quick mask toggle at the bottom. Add long-press/right-click flyouts for tool families (Marquee: rect/ellipse; Lasso: free/polygon/magnetic; Heal: spot/patch/remove; Shape: rect/ellipse/polygon/line/custom). Rail can switch to 2 columns on tall screens.
- **Right side**: replace the single fixed column with a dock: an icon strip (Info, Adjustments, Brush, Character, Paragraph, Colour, Brand, Comments) plus resizable, collapsible, re-orderable tab groups. Panels can float or dock. Layout saved per user as a named workspace (Essentials, Photo, Design, Minimal), with Reset Workspace.
- **Layers panel**: adopt the Photopea header (blend, opacity, fill, 4 lock icons) and footer (link, fx, mask, adjustment, group, new, delete). Keep our drag reorder, clip indicator, rename, hide. Add thumbnails for masks next to layer thumbs, click to target mask vs pixels (Alt-click to view mask). Add filter/search by type and name.
- **Canvas**: rulers (Ctrl+R), drag-out guides, guide layouts (columns, gutters, margins), pixel grid at high zoom, status bar at bottom (doc size, zoom, colour mode, memory used, cursor x/y).
- **UI scale**: Settings > Interface: 90 to 150 percent, plus Compact/Comfortable density and a Large touch mode. This answers Photopea's number one UI complaint (tiny on high-DPI).
- **Floating action bar**: keep, but make it optional (Settings > Show contextual bar), since Photoshop users complain loudly about the contextual taskbar getting in the way.
- **Mobile/iPad**: keep the current bottom sheet, add a touch mode that uses pointer events only (no page scroll), two-finger undo, three-finger redo, and Pencil-only drawing with finger pan.

## 4. Designer complaints mapped to VoidCanvas

Sources: GitHub photopea/photopea issues, G2, Capterra, Trustpilot, AlternativeTo, Adobe Community, Figma forum, HN, review sites. Reddit could not be read directly, only via search snippets, so these are the themes that repeat across sites.

| # | Complaint (tool) | VoidCanvas answer | Status |
|---|---|---|---|
| 1 | Lost work on refresh or crash, no autosave (Photopea, Photoshop web) | Autosave exists. Add crash recovery prompt on reopen, version snapshots (every 10 min and on export), "Restore previous version" list | Partial |
| 2 | Chokes on large files, "Not enough RAM" (Photopea, GIMP) | WebGL tiled compositor, OPFS scratch storage for tiles and history, memory meter in status bar | New, big |
| 3 | Ads eat a quarter of the screen, adblock nags (Photopea, Pixlr) | No ads, ever. State it on the start screen | Have |
| 4 | Smart objects break, layer styles render wrong (Photopea) | Smart objects (embedded, nested, editable in a new tab), layer styles engine, import report listing anything not supported | New |
| 5 | Fonts silently replaced, spacing breaks (Photopea) | Missing-font dialog on open with substitute picker, embed local fonts in the project, keep a rendered fallback of each text layer | New |
| 6 | UI too small on high-DPI (Photopea) | UI scale and density settings | New |
| 7 | AI costs are opaque, credits burn on bad results (Photoshop, Canva, Affinity) | Local AI first (free, on device). Any cloud AI shows cost before running, no charge on failure, bring-your-own-key option | Partial |
| 8 | No offline, needs account (Photopea, Affinity via Canva) | Installable PWA, full offline, no account for local work | New |
| 9 | iPad: pen scrolls page, no pressure (Photopea) | Touch mode, pointer events, pressure and tilt | Partial |
| 10 | History too short, slows down, undo not clean (Photopea) | Configurable history (default 100), memory-bounded, snapshots, delete a step, history brush later | Partial |
| 11 | Contextual bar gets in the way, UI keeps moving (Photoshop) | Contextual bar optional, saved workspaces that never reset on update | New |
| 12 | Imprecise masking, no Select and Mask (Photopea, Canva) | Select Subject, Select and Mask workspace (edge brush, smooth, feather, contrast, shift edge, decontaminate), view modes | New |
| 13 | Inpainting weak or paywalled (Affinity, Photopea Magic Replace) | Free local object remover (LaMa-class model via WebGPU), plus current heal/clone | New |
| 14 | Export fails, stuck at 72 dpi, no slices (Photopea) | Correct DPI metadata, ICC embed, AVIF, ICO, SVG, Save for Web preview with file size, slices, export selected layers as assets | Partial |
| 15 | Batch needs same-size images, macros unreliable (Affinity) | Actions recorder plus batch over mixed sizes (fit, fill, pad rules) | New |
| 16 | No CMYK or soft proof (GIMP) | Soft proof (view as CMYK with a profile), CMYK PDF/TIFF export | New |
| 17 | Weak text: no paragraph box, no OpenType (GIMP, Krita) | Paragraph text boxes, Character/Paragraph panels, OpenType features, variable font axes, text on path | Partial |
| 18 | Levels/Curves lack black/white/grey pickers, HSL cannot target a band (Krita) | Add pickers and per-channel curves, targeted HSL with range slider and on-image drag | Partial |
| 19 | No non-destructive image editing in Figma, Canva locks layers in | Everything we already have, plus layered PSD export so work leaves cleanly | Partial |
| 20 | Pricing traps, auto-renew, save limits (Pixlr, Photoshop) | Free core, honest pricing page if Pro ever exists, no save limits | Have |

## 5. Pro features still missing (beyond complaints)

- Pen tool and Paths panel (bezier paths, path to selection, stroke/fill path, vector masks).
- Layer styles: drop shadow, inner shadow, outer/inner glow, stroke, colour/gradient/pattern overlay, bevel. Reorderable, stackable (fixes a Photoshop request).
- Smart filters on smart objects (our live filters already behave like this, so extend to any layer).
- Channels panel (view R/G/B/A, save selection as channel, load channel as selection).
- Transform modes: skew, distort, perspective, warp, free transform numeric fields, flip.
- More adjustments: gradient map, colour balance, selective colour, vibrance, exposure, channel mixer, photo filter, posterize, threshold, LUT (.cube).
- Liquify (forward warp, pinch, bloat) and puppet warp later.
- Content-aware scale and generative expand (local model where possible).
- Info panel (RGB/HEX/HSB under cursor, W/H of selection), histogram.
- Layer comps, linked layers, nested groups (currently 1 level).
- Export: layered PSD write (ag-psd supports writing), SVG for vector/text layers, GIF/APNG for simple frames.

## 6. Nice-to-haves that would set VoidCanvas apart

- One action list powering menus, palette, shortcuts and custom key mapping (remap any key, import Photoshop keyset).
- "Why is this greyed out" hints on disabled menu items.
- Before/after split view (we have hold \\; add a draggable split).
- Colour picker upgrade: HEX/RGB/HSL/OKLCH, eyedropper anywhere on screen (EyeDropper API), document colours, brand colours, contrast check.
- Asset library panel: brand kit, recent images, icons, shapes, saved styles.
- Comments pinned to canvas points (local now, shared later).
- Share link for review (later, needs backend).
- Plugin/script API in JS for power users.
- Performance HUD for us during development.

## 7. Build order

Each phase ships on its own and leaves the app working.

**Phase 1: Shell and layout (1 to 1.5 weeks)**
Menu bar, action registry, top bar clean-up, fg/bg on rail, tool flyouts, dockable right panels with icon strip, workspaces, UI scale and density, Layers panel header/footer, status bar, rulers and guides, contextual bar toggle.

**Phase 2: Trust and safety (1 week)**
Crash recovery, version snapshots, history limit setting and memory-bounded history, missing-font dialog and font embedding, import compatibility report, PWA offline install.

**Phase 3: Editing depth (2 to 3 weeks)**
Layer styles, pen tool and paths, transform modes, more adjustments with pickers, targeted HSL, Channels panel, paragraph text and Character/Paragraph panels, nested groups.

**Phase 4: Selection and AI (1.5 to 2 weeks)**
Select Subject, Select and Mask workspace, local object remover, generative expand, AI cost transparency layer.

**Phase 5: Engine (2 to 3 weeks)**
WebGL tiled compositor, OPFS tile and history storage, large-file handling past 10,000px, memory meter. Done after the UI so we are not rebuilding panels on a moving engine.

**Phase 6: Output and automation (1.5 weeks)**
Layered PSD export, smart objects, SVG/AVIF/ICO, DPI and ICC, Save for Web with slices, soft proof and CMYK export, actions and batch.

**Phase 7: Nice-to-haves** as time allows.

## 8. Decisions (agreed 23 Sept 2026)

1. Menu bar: add the full Photopea-style menu bar, driven by one action registry shared with the command palette and shortcuts.
2. Right side: dockable and floating panels, icon strip, saved workspaces.
3. Scope for the first build run: Phases 1 to 4 (layout, trust, editing depth, selection and AI).
4. Engine: WebGL tiled compositor in Phase 5, after the UI settles.

## 9. Build status (23 Sept 2026)

Built and browser-tested on branch `editor-ux-phase1-4` (3 commits, 42 files, about 6,100 lines added). `next build` passes. Playwright checks: menus, dock workspaces, UI scale, shapes, paragraph text, layer styles, warp, pen paths, guides, quick mask, dodge, channel view, versions, canvas rotation, PSD import with report and missing-font dialog, mobile layout, and the on-device models (LaMa remove object, MODNet select subject and object select) all ran with no page errors.

Done beyond the plan: modal queue for automatic dialogs, shortcut sheet generated from the action list, file handling for the installed app, number keys set opacity, two and three finger taps for undo and redo.

Not done in this run (next): text on a path, liquify, Phase 5 WebGL engine, Phase 6 export work (PSD and SVG export, smart objects, Save for Web, CMYK).

Push was blocked: this session had no GitHub credential for justinlagos/voidcanvas. The work was handed over as a git bundle and a patch.
