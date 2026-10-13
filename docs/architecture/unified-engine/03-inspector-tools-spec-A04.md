# A04 — Context-Aware Inspector + Unified Tool Interaction Spec
Principle: tool changes expose applicable capabilities, never app transitions. Selection identity, zoom, history, inspector state persist.

## Universal tools (single rail, families via long-press/shortcut)
Select/Move (V) · Node/Direct (A) · Pen incl. Curvature/Freeform (P) · Shape family (U) · Text (T) · Brush family incl. Heal/Clone/Dodge/Burn/Sponge (B/J) · Select-Region family (marquee/ellipse/lasso/poly/wand/object) (M/L/W) · Crop (C) · Hand (H)/Zoom (Z) · Eyedropper (I). Generate/Search are contextual asset actions (see 07), not modes. Existing `ToolId` in `types.ts` already covers this set — no new tool modes.

## Capability registry (Sprint B01, no duplication)
`capabilityRegistry`: `{ nodeKind, toolId, editTarget } -> control descriptors`. Reuse existing panels (Properties, Character/Paragraph, Layers, Channels/Paths, Adjustments, Layer styles, Brand kit) by wiring them to descriptors. No panel clones per discipline.

## Inspector rules
- Responds to (selection + active tool + edit target). Simple controls upfront, details progressively disclosed.
- Edit-target badge (object / mask / pixel-contents / story / symbol-instance) + scope badge (layer / selection / group / board / page / document) — unobtrusive, always visible. Missing today; Sprint B UI slice.
- Top-5 likely actions on selection (extend `FloatingBar.tsx`); full power stays in command palette (`actions.ts`, Ctrl+K). Same command id everywhere (menu/canvas/shortcut/palette).
- Focus presets (Essentials, Vector, Photo, Typography, Publication, Production): dock layout + promoted tools ONLY. Must not switch file type, pipeline, eligibility, or route. Map existing workspaces: Essentials→Essentials, Photo→Photo, Design→Vector+Publication split, Minimal stays. Add Typography/Publication/Production presets in Sprint B without touching renderer/store.

## Touch / phone / tablet / desktop
Phone: stable canvas + bottom sheet (extend `MobileEditor.tsx` / `phone-ui.tsx`), not shrunken desktop. Tablet: 44px targets, pen-vs-touch (fingers pan). Desktop: keyboard-first, precise pointer, panels. Reuse `touch.ts`, Interface-size prefs; canvas never scaled by UI zoom.

## Acceptance (Sprint B)
Vector/image/text editing from one surface with no selection/zoom/history reset between types; `actions.ts` gains capability/precondition/scope metadata; regression e2e extends `editor-tools-boards.mjs` + `editor-muscle-memory.mjs`.
