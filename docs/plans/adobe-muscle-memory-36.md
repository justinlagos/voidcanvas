# Adobe muscle-memory: 36 editor behaviours

Tracking inventory. Existing code is not proof of browser-tested completion.

| No. | Behaviour | Current assessment |
|---|---|---|
| 1 | Effects and adjustments scope to exact selected layer(s) | Changed in PR #52; awaiting browser QA |
| 2 | Cut/copy-to-new-layer uses tight visible bounds | Changed in PR #52 for cut/copy; other crop paths pending |
| 3 | Free Transform targets selected layer | Improved in PR #52; browser reserves Ctrl/Cmd+T |
| 4 | Double-click to edit text | Present in source; needs interaction regression |
| 5 | Alt/Option drag duplicates | Present in source; needs pointer regression |
| 6 | Shift resize keeps proportions | Shift-constrained resize implemented in PR #52 |
| 7 | Alt/Option resize about centre | Present in source; needs pointer regression |
| 8 | Arrow/Shift+Arrow nudges | Present; configurable 1/10px nudges |
| 9 | Double-click thumbnail opens target-specific editor | Improved thumbnail contextual editing in PR #52 |
| 10 | Modifier click selects overlapping underlying layer | Ctrl/Cmd-click overlapping layers in PR #52 |
| 11 | Paste in place retains board coordinates | Present; artboard regression needed |
| 12 | Duplicate to another artboard at relative coordinates | Duplicate to next artboard in PR #52 |
| 13 | Select Same by font/fill/stroke/style | Present; regression needed |
| 14 | Isolate groups by double-click | Present; nested-group regression needed |
| 15 | Space temporarily pans canvas | Present; keyboard regression needed |
| 16 | Copy/paste appearance only | Present; regression needed |
| 17 | Smart alignment, spacing guides | Present; visual regression needed |
| 18 | Drag-create and release clipping masks | Alt/Option-drop clip-to-host added as one undo step; browser QA pending |
| 19 | Constrain rotation to 15-degree increments | Present; 15-degree Shift rotation |
| 20 | Nine-point pivot | Present; nine-point pivot |
| 21 | Trim transparent bounds without discarding hidden pixels | Open: mask-aware tight selection geometry; protected source-preserving crop initiated in new PR |
| 22 | Smart naming for newly created layers | Present; review naming on imports |
| 23 | Lock transparency when painting | Present; masking/undo QA needed |
| 24 | Select subject and refine mask | Present; reliability QA needed |
| 25 | Drag swatches onto objects | Drag-to-colour in PR #52; QA pending |
| 26 | Temporary eyedropper in colour tools | Alt/Option temporary sampler in PR #52 |
| 27 | Edit multi-selected text properties | Multi-text spacing/alignment expanded in PR #52 |
| 28 | Repeat latest transform | Repeat rectangular scale/rotation/move command added; browser QA pending |
| 29 | Convert type to editable outlines | Open: editable type outlines |
| 30 | Expand vector appearance | Open: expand vector geometry |
| 31 | Puppet Warp pins | Open: puppet warp pins |
| 32 | Live repeating pattern editing | Partial: pattern styles; tile editor absent |
| 33 | Direct-select within groups | Partial: path direct-select exists; group isolation QA pending |
| 34 | Persistent clearly labelled operation-scope indicator | Partial: adjustment target in Properties; extend to all actions |
| 35 | Reversible crop and mask-aware bounds | In progress: selected-layer crop-to-selection via editable vector mask; document crop and precise masked transform bounds still open |
| 36 | Undo, save/reload and export parity across scoped operations | Regression scripts authored, not run |

## Definition of done

Every workflow must operate on the intended object without mutating unrelated layers; remain editable wherever promised; support undo and redo; survive .void save/reopen; and match exports. Test desktop, touch, nested groups, masks, rotated objects and PSD imports as appropriate.

## Rollout

P0 scope, bounds, transform and regression. P1 familiar manipulation and precision controls. P2 advanced vector/text/pattern editing. Do not merge an unverified preview failure into master.
## 10 October 2026: crop workstream

The first follow-up branch introduces a dedicated **Layer > Vector mask > Crop selected layer (non-destructive)** command. It clips the selected layer to the selection's document-space bounding rectangle using a path in layer-local coordinates. It does not replace the original artwork or crop the whole document. Existing vector masks are protected against overwrite; existing pixel masks remain. It is deliberately a new command rather than silently changing Image > Crop semantics. The command and focused browser tests are not release-complete until CI passes.

**Not addressed by this first slice:** visual transform handles tightly following every transparent/masked rotated contour, reversible whole-document crop, smart-object nesting, editable type outlines, Puppet Warp, appearance expansion and live pattern tile editing. Those remain in issue #54.
