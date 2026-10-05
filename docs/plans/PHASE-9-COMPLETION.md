# Phase 9 completion — Production Engine

Phase 9 is the non-AI production-infrastructure run for VoidCanvas.

## 9A — WebGL2 tiled compositor

Shipped engine contracts:

- dependency-aware render graph for layers, nested groups, boards and the document
- bounded visible-region tile planning and stable cache identity
- WebGL2 Porter-Duff/blend compositor for Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge, Color Burn, Hard Light, Soft Light, Difference and Exclusion
- hybrid tile renderer that uses WebGL2 only when explicit parity exists and falls back per tile to CPU Canvas otherwise
- WebGL context loss/allocation failure is non-fatal; CPU remains a first-class renderer for old phones/browsers and unsupported HSL component blend modes
- GPU readback is vertically corrected before joining the Canvas path

The editable document remains the source of truth. GPU resources are disposable acceleration data.

## 9B — pressure-driven OPFS scratch

Shipped:

- GPU/RAM tile residency bounded by tile count and bytes
- normal/elevated/critical pressure policy using available JS-heap and storage signals
- residency rebudgeting causes least-recently-used serialisable tiles to spill through the shared OPFS cache key
- scratch restore, invalidation, per-project cleanup and persistence/quota inspection
- critical origin-storage pressure can purge disposable scratch
- OPFS is never canonical project storage. Clearing site data may remove scratch; it must never be the only copy of a design

## 9C — native working colour + printer profiles

Shipped:

- explicit document working model/profile metadata; legacy documents remain explicit sRGB when no metadata exists
- native RGB/CMYK/Gray/Lab colour value types and CMYK total-area-coverage/pure-K diagnostics
- bidirectional LittleCMS/WASM sRGB ↔ CMYK transforms for an embedded CMYK working profile
- document working profile is separate from the proof/output printer profile
- Production Export can deliberately promote the loaded CMYK ICC to the document working space after transform validation
- UK/Europe and Nigeria choices are starting guidance only; VoidCanvas never silently applies a guessed regional ICC profile
- printer-supplied ICC always wins when available

Browser display canvases are still RGB display surfaces; native CMYK identity/channel values and profile-managed transforms live in the document/colour engine rather than pretending the browser framebuffer itself is CMYK.

## 9D — PDF/X-4 + preflight

Shipped production path:

- blocking preflight for missing output intent/profile, missing raster data, invalid target and invalid bleed
- policy warnings for no bleed and low document DPI
- full-resolution target render converted through the selected printer ICC to CMYK
- PDF 1.6 writer with embedded CMYK ICC profile, ICCBased image colour space and `/GTS_PDFX` OutputIntent
- XMP PDF/X-4 conformance identification, `/Trapped /False`, TrimBox and BleedBox
- generated production path does not emit DeviceRGB artwork
- configurable bleed and board/document target in Production Export
- structural conformance assertions are part of unit CI

PDF/X itself does not prescribe a universal minimum image DPI or bleed amount; those remain VoidCanvas production-policy warnings. Receiving printers should still run their own production preflight because press/RIP requirements differ.

## 9E — torture/performance hardening

CI fixtures now represent:

- 8K photo poster — 61 layers / 14 effects
- 120-board campaign — 438 layers
- 30,000 × 20,000 exhibition artwork
- deep imported PSD — 320 layers / 48 effects
- CMYK brochure workload

Deterministic release gates cover bounded overview/tile residency, pressure behaviour, visible tile planning, WebGL readback orientation, PDF/X blocking preflight and PDF/X structural colour/output-intent requirements.

Wall-clock render time, FPS and real GPU memory are deliberately not gated against GitHub-hosted-runner timing. Those metrics must be collected in real browser/device runs so a noisy shared VM is not mistaken for product performance.

## Safety/fidelity boundaries

- WebGL2 is acceleration, not a requirement. CPU fallback is mandatory.
- HSL component blend modes stay on CPU until pixel-parity fixtures prove a shader implementation.
- OPFS is scratch only.
- A regional ICC recommendation is never substituted for the printer's ICC file.
- PDF/X production output is a flattened colour-managed handoff. `.void` and layered PSD remain the editable/source handoff paths.
- AI connector / MCP / design API remains out of scope.
