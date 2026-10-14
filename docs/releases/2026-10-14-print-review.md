# Print review and live preflight

## Released baseline

PR #80 was merged with the user's explicit approval. Merge commit:
`659b0cadc8d61ddeeb6ec5e3eddf6d7dadc6993a`.
Netlify production deploy `6acffac37a7c70a113ab6efb` was published at
2026-10-14T21:58:48.957Z. Netlify reports `ready`, `context: production`,
and that exact merge commit as `commit_ref`.

Production checks at https://voidcanvas.app passed:

- Pen anchor and handle editing, grid snaps, Undo/Redo and .void reopening.
- All six Boolean operations, compound holes, contour operations, editable SVG,
  release and atomic history, lock and cross-board guards.
- Six-format Cascade generation, expanded A4 review, nested group inheritance
  and local overrides, seven exact PNG sizes in the downloaded ZIP.
- Actual CMYK ICC loading, physical card size, real artwork bleed, TrimBox
  registration and embedded ICC output intent in the downloaded PDF/X and TIFF.

All four browser checks reported no uncaught page errors.

## Next candidate

Production export now shows a bounded print preview before exporting. It uses
exactly the same selected-board and bleed renderer as the full-resolution
handoff, including artwork outside trim and exclusion of other boards. Guides
show the physical bleed edge, trim and a 3 mm safe area. The bleed edge uses
millimetres independently of outward-rounded raster pixels; guides remain out
of exports. Transparent artwork is composited onto white, as in CMYK conversion.

The loaded ICC and selected rendering intent provide a real soft-proof preview.
The original-colour view is available through the existing soft-proof control.
A pending or failed transform cannot be shown as a ready proof. Obsolete async
renders are discarded after target or document changes; temporary canvases are
released. Preview artwork is limited to a 960 pixel long edge; exports keep full
resolution.

PDF/X preflight appears immediately and updates when the document, target,
bleed, profile, layers or groups change. Blocking findings disable PDF/X export;
export still rechecks the current state. Hidden or zero-opacity ancestor groups
no longer create warnings or blockers for unused images. Visible low-resolution
images remain warnings. Cascade print review now uses the same physical 3 mm
safe margin rather than the percentage margin used for screen formats.

## Validation

- TypeScript and production build passed.
- All 549 unit tests in 92 files passed, including nested hidden/transparent group
  preflight, missing raster logo and physical Cascade margin regressions.
- Production-build browser checks cover preview pixel colours, actual ICC proof
  and original-colour switching, physical guide placement, live preflight,
  visibility changes, bleed updates and phone width; downloaded PDF/X and TIFF
  retain the original physical trim, real bleed pixels and ICC metadata.
- Boolean/compound editing and the six-format Cascade corpus passed on this build.
- Independent pypdf/Pillow parsing and Poppler rendering verified the downloads.

CI also runs the expanded print review checks and uploads its screenshots and
print files. Netlify branch and deploy previews remain deliberately skipped;
a skipped Netlify preview check is not evidence of publication.

## Limits

This is a screen review, not a physical printed proof or printer-specific PDF/X
certification. Geometric preflight cannot prove taste, crop quality, arbitrary
mask occlusion or paper appearance. The PDF/X handoff remains flattened CMYK;
editable source is preserved in .void/SVG/PSD. This new candidate is separate
from the approved PR #80 production release.
