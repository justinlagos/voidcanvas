# The phone Editor

Code: `src/editor/components/MobileEditor.tsx` (shell and sheets), `src/editor/components/PhoneContextBar.tsx`
(the selection's bar and its tool sheets), `src/editor/components/phone-ui.tsx` (sheet, rows, chips), `src/editor/touch.ts` (touch settings shared
with the canvas and the Layers list), touch handling in `src/editor/components/Stage.tsx`. Tests: `e2e/phone.mjs`
(iPhone SE, iPhone 13, Pixel 7, a phone on its side, iPad), `e2e/ux-b-mobile.mjs`, the phone part of `e2e/trust.mjs`.

## When it shows

`useIsPhone()`: a window under 768 px wide, or a coarse pointer with either side under 600 px (so a phone keeps
the layout on its side). Tablets get the desktop shell; `main.vc-touch` is added for any coarse pointer.

## Layout

- Top bar: Back (flushes the save first), the name with Saved/Saving, Undo, Redo, More, Share. Safe-area insets on
  top and sides; the mode bar pads for the bottom inset.
- Sheets sit inside the canvas area at `bottom: 0`, so they rest on the mode bar and never go under it or the home
  indicator. Messages show at the top on a phone.
- The selection's bar. Once something is picked (a tap on the canvas, a row in Layers, or something just added),
  the bottom bar becomes its tools, with Back (clears the selection, main bar again):
  - text: Edit, Font, Size, Colour, Align, Spacing;
  - photo: Crop, Replace (a new picture in the same box and layer, `ops.replaceImage`), Cut out, Mask;
  - shape: Fill, Stroke, Corners (rectangles);
  - a whole group: Ungroup; several layers: Group, Line up, Add more;
  - an adjustment: Settings first;
  - and for each: Effects, Opacity, Arrange (order, line up on the board, flip, transform), Duplicate, More (lock,
    hide, copy and paste style, transform), Delete, Settings.
  Each tool opens a short sheet with just that control (`data-ctx-sheet`). A design that opens with a layer
  selected keeps the main bar until something is picked (`vc:pick` from the canvas and the Layers list). Picking
  in Layers closes the list. Fonts are used straight away and redrawn once they have loaded.
- A sheet opened for the selection never hides it: the view slides up so the selection sits above the sheet.
- Settings (the Select sheet): action rows, then `PropertiesPanel` inside `.vc-phone-panel` (finger-sized controls
  in globals.css). It opens as a low "peek" sheet; the arrow makes it taller.
- More sheet: command search, boards, resize, versions, templates, the .void file, brand kit, History, Character,
  Paragraph, Brief and Brand panels (rendered with `PanelBody`), help and settings.
- Pills at the top of the canvas: Select several (count, Done), Crop (sizes, Cancel, Apply), Transform (Cancel,
  Apply), and any other tool (Done).

## Touch rules (Stage)

- One finger on empty canvas pans (`touchCanvas.phone`); a tap there clears the selection and picks the board; a
  double tap fits.
- A second finger during a move, resize or rotate first commits it as its own undo step, then pinches. A two-finger
  tap undoes only when both fingers came down together without work in progress.
- On a layer smaller than 88 px on screen, a finger inside the body moves it; resize handles answer only from
  outside. Handles are drawn at 14 px and the rotation handle sits 40 px below the box for coarse pointers.
- A finger has to travel 6 screen px before a move starts (3 for a mouse), so a tap or a hold never nudges a layer.
- Long press (520 ms without moving 8 px) on the canvas gives a short vibration; lifting the finger without moving
  selects the layer and sends `vc:longpress` with the layers under the finger, and the shell opens the actions
  sheet. Moving after the hold is a normal drag: resting before moving used to cancel the drag. In the Layers list
  the long press opens the actions straight away.
- `touchCanvas.several`: taps on the canvas and in the Layers list add or remove layers.
- A tap on a layer in a group picks the whole group, as a click does on desktop (`pickGroupFor`); a double tap goes
  one level inside.
- Rows in the Layers list reorder with a grip (pointer events), since HTML drag and drop does not work with fingers.
- Text: the text box is focused inside the tap (a layout effect), which phones need to open the keyboard. The view
  pans up to keep the text above the keyboard and pans back when the keyboard closes or typing ends.
  `interactive-widget=resizes-content` is set in the viewport.
- Undo history is capped at 300 MB while the phone shell is open.

## Text grows from its alignment

On phone and desktop, a text layer keeps its anchor when its size changes (typing, font, size, spacing, a brief
change): left-aligned text its left edge, centred text its middle, right-aligned text its right edge, and its top
(`keepTextAnchor` in `engine.ts`, used by `updateLayer`, `updateLayers` and `applyBrief`). Turned and flipped text
keeps the same point on the page. A change that places the layer or sizes its box itself (x, y or box width in the
change: handles, position fields) is left as it is. The editing box of an empty text layer sits around the anchor
too, so the caret starts where the text will grow from.
