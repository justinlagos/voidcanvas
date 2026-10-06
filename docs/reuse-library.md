# Reuse library

The Reuse Library is VoidCanvas's local-first system for carrying useful creative decisions across designs without flattening them or silently changing existing work.

It started with Looks and text styles in Phase 7A. Phase 7B extends the same model to logos, images, textures, colours, fonts and templates, then adds cross-design dependency awareness.

## Looks

Select a layer or a whole group in the Editor and open **Reuse**. **Look** keeps the reusable appearance of that target.

For a layer it can keep:

- opacity and blend mode
- fill opacity and layer styles
- the ordered live effect stack
- text appearance when the source is text
- shape appearance when the source is a shape

For a selected group it saves the **group composite** treatment: group opacity, compositing/blend behaviour, group styles and the group's ordered effect stack. It does not copy the same effect onto every child.

A Look does **not** keep source content, position, identity, effect links or effect masks. Effect masks are tied to the geometry of the layer/group where they were painted, so carrying them into another target would be unsafe. Applying a Look creates fresh effect IDs and no shared links back to the source.

Applying a Look is undoable. The target keeps its own content and placement.

## Text styles

When exactly one selected layer is text, **Text style** stores typography only: font, size, weight, italic, colour, alignment, line height, letter spacing, paragraph settings, underline/strike/caps, outline and text shadow.

It does not store the words, layer name, position, rotation, dimensions, opacity or effects.

A saved text style records its scope. Normal text styles are tied to the design they came from; when the design belongs to a client brand the Reuse panel also offers **Brand text style**, which records the brand id so the same storage model can support brand-level organisation without a second style system.

## Logos, images and textures

Select one raster layer and choose **Logo**, **Image** or **Texture**. VoidCanvas stores one PNG source plus a small local preview in the same Reuse library.

Applying a raster library item behaves in two ways:

- if one or more unlocked raster layers are selected, their image source is replaced while their placement/treatment is preserved through the existing Replace Image workflow;
- if no raster layer is selected, VoidCanvas places the reusable image as a new layer. Logos are tagged as logo-role artwork; textures as decoration; normal images as image-role artwork.

The reusable source stays local and is not uploaded by this feature.

## Colours

Select one text or shape layer and choose **Colour**. Text contributes its text colour; a shape contributes its fill.

Applying that colour changes selected text and shape layers only. Other layer properties are untouched.

## Fonts

Select one text layer and choose **Font**. The library stores the font family and, when the font came from a local uploaded font file, keeps that local font blob too.

Applying a font changes the selected text layers' family while preserving their words and other typography. A local font is registered again on the destination device/session when available.

## Templates

**Template** stores an immutable template snapshot as a separate saved project; it does not turn the current working design into a template.

Applying a template opens a fresh design copy with its own id and export history. The reusable template source remains unchanged.

## Studio colour looks

Existing Studio **Take the look** records remain valid. The Library reads them alongside the newer reusable items and applies them through the existing Colour Match adjustment. They are not silently rewritten or migrated.

## Search, filters and recent use

The Library can be searched by name/type and filtered to Looks, text styles, logos, images, textures, colours, fonts or templates.

Local reusable items record `lastUsedAt`; the Library orders recent-use items ahead of older ones so frequently reused material naturally stays near the top.

## `Used in` references

Phase 7B adds separate local reference records for every explicit reuse application. A reference identifies:

- reusable item id
- design id and design name
- target layer/group when there is one
- the reuse slot (`look`, `textStyle`, `logo`, `image`, `texture`, `color`, `font`, or `template`)
- last application time

The reference records deliberately live outside the project/.void schema in Phase 7B. This keeps existing document compatibility intact while giving the Library dependency awareness.

`Used in N designs` counts only references whose design still exists: saved designs, plus the design open now, even before its first save reaches the index. Deleted designs therefore do not keep a reusable item artificially "in use". Applying an item is one synchronous undo step; the reference is written straight after, and the Library waits for that write before it re-reads usage, so the count is never stale.

These are conservative dependency records: they record where an asset was explicitly applied. If somebody later manually rebuilds or changes the target without going through Reuse, the historical reference can remain. That is intentionally safer than silently assuming the dependency disappeared.

## Safe delete

Deleting an unreferenced reusable item removes it immediately.

If the item is referenced by saved designs, VoidCanvas blocks the first delete attempt and names the affected designs. The user must explicitly confirm a forced delete.

Forced deletion removes the reusable source/reference records only. Existing designs keep their current pixels/type/appearance; VoidCanvas never damages historical work just because the library source was removed.

Deleting a reusable template also removes its hidden template project/index record after confirmation.

## Safe Replace source

Raster, colour, font and template items have **Replace source**.

Replacement updates the reusable source for future use. It does **not** silently rewrite existing designs that already used the item. If the item has references, VoidCanvas reports how many designs keep their current placed version until the user explicitly reapplies the updated asset.

This is the dependency rule for Phase 7B: replacing a library source is safe; propagating changes across multiple designs is a separate explicit operation. Campaign-wide propagation belongs to the campaign-token phase, where it can be reversible and preserve overrides.

## Storage and privacy

Reusable items and references are local-first and use VoidCanvas's existing IndexedDB abstraction. Private Session still keeps them in memory only, because it uses the same storage layer.

No design content leaves the device because of the Reuse Library. Optional sync/share systems remain separate and must be explicitly used.

The implementation continues to use namespaced records in the existing `account` object store, avoiding an IndexedDB version migration while the wider asset/campaign model evolves.

## Phone

On a phone with a design open, the Library opens from **More**, **Reuse library** (6 Oct 2026: the phone editor hides the top bar, so before this there was no way in). It opens as a full-width bottom sheet. On a tablet the top bar shows a **Reuse library** icon; on desktop the **Reuse** button, or **Alt+Shift+L**.

## Verification

Phase 7 reuse has:

- unit coverage for Look portability, fresh effect identity, text-content safety, shape appearance and group-composite Looks;
- `e2e/reuse.mjs`, which covers Look/text-style apply + undo, text-content preservation, cross-design `used in`, colour/font assets, search/filtering, safe delete warning, raster logo placement and phone reachability;
- normal CI gates for strict TypeScript, unit tests and production build.

The browser regression is part of the full `npm run e2e` suite. A PR should only claim it passed when that suite/test was actually executed, rather than assuming inclusion equals execution.

## Next Phase 7 work

Phase 7B establishes the asset/dependency layer. The next coherent slice is campaign reuse:

- Studio job as the campaign container;
- shared brief tokens such as date, time, venue, price and CTA;
- linking tagged text across related designs/boards;
- explicit **Change everywhere** updates as reversible operations;
- preserving manual/per-format overrides unless the user resets them;
- contextual one-at-a-time reuse suggestions and the remaining brand-system colour-role/type-in-use work.
