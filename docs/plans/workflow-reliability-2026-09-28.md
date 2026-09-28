# Workflow, reliability and effect scope: the plan

Date: 28 Sept 2026. Sources:
- Justin's brief "Professional workflow intelligence + effect scope + end-to-end product reliability", with the notes on retention. (The AI connector in the same notes is out of scope: Justin, 28 Sept.)
- The four items still open from the 26 Sept audit (`plans/ux-audit-2026-09-26.md`).
- A code audit of master at 9609d24.
- Two measured sessions on the production build: an iPhone 13 (390 × 844, touch, CPU slowed 4× for the timings) and a desktop at 1440 × 900.

How the order is set: first, anything that loses a designer's work or breaks their trust. Then what blocks the phone. Then what designers repeat hundreds of times. Then new capability. The four open items are placed where their value puts them, and each is fully specified below.

## 1. What the sessions found

These were measured on the production build and can be reproduced. The scripts become the Phase 0 tests.

### Phone

| # | What happened | Priority |
|---|---|---|
| P1 | Typed a title, added a second heading, tapped Back, then reopened the design. The second heading was gone and the title read "Nigh". Autosave ran partway through the typing, 1.8 s after Add heading, and Back cancelled the next save. | P0, work lost |
| P2 | Picked Crop, dragged, tapped Done. Nothing was cropped: Done only switches back to Move, and the phone has no Apply. | P0, dead end |
| P3 | Added Blur from Effects, but the amount cannot be changed. The sheet for the filter layer offers Duplicate, Delete and Order, with no sliders, and Properties cannot be reached on a phone. | P0 |
| P4 | Moved a shape with one finger, then put a second finger down. The shape moved 351 px and no undo step was recorded. | P1 |
| P5 | A 60 px square was showing 10 px wide. Dragging its middle resized it to 4 × 4 instead of moving it. | P1 |
| P6 | On recent designs, the actions button (export, duplicate, delete) only shows on hover, so it cannot be reached by touch. | P1 |
| P7 | Turning the phone to landscape (844 × 390) brings up the desktop layout, with a tooltip stuck on screen and the status bar text over its icons. | P1 |
| P8 | Reloading shows the start screen instead of the design, with no offer to restore. | P1 |
| P9 | Group, Mask, Boards, Versions and Resize are missing on the phone, and there is no way to select several layers in the Layers sheet. | P1 |

Timings with the CPU slowed 4×:
- Start screen: 0.8 to 1.4 s.
- Photo to editable canvas: 1.8 to 3.3 s.
- Tap Add heading to typing: 1.3 to 1.5 s.

Budgets are in Phase 1.

### Desktop

| # | What happened | Priority |
|---|---|---|
| D1 | Alt-click on the canvas opens the menu bar when Alt is released. Every Alt gesture does the same: background eyedropper, clone source, zoom out, solo. | P0 |
| D2 | Merge visible with a hidden group deleted that group's layers. | P0, work lost |
| D3 | A marquee drawn over a locked layer selects it, and Delete then removes it. | P0, work lost |
| D4 | Merge down on a board leaves the result on no board, so it disappears from the Layers panel. Rasterize has the same cause in the code. | P0 |
| D5 | Paste in place while another board is active tags the layer to a board it is not on, so it is clipped away and cannot be seen. | P1 |
| D6 | After undoing "add board", the active board still points at the deleted board. | P1 |
| D7 | Ctrl+X on a layer with no pixel selection says "Cut." but leaves the layer where it is. | P1 |
| D8 | Align centre on one layer on a board centres it on the whole pasteboard (1800) instead of its board (1860). | P1 |
| D9 | Duplicating falls short: Ctrl+D does nothing to layers (it is Deselect), Alt-drag does not duplicate, Ctrl+J with two layers selected copies one, and copies are named "Rectangle copy copy". | P1 |
| D10 | Blur added while a grouped shape is active lands above the group and also blurs the photo underneath. There is no way to blur just one layer. | P1 |
| D11 | With two layers selected, Properties shows no opacity, blend or effects. | P1 |
| D12 | Reloading shows the start screen instead of the design. | P1 |
| D13 | 20 arrow presses make 20 undo steps. | P2 |
| D14 | Right-click on the canvas does nothing. | P2 |

What held up:
- 150 layers and 60 undo/redo steps: the JS heap went from 29 to 33 MB and back to 25 MB.
- Zoom redraw took 38 ms.
- Phone PNG share works.

No slowdown showed up in this short run; a real hour-long session still needs testing (section 10).

### Found in the code, to confirm with a test before fixing

- **Save marks later edits as saved.** `saveProject` marks the design saved once an async save finishes, so edits made during the save are marked clean and their own save is cancelled (`io.ts`).
- **Closing cancels the save.** Closing a design (phone Back, New) cancels the pending save (`closeDoc`, and the autosave effect in `EditorShell.tsx`).
- **Two tabs:** with one design open in two tabs, the last write wins, with no warning.
- **Deleted designs keep versions:** up to 30 version copies stay in storage.
- **Multi-board effects:** on multi-board designs, effects that depend on position (vignette, fisheye, blur at edges) render differently on the canvas and in export. Adjustment masks stretch when a board is added.
- **Studio snapshot:** it drops Cascade boards, and the master, once formats are linked. It can also make an empty version.
- **Delivery** renders the live design, not the approved version.
- **Two kinds of re-sync:** the Boards panel re-sync deletes per-format edits, while Studio "Update formats" keeps them. The same word covers both.
- **Duplicates stay linked:** duplicated layers and boards keep the original's link.
- **Export counting:** exports from the dialog are counted twice in analytics, so the feedback prompt comes early. Phone exports are not counted.

## 2. Order

| Phase | What | Size | Why here |
|---|---|---|---|
| 0 | Stop losing work | M | Work lost and destructive surprises |
| 1 | The phone, finished | L | The brief calls it critical; three dead ends measured |
| 2 | Everyday speed on desktop | M | Highest frequency |
| 3 | Versions and comments you can trust (S3, K1) | M | Delivery can ship the wrong thing today. This is also the base for returning to work |
| 4 | Effect scope | L | The core of the brief, and the biggest engine change |
| 5 | Brief check and photo page (S2, B5) | S + S | Small and self-contained |
| 6 | Export finish, and coming back to your work | M | Retention phase 1 |
| 7 | Reuse: looks, library, campaigns | L | Retention phases 2 and 3 |

Sizes: S is about a day, M two to four days, L a week or more. Each includes tests, Learn pages and shipping as `CLAUDE.md` sets out.

If you want the open items sooner, S2 and B5 can move to straight after Phase 0, because they touch nothing else. S3 and K1 should wait for Phase 0, because they change what a version stores.

Decided 28 Sept: Phase 0 first, then this order.

## 3. Phase 0: stop losing work

Each fix goes at the cause, not the symptom.

1. **Saving becomes a queue in `io.ts`, not a React effect.**
   - Every change, including a live edit, bumps a generation number. A save records the generation it captured and only marks the design saved if nothing changed since.
   - Only one save runs at a time; a change during a save queues the next one.
   - Closing, tab switch, New, Back, `pagehide` and `visibilitychange` all flush the queue and wait for it. On the phone, Back shows "Saving…" for as long as that takes.
   - Only raster layers whose `rev` changed are re-encoded, so flushing on close is fast.
2. **Reopen where you left off.**
   - After a reload or a crash, /editor opens the last design. The session marker exists already; use it for normal reloads as well as crashes.
   - Save the view per design (zoom, pan, active board, selection) and restore it on open.
   - Keep the list of open tabs.
3. **Two tabs:** a BroadcastChannel per design. The second tab says "Open in another tab. Edit here instead?" and stays read-only until the designer chooses.
4. **One rule for which board a layer is on:** `boardAt(layer)`, worked out from position (centre inside a board, otherwise the nearest board).
   - Every operation that creates or moves a layer uses it: add, paste, paste in place, merge down, merge visible, rasterize, stamp, flatten, nudge, and moves in the panel.
   - It replaces tagging layers with the active board, and fixes D4, D5 and the disappearing layers.
5. **One guard for locks:** `canEdit(layer, what)` in the store operations (delete, move, box fields, flip, rotate), instead of a check in each tool. The marquee skips locked and hidden layers, including those in hidden nested groups. Fixes D3.
6. **Merging keeps what it should.**
   - Merge visible uses the same visibility test as the renderer, parents included, so hidden layers are kept. Fixes D2.
   - Merge down merges clipped layers above it or releases them, and never leaves a clip pointing at nothing.
   - An adjustment directly above is merged in; one below stays a layer.
7. **Alt:** tapping Alt alone opens the menu only if no pointer or key was used while it was held. Fixes D1.
8. **Undo** restores the active board and a multi-selection, and board changes belong to the step. Fixes D6.
9. **Cut:** with no pixel selection it cuts the layer (copy, then delete); with a pixel selection it cuts the pixels. Fixes D7.
10. **Clean-up:** duplicates get new link ids. Deleting a design deletes its versions.
11. **Analytics:** each export is counted once, and phone exports are counted.

Tests:
- `e2e/trust.mjs`:
  - Closing within 100 ms of an edit keeps the edit, on phone and desktop.
  - Typing during a save.
  - Reload reopens the design at the same zoom and board.
  - Two tabs.
  - Every P and D case above as a regression check.
- A unit test runs a random walk of 500 store actions and checks these after every action:
  - In a board design, every layer is on a live board.
  - No clip, group or link points at nothing.
  - The history index is in range.
  - Save then load gives the same document.

## 4. Phase 1: the phone, finished

The phone is where designers continue work: open, change, export. Every core action should be two taps away. It is not a shrunken desktop.

**Layout**
- Use the phone layout when the pointer is coarse and the short side is under 600 px, in both orientations. Fixes P7.
- Tablets keep the desktop layout, with touch mode switched on automatically for coarse pointers.
- Screen edges and overlaps:
  - Respect the safe areas at the top and sides.
  - Sheets sit above the mode bar, including its safe area, and toasts sit above sheets.
  - `overscroll-behavior: none` in the editor, so pulling down does not refresh the page.
- The header shows "Saved" or "Saving…". Back flushes the save queue (Phase 0).

**The selected layer drives the controls**
- **Tapping a layer turns the Select sheet into that layer's inspector.**
  - It has the same sections as desktop Properties, as rows that open full-width controls.
  - Filter layers show their settings with presets. Fixes P3.
  - Text shows font (every font, searchable, not the first 14), size, weight, line height, letter spacing, alignment and colour.
- **Long press on the canvas or on a layer row opens a context sheet:** Duplicate, Delete, Lock, Hide, Group, Copy style, Paste style, Bring to front, Send to back, and Select layer below for objects that overlap.
- **Selecting several:**
  - A "Select several" switch in the Layers sheet (tap rows to add them).
  - Long press then tap on the canvas.
  - With several selected, opacity, align, group and delete apply to all of them.
- **Nothing core is desktop-only.** Group, ungroup, masks (add, invert, remove, paint on the mask), the boards list, versions, resize and save as template can all be reached from the inspector or the More sheet.

**Gestures: each one predictable and taught once**
- **Basic gestures:**
  - One finger on a layer moves it.
  - One finger on empty canvas pans. The marquee lives behind "Select several".
  - Two fingers pinch to zoom and pan.
  - Double tap on text edits it; double tap on empty canvas fits the design to the screen.
- **Move then pinch:** if a second finger lands during a move, the move is saved as its own undo step before the pinch starts. Fixes P4.
- **Handles:**
  - Every handle has a touch area of at least 44 px, placed outside the layer when the layer is small.
  - Dragging inside the layer always moves it. Fixes P5.
  - Rotate uses a handle below the box, also with a 44 px target.
- **Reordering in the Layers sheet** uses a drag handle built on pointer events, so it works on touch.

**Text and the keyboard**
- Add `interactive-widget=resizes-content` to the viewport meta tag. `visualViewport` resize and scroll events put the view back when the keyboard closes.
- While typing, a small bar sits above the keyboard: font, size, weight, colour, alignment, Done.
- Saving works while the keyboard is open, through the Phase 0 queue.

**Finished flows**
- Crop shows the box with handles and a "Cancel · Apply" pill. Fixes P2.
- Free transform works the same way.
- Recent designs show when they were last edited and a visible ⋯ button. Fixes P6.

**Speed budgets** (CPU slowed 4×, iPhone 13 size). Profile first, then fix what the profile shows:

| Step | Now | Budget |
|---|---|---|
| Add heading to caret | 1.3 s | under 400 ms |
| Photo to canvas | 1.8 to 3.3 s | under 1.5 s |

Undo history memory is capped at 300 MB on phones; it is 1200 MB now.

**Tests:** `e2e/phone.mjs` runs on an iPhone SE (375 × 667), iPhone 13, Pixel 7 (412 × 915), a phone in landscape and an iPad (820 × 1180). It checks:
- The poster journey (section 10), start to finish, with touch driven through CDP.
- Every gesture above.
- Crop and Apply, and changing a filter's amount.
- The keyboard opening and closing, simulated by resizing the viewport.
- No sideways scrolling and nothing under the safe areas.
- The speed budgets, with the CPU slowed.

## 5. Phase 2: everyday speed on desktop

Each change is scored for how often it happens (Freq), how much it annoys now (Pain), how much else it improves (Reach), and how risky it is to build (Risk). H is high, M medium, L low. The top of the list comes first.

| # | Change | Freq | Pain | Reach | Risk |
|---|---|---|---|---|---|
| 1 | **Duplicate.** Alt-drag duplicates (after the Alt fix). Duplicating copies every selected layer and group, and names copies "Rectangle 2". Ctrl+D duplicates when there is no pixel selection and deselects when there is one. Moving a copy and pressing Ctrl+D again repeats the offset (step and repeat) | H | H | H | L |
| 2 | **Paste.** Copy keeps layers editable (layer data on the clipboard, with a PNG for other apps). Paste lands in the same place if that spot is in view, otherwise in the middle of the view, on the board underneath. Plain text pastes as a text layer and SVG as vector | H | H | H | M |
| 3 | **Several layers selected:** opacity, blend, fill, stroke, text style and effects change for all of them, with "Mixed" where values differ | H | H | H | M |
| 4 | **Align and snap.** Align and snap to the board, not the pasteboard. Key object: click one of the selected layers again. Distribute with a set gap. Snap to equal gaps, and snap while resizing | H | M | H | M |
| 5 | Copy style and paste style extended to the whole appearance: fill, stroke, type, opacity, blend, effects | M | H | H | L |
| 6 | A context menu on the canvas (right-click, or long press on touch) with the actions that fit | H | M | M | L |
| 7 | **Number fields.** X and Y relative to the board, a rotation field, aspect lock, sums ("+10", "*2", "50%"), and editing several layers at once | M | M | M | L |
| 8 | **Groups as objects.** Click selects the group, double-click goes inside, Esc goes up a level, Enter selects the children. Isolation: open a group from the panel and everything else dims, a path shows where you are, and Esc leaves | M | H | M | M |
| 9 | Select same fill, stroke, font or effect. Ctrl+A selects every layer when no pixel tool is active | M | M | M | L |
| 10 | **Nudge.** A burst of arrow presses is one undo step. A setting for the nudge distance. Linked layers follow | H | L | M | L |
| 11 | **Layers panel.** Search always visible. Esc cancels a rename. Move to group. Front and back within the group. Drag several rows at once | M | M | M | L |
| 12 | **Transform.** Alt scales from the centre. Rotate several layers. Set the pivot point | M | L | M | M |
| 13 | **Undo.** No empty steps (a resize with no change, leaving a field, closing text that did not change). Renaming a board can be undone | M | L | M | L |
| 14 | Shortcuts the browser keeps for itself in a tab (Ctrl+T, Ctrl+Shift+N, Ctrl+Shift+P) get a second key on the web, shown in the menus. The desktop app is unchanged | L | M | L | L |
| 15 | Copy merged respects boards | L | M | L | L |

Pixel selection is already well covered: expand, contract, feather, smooth, border, save selection, colour range, subject and select and mask all exist.

**Tests:** `e2e/editing.mjs` checks each behaviour, plus the combinations from the brief:
- Select, move, undo.
- Group, effect, ungroup.
- Duplicate, transform, duplicate again.
- Copy, paste, paste again.
- Lock, then try to move.
- Selecting a child in a nested group.
- Export straight after an edit, and undo after export.

## 6. Phase 3: versions and comments you can trust (S3, K1)

The Editor and Studio share one version model.

**Now**
- Editor versions are full copies of the design, up to 30. Their labels are fixed ("Saved by you", "Automatic", "Exported"), and they have no names, no compare and nothing on the phone.
- Studio versions are JPEGs with a status and no link back to the design they came from.
- Delivery renders the live design.

**Changes**
- A Studio version records the Editor version it was made from (`designVersionId`), so it can be reopened, compared and delivered exactly as it was.
- **Named versions.**
  - A version has a stage (Direction, Revision, Final) with a name you can edit, such as "Direction A" or "Client revision 2". Its status stays separate: Draft, Sent, Approved, Changes asked.
  - Editor versions can be named and renamed.
  - Automatic versions stay unnamed and are removed first when space is needed. Named and approved versions are never removed.
- **Delivery builds from the approved version's design.** If the design changed after approval, the delivery check says: "The design changed after v3 was approved. Deliver v3, or send v4 for approval." This is added to `deliveryPreflight`.
- **Snapshots** keep every board meant for review (the master and the Cascade formats) and never make an empty version.
- **Compare** two versions side by side, or with a slider, board by board.
- On the phone, the version list and restore sit in the More sheet.

**K1: comments on layers**
- **What a version stores:** when a version is made, each image records the boxes of the layers that matter (text, images, logos, shapes, but not the background), in image pixels, with layer id and name.
  - This stays on the device. The share format does not change, so clients never see layer names.
- **Matching a pin:** a client's pin is matched to the smallest visible layer under it, shown as "On: Headline".
- **Where comments show:**
  - In Studio, the pin list names the layer.
  - In the Editor, a Comments panel lists open pins for the linked version with a Select layer button, and draws pin markers on the active board.
  - Done is sent back to the client as it is today.
- **Pins follow their layer:** a pin keeps its position relative to its layer, so it moves with the layer in the next version. If the layer has changed, the pin says "Changed since the comment".

**Tests**
- Unit tests for pin matching and for which versions get removed.
- `e2e/versions.mjs` checks:
  - A version made with Cascade boards.
  - Approve it, edit the design, and delivery warns.
  - Delivering v3 matches v3's pixels.
  - A client pin maps to a layer, and the Editor panel selects it.

## 7. Phase 4: effect scope

### What exists (code audit)

**Three separate systems:**
- **Layer styles:**
  - 8 fixed kinds, one of each, in an order you can change.
  - They can be switched on and off and copied and pasted as a set.
  - They apply to the active layer only.
- **Adjustment and filter layers:** these process everything drawn below them.
  - A layer on a board is clipped to that board.
  - Inside a group, it stays within the group only when the group is isolated.
- **Text shadow and outline:** a third shadow system.

**Groups:**
- They have opacity and blend, but no effects and no mask.
- A group is isolated only when its opacity is below 100% or its blend is not pass-through, and choosing "Normal" isolates it without saying so.

**Other gaps:**
- An adjustment cannot be clipped to one layer; PSD import says so.
- With two layers selected, there is no opacity, blend or effects.

### Target model

**Every layer, group, board and the document has an ordered effect stack.** It is stored as `effects: Effect[]`, where each effect is `{ id, type, params, on, opacity, blend, mask?, link? }`.
- Pixel effects: blur, grain, noise, colour adjustments, distortion, texture. These are the existing adjustment kinds and Void effects.
- Appearance effects: shadow, glow, stroke, overlays. Today's layer styles and the text shadow and outline move here.
- Every effect can be switched off, adjusted, dragged to reorder (a badge shows when order changes the result), duplicated, removed, reset, copied, pasted, and moved to another layer.

**Scope is where the stack lives, plus one link:**

| Scope | How it works |
|---|---|
| Object | The layer's own stack |
| Selection | The same effect goes on each selected layer, sharing a `link` id. Editing one edits them all. The effect shows "On: Portrait, Texture", with Add and Unlink. Changing scope later means adding or removing a target, not starting again |
| Group, as one image | The group's stack, applied to the group composite. A group with effects always renders isolated |
| Group contents | Linked copies on each child |
| Several groups | A linked effect on each group's stack |
| Below this layer | Today's adjustment layer, with the reach made explicit: this group only, everything below, or just the layer below. The last one is clipping, and it is new; it fixes the PSD case |
| Board | The board's stack, applied to the board composite, so canvas and export match |
| Whole document | Only when chosen, and applied last |

**Leave a child out of a group effect:**
- A flag on the child does this. The group is then split at that child: each run of included children is composited and gets the effects, and the excluded child draws clean in its place.
- A blur does not cross an excluded child. This is written up in Learn.

**Group or each layer:**
- Adding an effect that works across space (blur, grain, noise, shadow, glow, distortion, texture) to a group, or to several layers in one group, asks once: "As one image" or "On each layer".
- Each choice shows a small preview, and the answer is remembered for that effect.
- Colour effects apply to the group composite without asking.

**Group compositing controls, shown only when needed:**
- "Blend as a group" (isolate) is one switch.
- Pass-through stays the default for a group with no effects.
- "Normal" and pass-through become two clearly named choices, so Normal no longer isolates without saying so.
- Group masks are new: a mask on a group masks the composite after its effects.

**Masks and effects:**
- An effect can carry its own mask, for example to blur only one area.
- Shadows still come from the visible shape, because styles already run after the mask.

**Compare:** hold `\` to see before and after, or switch off all effects. Both only change the view.

### Controls (no new panels)

- **Properties gets an Effects section for the selection.**
  - "+ Effect" lists effects that fit. For a group it also offers: Blend as a group, Add mask, Apply to contents.
  - Each row has an eye, the name, the amount, a ⋯ menu (duplicate, copy, move to, reset, remove) and a drag handle.
- **The canvas context menu adds:** Copy effects, Paste effects (add), Paste effects (replace), Paste appearance.
- **Command search** finds every effect and every scope action.
- **The phone** gets the same Effects section in its inspector.

### Engine work

- **Caching and preview:**
  - Each target's effects are cached by its content revision plus the settings; group composites are cached too.
  - The 1200 px working preview stays, but settings stop depending on resolution, so preview and export agree.
- **Multi-board fixes:** board and adjustment effects run on the board's area on both the canvas and in export, and masks are stored in board coordinates.
- **File format:** `.void` version 4. Readers for version 3 can still open it; effects they do not know are kept and flagged with a warning.
- **PSD import** maps clipped adjustments and group masks.
- **The Effects page** can send an effect to the selected layer of an open design, as an editable effect, and can stack more than one effect.

### Order inside the phase

1. A parity harness first: the canvas and export must match pixel for pixel, within a threshold, for 30 combinations of effect and scope.
2. The data model and migration, still using the old render paths.
3. Group composite effects.
4. Linked effects across a selection.
5. The controls.
6. The Effects page.

Risk: high. How it's contained:
- Migration unit tests on every fixture design and PSD.
- A render snapshot of every existing effect, taken before and after.

**Tests**
- Unit tests for stack order, links, splitting around excluded children, and migration.
- `e2e/effects-scope.mjs` checks each NIGHT SESSION case from the brief by its pixels, with undo, redo, save, reload and export for each.

## 8. Phase 5: brief check (S2) and the photo page (B5)

### S2: brief check

**Now:**
- `readBrief` takes the first date and price it finds and says nothing about what is missing.
- Formats come from keywords, and sizes like "1080x1350" are not read.

**The check:** `intelligence/brief.ts` `briefCheck(fields, text, today)` looks for:
- **Missing details:** date, time, venue (for events), call to action, contact, formats or sizes, logo or brand, deadline.
- **Conflicts:**
  - Two different dates, or two different prices.
  - A weekday that does not match the date ("Friday 12 October" when 12 October 2026 is a Monday).
  - A date that has passed.
  - A deadline after the event.
- **Sizes in the text:** "1080x1350", "A4", "A3 poster", "300 x 250".

**Where it shows:**
- **In the Brief tab:**
  - A "Worth asking the client" list, each line showing the text it came from.
  - "Copy as questions" gives a short plain email with the questions.
- **Brief details drive the formats:** the date, venue and price are linked to the text layers made from them. Changing the date once in the brief updates every format. This is the start of the campaign idea in the retention notes.
- **In the Editor,** the Brief panel checks each board, not the whole document at once.

### B5: photo page in the guideline

- **In the builder:** a Photography section takes up to three photos. They are kept in the draft and saved with the client brand as its imagery.
- **A new `photo` page:**
  - Each photo is shown with the logo placed by `placeOnPhoto`, labelled Suggested. It picks the least busy corner that is not the subject, the version of the logo that holds up there, and a scrim only if one is needed.
  - Next to it, the placement to avoid (over the subject, or the busy corner), marked Incorrect.
- **In the Editor,** placing a brand logo on a photo uses the same corner choice.
- **Tests:**
  - Unit tests already cover `placeOnPhoto`.
  - An e2e test uploads a photo in the builder and checks that the page renders, that the logo goes in the light corner, and that the reversed logo goes in the dark one.

## 9. Phase 6: export finish, and coming back to your work

### Export

Destination presets and preflight shipped on 28 Sept. Still to build:
- **Export what you select:** the selected layers or a group, trimmed, at any scale.
- **All boards at once** with a naming pattern (`{design}_{board}_{w}x{h}`), as a zip.
- **Remembered choices:** export settings are saved per design, not just for the current page session.
- **An export record per design:** when, which boards and which format.
  - It shows on the design card and in the dialog: "Last exported 2 hours ago: 2 of 4 boards".
- **After export,** an "Also needed?" line lists formats not made yet (Story, LinkedIn, A4), taken from the existing Formats. It can be ignored and never pops up.
- **Better file types:**
  - Print PDF pages become lossless, or keep text as vectors, instead of JPEG.
  - Whole designs export as SVG, with text and shapes as vectors and images embedded.
- **Tests:**
  - Every board is exported once and compared with the canvas.
  - File naming.
  - Remembered settings survive a reload.

### Coming back (the brief's retention phase 1)

- **Home works like a desk.**
  - "Continue" cards show the preview, when it was last edited, and what is unfinished: "2 of 4 formats exported", "Waiting for client", "Changes asked".
  - A card opens the design exactly where you left it, using the view saved in Phase 0.
- **Work in progress** means one of these:
  - Edited in the last 30 days and not exported.
  - Only partly exported.
  - A Studio job with open pins.
- **A quiet count on Home** of what is there: designs, brands, templates, exports.
  - No streaks, no nagging, and no "we miss you" emails.
- **After export,** "Use this again" offers Save as template (which exists already) and Duplicate as variation.
- **Analytics for coming back:**
  - New events: `doc.open` with where it came from (home, recent, file, link), `doc.resume` after a reload or crash, `save.failed`, `version.make`, `version.restore`, `variation.make`, `template.use`, `storage.full`.
  - Activation: the first export of a design that was edited.
  - North star: successful workflows per active creator. These are create, edit, export; open, change, save; master, formats, export; brand, template, new design.
- **Accounts stay optional,** and guest work stays on the device.
  - Sync for designs remains the Pro item already planned in `plans/desktop-and-sync.md`.

## 10. Journey tests (brief sections 33 to 43)

**`e2e/journeys.mjs`** runs the poster journey from the brief on desktop and on a phone. The steps:
1. New poster.
2. Add an image and remove its background.
3. Add type and duplicate the title.
4. Group, then put a colour treatment on the group.
5. Mask the portrait.
6. Add grain.
7. Make a variation.
8. Resize.
9. Export.
10. Reopen, change something, export again.

After each step, five things must agree: the store, the saved design, the design after a reload, the rendered pixels and the exported pixels.

**Other suites:**
- A soak test: a random walk of 1,000 actions, checking the Phase 0 rules after every action and the memory every 100, on desktop and phone.
- Speed budgets on the phone suite, with the CPU slowed.
- Every phase adds its suite to `e2e/run.mjs` when it ships.

## 11. Phase 7: reuse

- **Looks:**
  - Save an effect stack and appearance as a named Look, and apply it to any layer or group.
  - Save text styles (heading, body, caption) per design and per brand.
- **A library across designs:** logos, images, textures, colours, fonts, looks and templates, each with a "used in" count.
- **Campaigns:**
  - A Studio job is the campaign.
  - Formats and brief details are linked to layers (Phase 5).
  - "Change the date everywhere" covers every design in the job.
- **Suggestions from what is already there.**
  - Examples: "You have a brand kit for Kobo: start a campaign from it", or "You used this layout three times: save it as a template".
  - Only one at a time, and each can be turned off for good.
- **The brand system gains** colour roles (B12) and type in use (B13) from the 26 Sept audit.

## 12. Decisions (Justin, 28 Sept)

1. **No AI connector.** Taken out of the plan. The fixed encryption rule and the pricing rule stay as they are.
2. **Pricing:** unchanged. Making is free; connecting (Sync, Share, seats) is paid.
3. **Ctrl+D:** duplicates the selected layers when there is no pixel selection, and deselects when there is one. One key, and it does what the moment calls for; no keyboard setting to learn.
4. **Phone in landscape:** keeps the phone layout.
5. **Order:** Phase 0 first, then the phases in the order of section 2.

## 13. Where the plan differs from the brief, and why

- **Changing an effect's scope later** uses linked copies of one effect rather than one effect with many targets. The designer sees the same thing ("On: Portrait, Texture"), and linked copies are simpler in the engine and work with copy and paste.
- **Colour effects on a group** apply to the group as one image without asking. They look the same either way, so the question would only slow the designer down.
- **On the phone, one finger on empty canvas pans** rather than drawing a marquee. Panning is far more common on a small screen; the marquee sits behind "Select several".

## 14. Brief coverage

| Brief | Where in this plan |
|---|---|
| 1 to 13: effect scope, targets, non-destructive, groups vs children, inheritance, copying, stacks, compositing, masks, selection, contextual actions, where it applies, no extra complexity | Phase 4; Phase 2 items 3 and 5 |
| 14: scope across the whole editor | Phase 2 items 3, 4 and 8; Phase 4 scope table; Phase 6 export of a selection |
| 15 and 16: professional micro-behaviours, "why didn't it just" | Section 1; Phase 2 |
| 17 to 24: mobile | Phase 1 |
| 25 to 27: desktop blockers, unpredictable use, no dead ends | Phase 0; Phase 2 tests |
| 28 and 29: export | Phase 6 |
| 30 and 31: leaving after five seconds, visit length | Phase 1 budgets; Phase 6 Home and analytics |
| 32 and 33: every action reversible, state consistency | Phase 0 rules; section 10 |
| 34, 35, 39 to 43: stress, long sessions, journeys, behaviour | Section 10 |
| 38: blocker audit | Section 1 |
| 44 to 49: a smart editor, scoring, final standard | Phase 2 scoring; Phase 4 "asked once" |
| AI connector | Out of scope (decision 1) |
| Retention | Phase 6 (retention phase 1); Phase 7 (phases 2 and 3). Phase 4 of the notes (AI) is out of scope |

## 15. Build status

| Phase | Status |
|---|---|
| 0 Stop losing work | Done 28 Sept, desktop 0.1.23. Save queue, reopen on reload with the view, one tab per design, board rule, lock guard, merge and flatten fixes, Alt, undo keeps selection and board, cut, duplicates, one export count. Also found by the random walk and fixed: grouping and reordering could split a group; deleting a layer left clips pointing at it; a second tab was reported as a crash (and caused a hydration error). Spec `docs/saving-and-reopening.md`; tests `e2e/trust.mjs` (42 checks) and `src/editor/__tests__/invariants.test.ts` |
| 1 The phone | Done 28 Sept, desktop 0.1.24. Phone layout in both orientations (coarse pointer, short side under 600 px); sheets rest on the mode bar and open low (peek) so the canvas stays usable; Properties inside the Select sheet with finger-sized controls; Crop and Transform pills with Apply and Cancel; group, mask, boards, versions, resize, brand kit and the panels in More; pinch commits a move in progress as its own step; small layers move from inside; long press opens actions with the layers underneath; select several on the canvas and in the list; reorder grip; text keyboard focus inside the tap and the view kept above the keyboard; recents actions visible on touch; Saved/Saving in the header; phone exports save a version; 300 MB undo budget. Speed at 4x slower CPU: caret 92 ms, photo to canvas about 0.9 s. Spec `docs/phone-editor.md`; tests `e2e/phone.mjs` (iPhone SE, iPhone 13, Pixel 7, landscape, iPad) |
| 2 Desktop speed | Done 28 Sept, desktop 0.1.24. All 15 items: Alt-drag copies, Ctrl+D duplicates and repeats the step, layers copy and paste editable (in view, in place, text and SVG), several layers edited together with Mixed, align and snap to the board, key object, set gaps, equal-gap and resize snapping, copy and paste appearance, right-click menu on the canvas, number fields with sums, board-relative X and Y, rotation and pivot, keep proportions, groups picked whole with double click in and Escape out, editing a group on its own, select same, Ctrl+A for layers, nudge as one step with set distances, Layers panel search always shown, Escape cancels renames, move into or out of a group, several rows dragged together, Alt from the centre, rotate several, no empty undo steps, second keys for browser-reserved shortcuts, copy merged per board. Align and distribute treat whole groups as one object. Auto-select now defaults to Group. Spec `docs/editing.md`; tests `e2e/editing.mjs` (92 checks) |
| 3 Versions and comments | Done 28 Sept, desktop 0.1.25. Studio review versions keep the exact design they came from (an Editor version named Review vN, reused when the design has not changed) and every review board: the master plus Studio and Cascade formats, working boards left out, never empty. Versions have a stage (Direction, Revision, Final) and a name, separate from status. Approving keeps the design for good. Delivery builds from the approved design and files carry its number; the readiness check says when the design changed after approval. Editor versions can be named, kept and compared (slider or side by side, board by board); named and kept versions are never removed. Pins record the layer under them (boxes stay on the device), follow the layer, and say when it changed; the Editor has a Comments panel with Select layer, Done and Reply, and pins on the canvas. Found and fixed on the way: delivery picked the first unlinked board as the master; Window menu panels did nothing in the Simple workspace. Spec `docs/versions.md`; tests `e2e/versions.mjs` (33 checks), unit tests for pins, pruning and the delivery check |
| 4 Effect scope | Not started |
| 5 Brief check, photo page | Not started |
| 6 Export, coming back | Not started |
| 7 Reuse | Not started |
