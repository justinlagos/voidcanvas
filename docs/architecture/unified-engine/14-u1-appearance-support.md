# U1 appearance contract — supported behaviour, verified on pixels, and its limits

Sprint U1. The single place that states how visibility, alpha, blend, isolation, clipping,
masks and effect stacks evaluate is `src/editor/unified/appearance.ts`. The live renderer
(`src/editor/engine.ts`) calls it directly instead of keeping its own copies of the rules:

- `layerAlpha` / `evaluateLayerAppearance` — a layer's alpha, fill opacity, blend, masks, clip
  base and which passes it needs (offscreen, document-space).
- `evaluateGroupAppearance` — a group run's visibility, isolation, alpha and composite blend.
- `groupChain` / `effectiveAppearance` — visibility and alpha inherited through nested groups.
- `resolveClipBase` — the clipping base, and the rule that an adjustment layer can never be one.

`e2e/unified-slice.mjs` already checks single rules on pixels (layer opacity, group opacity ×
layer effect, clipping + layer mask + multiply). `e2e/appearance-combos.mjs` (added with this
note, run by `unified-slice.yml`) checks the **combinations**, sampling the real canvas:

| Combination | Expected | Measured |
|---|---|---|
| Pass-through group: multiply child over a grey backdrop | child blends with the backdrop | `128,0,0` |
| Same group isolated by 50% opacity | child composites inside, then the group fades | `191,63,63` |
| Nested groups: inner 50% × outer 50% over white | 25% of black over white | `191,191,191` |
| Hiding the outer group | child hidden, backdrop shows | `255,255,255` |
| Group mask + isolation | masked half hidden, rest fades 50% | left `255,255,255`, right `126,126,126` |
| Ordered effects: halftone→blur vs blur→halftone | different pictures | mean per-channel diff `47.3` |

Unit-level rules (including cycle guard, missing group, styled-layer fill opacity) stay in
`src/editor/unified/__tests__/appearance.test.ts`.

## Supported, and how

- **Group opacity** forces isolation (`isolated = alpha < 1`): the run is drawn once, then the
  group is placed with that alpha. Nested group alphas multiply down the chain.
- **Isolated vs pass-through blending.** A pass-through group (`blend` unset or `'pass'`) draws
  its children straight into the parent, so a child's blend meets what is behind the group.
  Choosing any real blend mode isolates the group, and the group is composited with that mode.
- **Visibility inheritance.** A hidden layer is skipped; a hidden group anywhere in the parent
  chain hides its children (`groupChain().hidden`).
- **Fill opacity.** Unstyled layers multiply `opacity × fillOpacity`. Layers with active styles
  keep full fill alpha and fade through their style stack instead — this matches the renderer by
  design, and is asserted.
- **Masks.** A layer's raster mask and vector mask run as `destination-in` on the layer's own
  pass; a group's mask runs as `destination-in` on what the group makes, after its effects.
- **Clipping.** `resolveClipBase` only accepts a non-adjustment layer; the clipped pass is
  intersected with the base's alpha.
- **Ordered effects.** `Effect[]` runs top to bottom, each on the previous result. `orderMatters`
  in `src/editor/effects.ts` flags when it does, and the combination gate measures it.

## Deliberate limits (documented, not silently approximated)

- **HSL blend modes on the GPU path.** `webgl-compositor.ts` implements 12 blend modes (`GPU_BLEND_MODES`);
  `hue`, `saturation`, `color` and `luminosity` have no GPU parity fixtures yet and fall back to
  the CPU renderer. The fallback is explicit; results stay correct, only the path differs.
- **Pass-through cannot carry a blend.** Setting a group's blend to anything but `pass`
  isolates it. Upstream (Photoshop) does the same; there is no "blend a pass-through group"
  state to reach.
- **Groups have no fill of their own.** `fillOpacity` is a layer concept; a group's own alpha is
  its `opacity`.
- **Effect masks on a layer do not scale or turn with it.** A layer effect mask is page pixels
  placed at `maskAt` relative to the layer's x/y, so it moves but does not scale/rotate (see
  `docs/effects.md`).
- **Group masks are page pixels.** They sit at `maskAt` (0,0 means page origin) and are not
  stretched; moving a board moves the masks of what is on it (`mapDocMasks`).
- **Cache keys follow child revisions.** An isolated group's cached image is keyed by every
  child's `rev` and the group settings, so a change to any child (including a paint stroke while
  `opts.live` is set) re-renders the group; there is no partial-group cache.
