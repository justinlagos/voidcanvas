# Saving and reopening

How the Editor keeps the open design safe. Code: `src/editor/io.ts` (save queue, one tab per design),
`src/editor/viewmemory.ts` (where each design was left), `src/editor/versions.ts` (crash markers),
`src/editor/invariants.ts` (rules every state must keep). Tests: `e2e/trust.mjs`, `src/editor/__tests__/invariants.test.ts`.

## The save queue

- `startAutosave()` (called once by `EditorShell`) subscribes to the editor store.
- Every change to the open design (layers, groups, doc, swatches, or `dirty` turning on) bumps a generation number `gen`
  and sets `dirty`, so the top bar says Saving until it is stored. Live edits count, not only committed steps.
- A save runs 1.2 s after the last change, and at least every 5 s while changes keep coming.
- Saves run one at a time through a promise chain, in order. A save writes the state it finds when it runs and records
  the generation it captured; the design is marked saved only if `gen` did not move while it was writing.
- When the open design is closed or replaced (Back, New, tab switch, another design opened, `closeDoc` from anywhere),
  the subscriber sees the id change and writes the previous state if it had unsaved changes. Callers do not need to save first.
- A design given a new id with the same layers (a Studio job claiming it) keeps its unsaved changes under the new id.
- Loading (`history.length <= 1` after a replace) settles in a microtask: a design that arrives dirty (a copy, an import) is saved; a plain open is not.
- `saveProject()` saves now if there are changes and waits for the chain. `flushSave()` is the same, never throwing.
  `listProjects()` waits for pending saves so lists are never behind.
- `visibilitychange` (hidden) and `pagehide` flush. `beforeunload` asks the browser to confirm only while a change is not yet
  stored, and never in the desktop app.
- Raster layers and masks are never changed in place (history keeps references), so their PNG is cached per canvas object and
  only changed layers are encoded on each save.
- A failed save shows why, is counted (`save.failed`), and retries up to three times.

## One design, one tab

A `BroadcastChannel` (`vc-open-designs`) announces each design a tab opens. A tab that has the same design open saves it,
closes it, says so, and replies `released`. If it had unsaved changes, the new tab reloads the saved copy (keeping its view).

## Reopening

- Each tab keeps the designs it has open in `sessionStorage` (`vc-open`). A reload or a Back/Forward return reopens them;
  going to /editor afresh shows the start screen.
- Each design's view (zoom, the point at the middle of the screen, active board, selection) is kept in `localStorage`
  (`vc-views`, 60 most recent) and restored when the design opens. The point is stored in design coordinates, so it holds
  across screen sizes.

## Crash markers

Each tab writes its open designs to `localStorage` (`vc-sessions`, keyed by tab) and holds a Web Lock (`vc-tab-<key>`)
while it lives. On the start screen, markers whose lock is not held belong to tabs that crashed or were killed, and the
banner offers to reopen them. A tab that is still open holds its lock and is never reported. The banner is read after
mount, so it is never part of the server render.

## Rules every state keeps

`checkInvariants(state)` returns broken rules in words: unique layer ids; boards, groups and clip bases that exist; groups
not nested in themselves; members of a group next to each other in the stack; active and selected layers that exist;
an active board that exists; the undo position inside the history. `e2e/trust.mjs` runs 500 random store actions for
three seeds and checks the rules after every one, then checks the saved design matches what is open.

Operations that keep these rules (and the bugs they replaced, 28 Sept 2026):

- Which board a layer is on comes from where it is (`boardFor`): add, paste, paste in place, merge down, merge visible,
  stamp, flatten, nudge and moves in the Layers panel all use it. Rasterize and merge down keep the board.
- Locks are checked in the store: Delete, the number fields, flip and rotate refuse locked layers and say so; a marquee
  skips locked layers and layers in hidden groups (at any depth).
- Removing layers releases anything clipped to them (`releaseOrphans`).
- Grouping and reordering never place a layer in the middle of a group it does not join.
- Undo keeps the current selection and board when they still exist, otherwise restores the step's.
