# Reuse library

Phase 7 starts with two things designers repeatedly rebuild: an appearance treatment and a type treatment.

## Looks

Select a layer or a whole group in the Editor and open **Reuse**. **Save as Look** keeps the reusable appearance of that target.

For a layer it can keep:

- opacity and blend mode
- fill opacity and layer styles
- the ordered live effect stack
- text appearance when the source is text
- shape appearance when the source is a shape

For a selected group it saves the **group composite** treatment: group opacity, compositing/blend behaviour, group styles and the group's ordered effect stack. It does not copy the same effect onto every child. That preserves the distinction between “blur this group as one image” and “blur each child separately.”

A Look does **not** keep source content, position, identity, effect links or effect masks. Effect masks are tied to the geometry of the layer/group where they were painted, so carrying them into another target would be unsafe. Applying a Look creates fresh effect IDs and no shared links back to the source.

Apply a Look to a whole selected group, or to one or several selected compatible layers. It is one undoable operation. Content and placement stay their own.

## Text styles

When exactly one selected layer is text, **Save text style** keeps typography only: font, size, weight, italic, colour, alignment, line height, letter spacing, paragraph settings, underline/strike/caps, outline and text shadow.

It does not keep the words, layer name, position, rotation, dimensions, opacity or effects. A text style can therefore be safely applied to another text layer without replacing its copy or treatment.

## Studio colour looks

Existing Studio **Take the look** records remain valid. The Reuse library reads them alongside the new items and applies them through the existing Colour Match adjustment. They are not silently rewritten or migrated.

## Storage and privacy

Reusable items are local-first and use the same IndexedDB database as the rest of VoidCanvas. No design content is uploaded by the reuse system. Private sessions remain in memory only because the library goes through the existing `idb` abstraction.

The first implementation stores new reuse records as namespaced entries in the existing `account` object store. That deliberately avoids an IndexedDB version migration while Phase 7's wider asset library model is still being built.

## Phone

The Reuse control is available in the Editor without relying on hover, right-click or a keyboard. On a narrow screen the library opens as a bottom sheet. Desktop also supports **Alt+Shift+L**.

## Next Phase 7 work

This is the foundation, not the whole library. Next additions are cross-design logos/images/textures/colours/fonts/templates, usage references (`used in`), safe replace/delete behaviour, brand-promoted text styles and campaign-level shared tokens.