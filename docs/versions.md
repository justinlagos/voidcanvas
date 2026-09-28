# Versions, review and comments

Code: `src/editor/versions.ts` (Editor versions), `src/editor/components/VersionsDialog.tsx` (history, naming,
compare), `src/studio/job/ReviewTab.tsx` (review versions), `src/studio/job/DeliverTab.tsx` (delivery),
`src/studio/pins.ts` (pins on layers), `src/studio/share-merge.ts`, `src/editor/components/CommentsPanel.tsx`,
`src/editor/comments.ts`, `src/lib/intelligence/preflight.ts` (`deliveryPreflight`).
Tests: `e2e/versions.mjs`, `src/editor/__tests__/versions.test.ts`, `src/studio/__tests__/pins.test.ts`, the delivery
cases in `src/lib/__tests__/intelligence.test.ts`.

## Editor versions

A version is a full copy of a design (`versions` store) with a summary (`versionIndex`):
`{ id, docId, at, label, auto, thumb, width, height, name?, keep?, fp? }`.

- `label` says how it was made: Saved by you, Automatic, Exported, Before image size, Before restoring an older
  version, Sent for review.
- `name` is the designer's name for it. `keep` is set when a Studio version made from it is approved, or by hand.
- `fp` is `fingerprint(stored)`: SHA-256 over the stored design without layer `rev` numbers, plus every stored
  PNG. Unchanged layers keep their PNG bytes across closing and reopening (`restoreStored` seeds the PNG cache
  with the stored bytes), so the same design gives the same fingerprint.
- `versionsToDrop` keeps 30: automatic unnamed versions go first, then unnamed hand-saved ones, oldest first.
  Named and kept versions are never removed, even past 30.
- `saveVersion(label, auto, { name })` saves the open design and returns the id. `saveVersionOf(docId, label,
  { name, keep })` saves a design that is not open (Studio), after pending saves; when the newest version has
  the same fingerprint it is reused rather than stored again.

## Studio review versions

`Version` gains `stage` (direction, revision, final), `name`, `designVersionId`, `designFp`, `boxes`, and a
`frameId` per image. `versionTitle(v)` is "Name · v3", or "v3".

- `reviewBoards(design)`: with formats (a board with `linkedFrom` or `deliverableId`), the master and every format;
  loose working boards are left out. Without formats, every board. A snapshot with no boards makes no version.
- The master image is named after `job.masterDeliverableId` when the board carries no deliverable id.
- A snapshot first calls `saveVersionOf(designId, 'Sent for review', { name: 'Review vN' })` and records the id and
  fingerprint. Approving a version marks that Editor version `keep`. Renaming the Studio version renames it.
- `boxes[imageIndex]` holds `LayerBox { id, name, x, y, w, h, sig }` in image pixels for visible layers on that
  board, except adjustments and a background (role background, or 90% of the board). `sig` is `layerSig`: what
  the layer looks like without where it is. The boxes stay in the job on this device (and in the team's sealed
  sync); the review link carries only images and the version title.

## Pins on layers

`placePin(pin, boxes, w, h)` ties a pin to the smallest box under it and stores `layerId`, `layerName` and `rel`
(where on the box, 0 to 1). Designer pins are tied when dropped; client pins when their events are merged. Older
pins are tied when shown. `pinNow` and `pinPoint` put a pin on its layer's current box, so it follows the layer;
a different `layerSig` means "Changed since the comment", a missing layer "The layer is gone".

The Editor's Comments panel (`PanelId 'comments'`) reads the job by `doc.jobId`, shows the pins of the newest
version with comments (or one picked), polls the review link every 30 s, and writes Done and replies through
`updateJob` (memory and IndexedDB) and `postEventFor`. It fills `useComments`, which the canvas draws.
`/editor?project=<id>&comments=1&layer=<layerId>` opens a design on a layer with the panel showing.

## Delivery

The Deliver tab uses the newest approved version. With its design on this device (`loadDesignVersion`), that is
delivered by default and files carry its number. The current design's fingerprint is compared with `designFp`;
`deliveryPreflight` gets `approval: { label, changed, delivering, next }` and, when the current design is
delivered after a change, says "The design changed after v3 was approved. Deliver v3, or send v4 for approval."
The master board for the key visual's deliverable is the board the formats link to.

## Compare

`CompareView` renders two versions (or a version and the open design) board by board with `renderBoard`, matching
boards by id, then by position, and shows them under a slider or side by side.
