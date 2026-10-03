# Effects controls and community evidence

Research date: 3 October 2026. This is a targeted qualitative sample, not a representative survey or evidence of how common each complaint is. Older reports are useful usability examples, not claims that competing products still have those bugs.

## Design framework

Use [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show the controls needed to make a useful result first, and label secondary controls clearly. Keep two levels. Do not hide fundamental choices such as gradient type, blur radius or effect intensity. Support recognition through labelled presets, immediate feedback, reversible edits and numeric entry alongside sliders. This is established usability guidance; the particular implementation still needs observation with VoidCanvas users.

## Evidence mapped to this codebase

| User problem and primary source | Existing VoidCanvas capability | Change / next action |
| --- | --- | --- |
| [Photopea discussion, July 2026](https://github.com/photopea/photopea/discussions/8919): user asks for non-destructive filters despite smart filters already existing | Editable effect stacks on layers, groups, boards and document, masks, linked selections | Make settings visible after insertion; Filter commands use selected targets. Feature presence is insufficient if users cannot find it. |
| [Adobe gradient controls report, January 2025](https://community.adobe.com/t5/photoshop-ecosystem-bugs/photoshop-2025-gradient-tool-controls-missing/idc-p/15103859): user cannot reposition a gradient because controls are missing | Linear painting and editable two-colour overlays | Five gradient geometries, overlay placement and elliptical ratio, editable stops. Next: direct canvas handles for live gradients, including a gradient fill layer instead of baked painting. |
| [Affinity gradient feedback, 2020 with follow-up in 2022](https://forum.affinity.serif.com/index.php?/topic/110539-gradients/): swatches unavailable in FX require creating gradients twice | Separate painted tool and overlay controls | Share gradient types, presets and renderer. Next: saved personal gradient library accessible in both surfaces. Search retrieval supplied the thread; direct opening was blocked. |
| [Photopea numeric adjustment issue, December 2021](https://github.com/photopea/photopea/issues/4060): slider increments / mapping make precise values difficult | Sliders and label scrubbing | Numeric entry on shared sliders; consistent track/thumb sizing. Next: exposure in stops and gamma in actual values, with task-appropriate precision and non-linear scales where useful. |
| [Adobe filter preview report, September 2019](https://community.adobe.com/questions-712/filter-preview-window-not-working-correctly-1080867): preview does not show blur before applying | Live compositor, before/after, export parameter scaling | Keep live preview; test changes at pixel level and preserve undo and save. Next: optional split preview and performance budget on large documents. |
| [Photopea single-layer black-and-white question, May 2025](https://www.reddit.com/r/photopea/comments/1kf4qv6): uncertainty about limiting an adjustment to one layer | Scoped effect stacks and clipping | Filter menu now follows selection, with Properties exposed. Keep an explicit adjustment-layer path for affecting layers below. |

## Implemented

- Shared slider geometry and numeric input, including the standalone Effects page.
- Shared gradient presets/types and rendering: linear, radial, angular, reflected and diamond. Old files default to linear; circle defaults to ratio 1.
- Overlay colour stops (up to eight in UI), position, scale, angle, centre, ellipse ratio and reverse. Both appearance panels use the same controls.
- Painted gradients use the same renderer and presets; painting remains destructive and the interface directs editable work to overlays.
- Blur radius and intensity, motion length/direction, radial centre; premultiplied alpha avoids dark transparent edges.
- Existing filter parameter registry remains authoritative: controls change parameters the renderer actually consumes. Every filter also has real finishing brightness, contrast and saturation controls applied to the filtered pixels before opacity blending. Fixed transforms such as invert do not get invented algorithm parameters.
- Full existing style controls available in the compact panel, including blend modes, shadow spread, bevel light/softness/highlight/shadow, and reset.
- New filters reveal Properties. Adjustment thumbnails reopen settings. Menu filters use the existing scope framework rather than creating a layer that silently affects everything below.
- PSD gradient overlays retain geometry, reverse and multiple colour stops. Opacity stops and midpoint interpolation remain unsupported and must be reported on import.

## Highest-value additions after this change

1. On-canvas live gradient handles and saved gradient presets. These remove repeated rebuilding and reconnect controls to the result.
2. One visible target label for every entry point, plus previews explaining layer / group / below / artboard / document scope. Existing scope machinery should be exposed consistently.
3. Before/after split view and a large-document preview budget. Users should be able to compare without losing their working settings or blocking the pointer.
4. Better unit semantics, especially exposure/gamma and pixel settings whose standalone values are currently normalised. Avoid relabelling normalised parameters as exact pixels.
5. Task-based usability sessions: apply a filter to one shape, edit it later, make an off-centre radial gradient, recreate the same gradient on text, undo then reopen the project. Observe completion, wrong-target edits and confusion; do not treat forum demand as validation of our interface.

## Boundaries

This change does not implement every possible Photoshop effect parameter, personal preset storage, live on-canvas gradient handles, dithering controls, gradient midpoint/opacity editing or new rendering algorithms for every artistic filter. Those need their own renderer and output parity work. Existing artistic filter parameters are exposed, not replaced with decorative sliders.

## Validation

- 175 unit tests passed, including gradient geometry, blur direction/alpha, finishing tone and opacity.
- Production build passed.
- New browser regression: all five gradients by rendered pixels and preview/export comparison; stop/reverse, undo/redo, numeric entry, slider alignment, dialog Cancel, blur modes, save/reload and filter finishing.
- Existing effects scope browser suite: 108 checks passed, including 30 scope/effect preview-export comparisons, group/link/mask behavior, standalone Effects handoff and phone controls.
- Browser screenshots were inspected; no application page errors were reported. Agent-browser daemon could not start in this runtime, so executable browser checks used the repository's Playwright setup.
