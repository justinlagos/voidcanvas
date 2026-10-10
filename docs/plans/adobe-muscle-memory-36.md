# Adobe muscle-memory: 36 editor behaviours

Tracking inventory. Existing code is not proof of browser-tested completion.

| No. | Behaviour | Current assessment |
|---|---|---|
| 1 | Effects and adjustments scope to exact selected layer(s) | Patch in PR #52; not browser verified |
| 2 | Cut/copy-to-new-layer uses tight visible bounds | Patch in PR #52; not browser verified |
| 3 | Free Transform targets selected layer | Partly present; keyboard browser conflict |
| 4 | Double-click to edit text | Audit and verification required |
| 5 | Alt/Option drag duplicates | Audit and verification required |
| 6 | Shift resize keeps proportions | Audit and verification required |
| 7 | Alt/Option resize about centre | Audit and verification required |
| 8 | Arrow/Shift+Arrow nudges | Audit and verification required |
| 9 | Double-click thumbnail opens target-specific editor | Improved in PR #52; not browser verified |
| 10 | Modifier click selects overlapping underlying layer | Audit and verification required |
| 11 | Paste in place retains board coordinates | Audit and verification required |
| 12 | Duplicate to another artboard at relative coordinates | Audit and verification required |
| 13 | Select Same by font/fill/stroke/style | Audit and verification required |
| 14 | Isolate groups by double-click | Audit and verification required |
| 15 | Space temporarily pans canvas | Audit and verification required |
| 16 | Copy/paste appearance only | Audit and verification required |
| 17 | Smart alignment, spacing guides | Audit and verification required |
| 18 | Drag-create and release clipping masks | Audit and verification required |
| 19 | Constrain rotation to 15-degree increments | Audit and verification required |
| 20 | Nine-point pivot | Audit and verification required |
| 21 | Trim transparent bounds without discarding hidden pixels | Audit and verification required |
| 22 | Smart naming for newly created layers | Audit and verification required |
| 23 | Lock transparency when painting | Audit and verification required |
| 24 | Select subject and refine mask | Audit and verification required |
| 25 | Drag swatches onto objects | Audit and verification required |
| 26 | Temporary eyedropper in colour tools | Audit and verification required |
| 27 | Edit multi-selected text properties | Audit and verification required |
| 28 | Repeat latest transform | Audit and verification required |
| 29 | Convert type to editable outlines | Audit and verification required |
| 30 | Expand vector appearance | Audit and verification required |
| 31 | Puppet Warp pins | Audit and verification required |
| 32 | Live repeating pattern editing | Audit and verification required |
| 33 | Direct-select within groups | Audit and verification required |
| 34 | Persistent clearly labelled operation-scope indicator | Audit and verification required |
| 35 | Reversible crop and mask-aware bounds | Audit and verification required |
| 36 | Undo, save/reload and export parity across scoped operations | Audit and verification required |

## Definition of done

Every workflow must operate on the intended object without mutating unrelated layers; remain editable wherever promised; support undo and redo; survive .void save/reopen; and match exports. Test desktop, touch, nested groups, masks, rotated objects and PSD imports as appropriate.

## Rollout

P0 scope, bounds, transform and regression. P1 familiar manipulation and precision controls. P2 advanced vector/text/pattern editing. Do not merge an unverified preview failure into master.