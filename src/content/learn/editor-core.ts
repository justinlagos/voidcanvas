import type { Article } from '../types'

// Editor core: the layout, layers, groups, masks, blending, selections, type, shapes and the pen,
// the brand kit and colour. Every label, shortcut and number here is taken from src/editor.

export const articles: Article[] = [
  // ─── Editor tour ─────────────────────────────────────────────────
  {
    slug: 'editor-tour',
    title: 'Find your way around the Editor',
    summary: 'What each part of the Editor does: the menu bar, file tabs, tool rail, options bar, canvas, panels and status bar.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['layers', 'workspaces-and-panels', 'command-palette-and-menus', 'designing-on-a-phone'],
    keywords: 'layout interface ui toolbar tool bar panels dock menu status bar options bar getting started photoshop photopea',
    body: [
      { t: 'p', text: "This is a map of the Editor screen, top to bottom and left to right. Once you know where each thing lives, you can find any tool or setting without hunting, and the rest of the Editor articles will make more sense." },
      { t: 'p', text: "The layout follows Photoshop and Photopea on purpose. If you have used either, the menus, tool keys and panel names will feel familiar. The Editor uses Ctrl on Windows and Linux and Cmd on a Mac: wherever this article says Ctrl, Mac users press Cmd." },
      { t: 'try', label: 'Open the Editor', href: '/editor' },

      { t: 'h', text: 'The menu bar' },
      { t: 'p', text: "Across the top: **File**, **Edit**, **Image**, **Layer**, **Select**, **Filter**, **View**, **Window** and **Help**. Every command in the Editor lives in one of these menus, with its shortcut shown beside it. The same list feeds the command palette ({{Ctrl+K}}) and the keyboard shortcuts, so a command always has the same name everywhere." },
      { t: 'list', items: [
        "Click a menu to open it, then slide across the bar and the next menu opens under the pointer, like a desktop app. Arrow keys move through items and Escape closes.",
        "Press Alt on its own to jump into the menu bar from the keyboard.",
        "With no design open, only File, Window and Help are available.",
        "On a narrower window, such as a tablet, the menus fold into a single **Menu** button so everything still fits.",
      ] },
      { t: 'p', text: "The white **V** button at the far left holds links to **Home and all designs**, **Studio: briefs and brand**, **Effects: one-click looks** and **Quick tools**, plus **Preferences…** and **Your privacy**." },
      { t: 'p', text: "In the middle of the bar is the design name. Click it to rename the design. Beside it a dot and a label tell you where the work is: **Saved on this device**, **Saving**, or **Private session, not saved**. On the right are **Undo**, **Redo**, **Search** (the command palette), **Add** (photos, text, shapes, a blank layer, your logos, adjustments and filters) and **Export**." },

      { t: 'h', text: 'File tabs' },
      { t: 'p', text: "Under the menu bar, each open design has its own tab with a close button. Switching tabs saves the design you are leaving. The **New design** button on the tab bar takes you back to the start screen to open or create another. See [Saving and your files](/learn/saving-and-your-files) for where designs are kept." },

      { t: 'h', text: 'The options bar' },
      { t: 'p', text: "The thin bar below the tabs changes with the tool in your hand. It holds the settings you reach for most while using that tool, so you rarely need a panel. A few examples:" },
      { t: 'table', head: ['Tool', 'What the options bar shows'], rows: [
        ['Move', '**Move settings** (Auto-select, Layer or Group, Transform controls, Distances), six align buttons, two distribute buttons and **Transform…**'],
        ['Brush and eraser', 'Size, Hardness, Opacity, Flow, Smoothing, and pen pressure switches for size and opacity'],
        ['Selection tools', 'New, add, subtract and intersect buttons, Feather, **Select subject** and **Select and mask…**'],
        ['Shape', 'Rectangle, Ellipse, Polygon or star, Line, and Points and Star depth for polygons'],
        ['Crop', 'Free, 1:1, 4:5, 16:9, 9:16 and 3:2, then Apply or Cancel'],
      ] },
      { t: 'p', text: "During a free transform ({{Ctrl+T}}) the bar switches to the transform modes with **Apply (Enter)** and **Cancel (Esc)**. When a selection is active and you are using a non-selection tool, the right end of the bar offers **Copy to layer**, **Make mask**, **Invert** and **Deselect**." },

      { t: 'h', text: 'The tool rail' },
      { t: 'p', text: "The column of tools on the left. Hover a tool to see its name and shortcut. A small triangle in the corner of a tool means it holds a family of related tools: right-click it, or press and hold, to pick another. Pressing Shift with a tool key cycles through its family, so {{Shift+L}} switches between the lasso and the polygonal lasso." },
      { t: 'p', text: "At the bottom of the rail are the **Main colour** and **Second colour** chips, a swap arrow ({{X}}), a reset to black and white ({{D}}), and the quick mask toggle ({{Q}}). [Colour and swatches](/learn/colour-and-swatches) covers these in detail." },
      { t: 'tip', text: "Want the tools nearer your work? Drag the grip at the top of the rail onto the canvas, or choose Window, Floating tools. The floating panel can be moved anywhere, reshaped from one tall column to one long row by dragging its corner, collapsed to just the current tool, and docked again with its dock button." },

      { t: 'h', text: 'The canvas' },
      { t: 'p', text: "Your design sits in the middle. Getting around:" },
      { t: 'keys', rows: [
        ['Space', 'Hold and drag to pan with any tool'],
        ['Ctrl+0', 'Fit on screen'],
        ['Ctrl+1', '100%'],
        ['Ctrl++', 'Zoom in'],
        ['Ctrl+-', 'Zoom out'],
        ['Shift+2', 'Fit selected layers'],
        ['Ctrl+R', 'Show or hide rulers'],
      ] },
      { t: 'p', text: "Ctrl plus the mouse wheel, or a trackpad pinch, also zooms. The middle mouse button pans. With the Move tool and one layer selected, a small **floating action bar** appears above the layer with the next things you are likely to want: **Remove background** and **Filters** for photos, **Edit text** plus font and colour for text, and a **More** menu with **Centre on page**, **Duplicate**, **Clip to below** and **Delete**. Turn it off with View, Contextual action bar." },

      { t: 'h', text: 'Panels on the right' },
      { t: 'p', text: "By default the right side shows just two panels: **Properties** on top and **Layers** below. This is the **Simple** workspace, set up so a quick job needs nothing else. Properties changes with what is selected: with nothing selected it shows the design size and **Background** colour; with a photo selected it shows **Quick actions** such as Remove background, Mirror and Flip; with text it shows the Type settings." },
      { t: 'p', text: "Every other panel is one click away under the **Window** menu: Channels, Paths, History, Colour and swatches, Adjustments, Character, Paragraph, Info, Brand kit, Navigator, Layer styles and Brief. Window, Workspace switches to a fuller layout (**Essentials**, **Photo**, **Design** or **Minimal**). Panels can be resized, collapsed, merged into tab groups and pulled out as floating windows: see [Workspaces and panels](/learn/workspaces-and-panels)." },

      { t: 'h', text: 'The status bar' },
      { t: 'p', text: "The strip along the bottom shows, from left to right: the zoom percentage (click it, type a number and press Enter), the design size in pixels (and dpi if one is set), the pointer position, a hint for the current tool, and the save state. Once a design gets heavy, it also shows how much memory the layers and undo history are using. There is a **Feedback** button at the right end. Hide the bar with View, Status bar." },

      { t: 'h', text: 'Make it fit your screen' },
      { t: 'list', items: [
        "**Window, Interface size** sets menus, panels and tools to 90%, 100%, 110%, 125%, 140% or 150%. Preferences has a finer slider from 80% to 160%. The canvas is never scaled.",
        "**Compact** and **Comfortable** density are in the same menu.",
        "**View, Touch mode (bigger controls)** makes controls larger for tablets. With a pen in use, fingers pan instead of painting. A two-finger tap undoes and a three-finger tap redoes.",
      ] },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: "Below 768 pixels wide the Editor uses a layout built for phones: a top bar with back, the design name, undo, redo and **Share**, the canvas, a **Layers** button with a count, and five modes along the bottom (**Select**, **Text**, **Image**, **Shape**, **Effects**). The other desktop tools are under More tools in the Select sheet. See [Designing on a phone](/learn/designing-on-a-phone)." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Press {{?}} for the shortcut sheet. It is built from the same list as the menus, so it is always complete.",
        "Can't find a command? Press {{Ctrl+K}} and type what you want to do. See [Command palette and menus](/learn/command-palette-and-menus).",
        "If a panel you expect is missing, check the Window menu. Window, Workspace, Reset workspace puts the current workspace back as it started.",
      ] },
    ],
  },

  // ─── Layers ──────────────────────────────────────────────────────
  {
    slug: 'layers',
    title: 'Work with layers',
    summary: 'Layer kinds, stacking order, hiding, locking, renaming, duplicating, merging, colour labels and finding layers in a busy design.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['groups-align-guides', 'masks', 'blend-modes-and-opacity', 'editor-tour'],
    keywords: 'layers panel stack order reorder hide show lock unlock rename duplicate copy merge flatten rasterize colour label find layer',
    body: [
      { t: 'p', text: "Every photo, word and shape in a design is its own layer, stacked on top of each other. Working in layers means you can move, change or delete one thing without touching the rest. This article covers the Layers panel and everything you can do with a layer." },

      { t: 'h', text: 'Kinds of layer' },
      { t: 'table', head: ['Kind', 'What it is', 'Stays editable'], rows: [
        ['Image (pixels)', 'A photo, a pasted image, or a blank layer you paint on', 'Pixels can be painted and erased'],
        ['Text', 'Type you can retype, restyle and resize', 'Yes, until you rasterize or merge it'],
        ['Shape', 'Rectangle, ellipse, polygon or star, line, or a pen path, with fill and outline', 'Yes, until you rasterize or merge it'],
        ['Adjustment', 'Curves, levels, hue and saturation and the rest, or a filter. Changes every layer beneath it', 'Yes, always'],
      ] },
      { t: 'p', text: "Groups and boards also appear in the panel, as headers with the layers they hold listed under them. See [Groups, align and guides](/learn/groups-align-guides) and [Artboards](/learn/artboards)." },
      { t: 'p', text: "To add a layer, use the **Add** button in the menu bar (Photo, Text, Shape, Blank layer), the **New layer** button at the bottom of the Layers panel ({{Ctrl+Shift+N}}), or drop or paste an image onto the canvas." },
      { t: 'note', text: "When you paint with the Brush on a photo you brought in, your strokes go on a new layer above it, so the photo stays untouched." },

      { t: 'h', text: 'Stacking order' },
      { t: 'p', text: "The top of the list is the front of the design. Drag a layer up or down the list to change its place. Dropping a layer between two members of a group puts it in that group; dragging it away from its group takes it out." },
      { t: 'keys', rows: [
        ['Ctrl+Shift+]', 'Bring to front'],
        ['Ctrl+]', 'Bring forward'],
        ['Ctrl+[', 'Send backward'],
        ['Ctrl+Shift+[', 'Send to back'],
        ['[ or ]', 'Send back or bring forward one step (when a brush tool is not in your hand)'],
      ] },
      { t: 'p', text: "The same commands are in Layer, Arrange." },

      { t: 'h', text: 'Selecting layers' },
      { t: 'list', items: [
        "Click a row to select that layer. **Shift-click** selects every layer between the current one and the one you click. **Ctrl-click** adds or removes one layer.",
        "On the canvas, with the Move tool ({{V}}), click something to select it. Shift-click adds another. Drag across empty canvas to select every layer the box touches.",
        "If **Auto-select** is off (in the options bar under Move settings), Ctrl-click on the canvas still picks the layer under the pointer.",
      ] },

      { t: 'h', text: 'Hide, show and solo' },
      { t: 'p', text: "Click the eye on a row to hide or show the layer. **Alt-click** the eye to show only that layer and hide the rest; Alt-click it again to bring everything back. Hidden layers are left out of exports." },

      { t: 'h', text: 'Rename, duplicate and delete' },
      { t: 'list', items: [
        "**Rename:** double-click the name, or right-click and choose Rename. Press Enter to finish.",
        "**Duplicate:** {{Ctrl+J}}, Layer, Duplicate layer, or the floating action bar. The copy is named with \"copy\" on the end and sits 16 pixels down and to the right, so you can see it.",
        "**Delete:** press Delete, click the bin on the row or at the bottom of the panel, or drag a layer, group or board onto the bin.",
      ] },
      { t: 'warn', text: "If there is an active pixel selection, {{Ctrl+J}} copies the selected pixels to a new layer, and Delete clears the selected pixels instead of deleting the layer. Press {{Ctrl+D}} to deselect first if you meant to act on the whole layer." },

      { t: 'h', text: 'Blend, opacity and locks' },
      { t: 'p', text: "The top of the Layers panel has a folding section called **Blend, opacity and locks**. It stays folded until something is set, so a simple design shows just the list. Open it for the blend mode, **Opacity**, **Fill** and four locks. Blend modes and fill have their own article: [Blend modes and opacity](/learn/blend-modes-and-opacity)." },
      { t: 'table', head: ['Lock', 'What it stops'], rows: [
        ['Lock transparent pixels', 'Painting outside what is already there. Good for recolouring a shape or a cut-out without spilling over its edges.'],
        ['Lock image pixels', 'Any painting on the layer'],
        ['Lock position', 'Moving the layer'],
        ['Lock all', 'Moving and painting'],
      ] },
      { t: 'p', text: "A locked layer shows a padlock on its row. Click the padlock to unlock everything on that layer. Hover an unlocked row and click its open padlock to lock it completely. Align and distribute leave layers with Lock all where they are. A layer with Lock all cannot be picked by clicking the canvas: select it in the Layers panel instead." },

      { t: 'h', text: 'Merge, rasterize and flatten' },
      { t: 'list', items: [
        "**Merge down** joins the selected layer with the one below into a single image layer, named after the lower one.",
        "**Merge visible** ({{Ctrl+Shift+E}}) joins everything visible.",
        "**Stamp visible to new layer** ({{Ctrl+Alt+Shift+E}}) makes a new image layer of everything you can see and leaves the originals alone. Handy before retouching.",
        "**Rasterize layer** turns a text or shape layer into pixels.",
        "**Flatten image** joins every layer into one.",
      ] },
      { t: 'warn', text: "Merging or rasterizing turns text and shapes into pixels, and you can no longer retype or restyle them. Stamp visible is the safer choice when you only need a flat copy to work on." },

      { t: 'h', text: 'Colour labels' },
      { t: 'p', text: "Right-click a layer and pick one of the colour dots at the bottom of the menu: red, orange, yellow, green, blue, violet or grey. A stripe in that colour appears on the left of the row. Labels are just for you: use them to mark finished parts, layers for a client's review, or everything that belongs to one idea. The crossed dot removes the label." },

      { t: 'h', text: 'Find a layer' },
      { t: 'p', text: "In a busy design, click **Find layers** (the magnifier at the bottom left of the panel). A search row appears in the panel header, under Blend, opacity and locks; open that section if it is folded. Pick a kind (**All**, **Pixels**, **Text**, **Shapes** or **Adjustments**) and type part of a name. For text layers the search also looks at the words themselves." },

      { t: 'h', text: 'More from the row and the right-click menu' },
      { t: 'list', items: [
        "**Ctrl-click a thumbnail** to select that layer's pixels. Add Shift to add to the selection, or Alt to subtract.",
        "An **fx** badge means the layer has layer styles. Click it to edit them. See [Layer styles](/learn/layer-styles).",
        "A chain icon means the layer is linked to others (Layer, Link layers). Linked layers move together.",
        "Right-click any row for Blending options, Duplicate, Delete, Rename, clipping masks, masks, Select layer pixels, Group, Link, copy and paste layer style, Rasterize, the merges and Flatten image.",
      ] },
      { t: 'p', text: "The buttons along the bottom of the panel are, from left to right: Find layers, Link layers, Layer style, Add mask, New adjustment layer, New group ({{Ctrl+G}}), New layer and Delete layer." },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: "Tap the **Layers** button at the top right of the canvas (it shows how many layers there are) to open the Layers panel as a sheet. Tapping a layer on the canvas opens the **Select** sheet, which has **Bring forward** and **Send back** under Order, plus Duplicate, Delete and an Opacity slider." },
    ],
  },

  // ─── Groups, align and guides ────────────────────────────────────
  {
    slug: 'groups-align-guides',
    title: 'Group, align and space layers precisely',
    summary: 'Select several layers, group them, align and distribute them, and use smart guides, rulers, guides and snapping to place things exactly.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['layers', 'layout-and-composition', 'shapes-and-pen', 'artboards'],
    keywords: 'group ungroup folder multi select align centre center distribute spacing smart guides snap snapping rulers guides grid columns nudge position x y width height',
    body: [
      { t: 'p', text: "Good layouts depend on things lining up. This article shows you how to select several layers at once, keep related layers together in groups, align and space them evenly, and use snapping and guides so edges meet exactly where you intend." },
      { t: 'p', text: "Shortcuts below use Ctrl. On a Mac, press Cmd instead." },

      { t: 'h', text: 'Select several layers' },
      { t: 'list', items: [
        "On the canvas with the Move tool ({{V}}): Shift-click each layer, or drag a box across empty canvas to pick every layer it touches.",
        "In the Layers panel: Shift-click to select a range, Ctrl-click to add or remove one.",
      ] },
      { t: 'p', text: "Drag any selected layer and the rest come with it. With two or more selected, a box with four corner handles appears around them all: drag a corner to scale the whole selection together. Text sizes, shape outlines and rounded corners scale with it, so the set keeps its proportions." },

      { t: 'h', text: 'Groups' },
      { t: 'p', text: "A group keeps layers that belong together, such as a logo lock-up or a price badge, as one unit you can move, hide, fade or lock." },
      { t: 'steps', items: [
        "Select the layers you want to group.",
        "Press {{Ctrl+G}}, or click **New group** at the bottom of the Layers panel, or choose Layer, Group layers. Properties also offers **Group these layers** when several are selected.",
        "Double-click the group name in the Layers panel to rename it.",
      ] },
      { t: 'list', items: [
        "Click a group header to select everything in it. The arrow on the header collapses or expands the group.",
        "The group's eye hides the whole group, and its padlock locks every layer inside.",
        "Groups can hold other groups. Grouping layers that already fill a group moves that group inside the new one, so nesting is kept.",
        "Select a layer inside a group and the panel header shows the group's own blend mode and opacity. A group starts on **Pass through**, meaning its layers blend with the design as if they were not grouped.",
        "**Ungroup** with {{Ctrl+Shift+G}}, Layer, Ungroup, or the **Ungroup** button in Properties. The layers stay where they are.",
      ] },
      { t: 'tip', text: "If you often want to drag whole groups on the canvas, open **Move settings** in the options bar and set Auto-select to **Group**. A click then picks the outermost group instead of the single layer." },
      { t: 'p', text: "**Link layers** (Layer menu, or the chain button in the Layers panel) is a lighter option: linked layers move together but stay where they are in the stack." },

      { t: 'h', text: 'Align and distribute' },
      { t: 'p', text: "With the Move tool, the options bar has six align buttons: left, centres, right, tops, middles and bottoms. The same buttons are in the Properties panel and in Layer, Align." },
      { t: 'list', items: [
        "**One layer selected:** it aligns to the page. Aligning centres and then middles puts it dead centre. (The floating action bar's More menu has **Centre on page** for exactly this.)",
        "**Several layers selected:** they align to each other, using the box around all of them.",
        "**Distribute horizontally** and **Distribute vertically** need three or more layers. The two outer layers stay put and the ones between are moved so the gaps are equal.",
      ] },
      { t: 'p', text: "For exact numbers, select one layer and open **Position** in Properties. Type into **X**, **Y**, **W** or **H** and press Enter." },

      { t: 'h', text: 'Smart guides and snapping' },
      { t: 'p', text: "As you drag a layer, it snaps to the edges and centre of the page, to your guides, and to the edges and centres of other layers. A line shows what it snapped to. Distances to the nearest neighbouring layers are shown in pixels while you drag, which makes even spacing easy to judge by eye." },
      { t: 'keys', rows: [
        ['Alt (while dragging)', 'Move freely without snapping'],
        ['Shift (while dragging)', 'Move in a straight line, horizontally or vertically'],
        ['Shift (while rotating)', 'Rotate in 15 degree steps'],
        ['Arrow keys', 'Nudge by 1 pixel'],
        ['Shift+arrow keys', 'Nudge by 10 pixels'],
        ['Ctrl+Shift+;', 'Turn snapping on or off'],
      ] },
      { t: 'p', text: "Snapping checks the last 40 layers in the stack for edges, which keeps it quick in big designs. Distances can be switched off under Move settings." },
      { t: 'note', text: "Corner handles resize in proportion. Hold Shift while dragging a corner to stretch freely. Text always keeps its proportions, and the side handles of a text box change its width so the words reflow instead of stretching." },

      { t: 'h', text: 'Rulers and guides' },
      { t: 'steps', items: [
        "Press {{Ctrl+R}} (View, Rulers) to show the rulers.",
        "Drag from the top ruler to make a horizontal guide, or from the left ruler for a vertical one.",
        "To move a guide, drag it with the Move tool. If a layer is under the guide, hold Ctrl as you press.",
        "To delete a guide, drag it back onto its ruler.",
      ] },
      { t: 'p', text: "For a grid, choose View, Guides, **New guide layout…**. Set **Columns**, **Rows**, **Margin (px)** and **Gutter (px)**, or start from a preset: **12 column web**, **Thirds**, **2 columns print** or **Safe margins**. **New guide…** places a single guide at an exact position, and **Clear guides** removes them all." },
      { t: 'keys', rows: [
        ['Ctrl+R', 'Rulers'],
        ['Ctrl+;', 'Show or hide guides'],
        ['Ctrl+Alt+;', 'Lock guides, so they cannot be dragged by accident'],
      ] },
      { t: 'p', text: "At 800% zoom and above a pixel grid appears, useful for icons and small graphics. Turn it off with View, Pixel grid. Guides are saved with the design." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**A layer will not move or align.** It is probably locked. Look for a padlock on its row in the Layers panel.",
        "**Things jump when I drag.** That is snapping. Hold Alt while dragging, or turn off View, Snap.",
        "**Distribute is greyed out.** It needs at least three layers selected.",
        "**Align moved my layer to the page edge, not the other layer.** With one layer selected, alignment is to the page. Select both layers first.",
      ] },
    ],
  },

  // ─── Masks ───────────────────────────────────────────────────────
  {
    slug: 'masks',
    title: 'Hide and show parts of a layer with masks',
    summary: 'Layer masks, masks from a selection, vector masks, clipping masks and quick mask: hide parts of a layer without deleting anything.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['selections', 'remove-background', 'layers', 'shapes-and-pen'],
    keywords: 'mask layer mask hide reveal non-destructive clipping mask clip to below vector mask quick mask cut out blend fade',
    body: [
      { t: 'p', text: "A mask hides parts of a layer without deleting them. Paint to hide, paint again to bring it back, and the original pixels are always there underneath. Use masks whenever you might change your mind: cut-outs, fading a photo into a background, or limiting an adjustment to one area." },

      { t: 'h', text: 'How a layer mask works' },
      { t: 'p', text: "A mask is a greyscale picture attached to a layer. Where the mask is white, the layer shows. Where it is black, the layer is hidden. Greys in between make the layer partly see-through, which is how soft edges and fades work. In the Layers panel the mask appears as a second thumbnail beside the layer's own." },

      { t: 'h', text: 'Add a mask' },
      { t: 'steps', items: [
        "Select the layer.",
        "In Properties, under **Mask**, click **Add mask**. You can also use the mask button at the bottom of the Layers panel, or Layer, Layer mask, **Add layer mask**.",
        "The new mask is all white, so nothing is hidden yet, and you are now painting on the mask.",
      ] },
      { t: 'p', text: "If you make a selection first, the button reads **Mask from selection**: the selected area stays visible and the rest is hidden. Layer, Layer mask, **Mask hiding the selection** does the opposite." },

      { t: 'h', text: 'Paint on the mask' },
      { t: 'p', text: "While the mask is active, the options bar says **Painting on the mask: Brush shows, Eraser hides.**" },
      { t: 'list', items: [
        "**Brush** ({{B}}) brings back parts of the layer.",
        "**Eraser** ({{E}}) hides them.",
        "Lower **Hardness** for soft edges, and lower **Opacity** or **Flow** to fade gradually. A large soft brush at low flow is the easiest way to blend a photo into a background.",
      ] },
      { t: 'p', text: "Only the Brush and Eraser paint on masks. To go back to working on the layer's pixels, click the layer's row, click **Done painting mask** in Properties, or press Escape." },

      { t: 'h', text: 'Mask thumbnail shortcuts' },
      { t: 'table', head: ['Action', 'What happens'], rows: [
        ['Click the mask thumbnail', 'Paint on the mask'],
        ['Alt-click the mask thumbnail', 'View the mask on its own, in black and white. Alt-click again or press Escape to go back.'],
        ['Shift-click the mask thumbnail', 'Turn the mask off or on without deleting it'],
      ] },
      { t: 'p', text: "Properties also has **Turn off**, **Invert** and **Delete mask**. Invert swaps what is hidden and what shows." },

      { t: 'warn', text: "Adding a layer mask to a text or shape layer turns it into pixels first, so you can no longer retype or restyle it. To keep it editable, use a vector mask or a clipping mask instead (below)." },

      { t: 'h', text: 'Vector masks' },
      { t: 'p', text: "A vector mask is a path instead of painted pixels. It stays sharp at any size, and it works on text and shape layers without rasterizing them." },
      { t: 'steps', items: [
        "Select the layer and choose Layer, Vector mask, **Add vector mask (reveal all)**. It starts as a rectangle around the layer.",
        "The Direct Select tool ({{A}}) is picked for you. Drag the points to change the shape, or draw into it with the Pen.",
        "In Properties, **Feather** (0 to 100 px) softens the edge.",
      ] },
      { t: 'p', text: "If you have already drawn a path, **Vector mask from current path** uses it. **Rasterize** turns the vector mask into a normal layer mask. Its thumbnail in the Layers panel works like a layer mask's: click to edit the points, Shift-click to turn it off." },

      { t: 'h', text: 'Clipping masks' },
      { t: 'p', text: "A clipping mask shows a layer only where the layer directly below it has something. Put a photo above a text layer and clip it, and the photo fills the letters. Both layers stay fully editable." },
      { t: 'steps', items: [
        "Place the layer you want to show above the layer that should act as the shape.",
        "Press {{Alt+Ctrl+G}}, choose Layer, **Create clipping mask**, or use **Clip to below** in the floating action bar's More menu.",
        "Move or scale the clipped layer to change what shows inside the shape.",
      ] },
      { t: 'p', text: "Clipped layers are indented in the Layers panel with a small arrow. Several layers can clip to the same base. Press {{Alt+Ctrl+G}} again, or choose **Release clip**, to undo it. A layer can only clip to an image, text or shape layer directly below it in the same group and board." },

      { t: 'h', text: 'Other ways to make a mask' },
      { t: 'list', items: [
        "**Remove background** hides the background with a mask instead of deleting it. See [Remove a background](/learn/remove-background).",
        "**Select and mask…** ({{Ctrl+Alt+R}}) refines a difficult edge such as hair, then sends the result to a **Layer mask** or a **New layer with mask**.",
        "**Mask from path** (Layer, Layer mask) masks the selected layer with a saved path from the Paths panel.",
        "Adjustment and filter layers take masks too. If you paint on an adjustment layer, a mask is added for you, so you can limit the adjustment to one area.",
      ] },

      { t: 'h', text: 'Quick mask' },
      { t: 'p', text: "Quick mask is a way to paint a selection rather than draw it. Press {{Q}} (or click the quick mask button at the bottom of the tool rail). The Brush adds to the selection and the Eraser removes from it, shown as a coloured overlay. Press {{Q}} again to turn it back into a normal selection. See [Selections](/learn/selections)." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**Painting changes the picture instead of hiding it.** You are on the layer, not the mask. Click the mask thumbnail first.",
        "**The Clone stamp says to switch from the mask.** Only the Brush and Eraser work on masks. Click the layer's row to paint on its pixels.",
        "**Create clipping mask is greyed out.** The layer below must be an image, text or shape layer (not an adjustment) in the same group and board.",
      ] },
    ],
  },

  // ─── Blend modes and opacity ─────────────────────────────────────
  {
    slug: 'blend-modes-and-opacity',
    title: 'Use blend modes, opacity and fill',
    summary: 'The 16 blend modes, what each family does, and when to use opacity, fill or a group blend.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['layers', 'layer-styles', 'adjustment-layers', 'masks'],
    keywords: 'blend mode blending multiply screen overlay soft light color burn dodge difference luminosity opacity transparency fill opacity pass through',
    body: [
      { t: 'p', text: "Opacity decides how much of a layer you see. A blend mode decides how its colours mix with the layers underneath. Together they let you add texture, tint a photo, knock out a white background or make light effects without painting a single pixel." },

      { t: 'h', text: 'Where to set them' },
      { t: 'list', items: [
        "**Properties panel:** open the **Layer** section for an **Opacity** slider and a **Blend** menu.",
        "**Layers panel:** open **Blend, opacity and locks** at the top for the blend menu, **Opacity** and **Fill**. Changes here apply to every selected layer at once.",
        "**Keyboard:** with a layer selected, press a number key. {{1}} is 10%, {{5}} is 50%, {{0}} is 100%.",
        "**Phone:** the Select sheet has an Opacity slider.",
      ] },
      { t: 'note', text: "With the Brush, Eraser, Clone stamp, Paint bucket or Gradient in your hand, the number keys set the tool's opacity instead of the layer's." },

      { t: 'h', text: 'Opacity or fill' },
      { t: 'p', text: "**Opacity** fades the whole layer, including its layer styles. **Fill** fades only the layer's own pixels and keeps its styles at full strength. Set a text layer's fill to 0 and keep its stroke style, and you get outlined text with nothing inside. Fill is also in the Layer styles panel." },

      { t: 'h', text: 'The blend modes' },
      { t: 'p', text: "The **Blend** menu lists 16 modes. They fall into families, and once you know the families you rarely need to try them all." },
      { t: 'table', head: ['Family', 'Modes', 'What happens', 'Use it for'], rows: [
        ['Normal', 'Normal', 'The layer covers what is below', 'Almost everything'],
        ['Darken', 'Multiply, Darken, Color burn', 'Only darker colours come through. White disappears.', 'Scanned ink, line art or a logo on white; shadows; paper textures'],
        ['Lighten', 'Screen, Lighten, Color dodge', 'Only lighter colours come through. Black disappears.', 'Light leaks, glows, sparks and bokeh shot on black'],
        ['Contrast', 'Overlay, Soft light, Hard light', 'Darks get darker and lights get lighter. Mid grey disappears.', 'Adding texture or grain, boosting punch, tinting with a colour layer'],
        ['Inversion', 'Difference, Exclusion', 'Colours are subtracted from what is below', 'Graphic, glitchy effects; checking two versions line up (identical areas go black)'],
        ['Colour', 'Hue, Saturation, Color, Luminosity', 'Takes one part of the colour from the layer and the rest from below', '**Color** tints a photo while keeping its detail. **Luminosity** changes lightness only.'],
      ] },

      { t: 'h', text: 'Three recipes' },
      { t: 'h3', text: 'Drop a logo on white onto a photo' },
      { t: 'p', text: "Place the logo above the photo and set it to **Multiply**. The white vanishes and the dark logo sits on the image. This works best with dark marks; for a clean cut-out use a mask or Remove background instead." },
      { t: 'h3', text: 'Add paper texture' },
      { t: 'p', text: "Put a texture photo at the top of the stack, set it to **Overlay** or **Soft light**, and bring the opacity down to around 20% to 40%. Soft light is the gentler of the two." },
      { t: 'h3', text: 'Tint a photo with a brand colour' },
      { t: 'p', text: "Add a shape or a filled layer in the colour over the photo, set it to **Color**, and lower the opacity until the tint feels right. For two-colour looks, a Gradient map adjustment gives more control: see [Adjustment layers](/learn/adjustment-layers)." },

      { t: 'h', text: 'Groups, styles and adjustments' },
      { t: 'list', items: [
        "**Groups** have their own blend mode and opacity, shown in the Layers panel header when a layer inside the group is selected. The default, **Pass through**, lets each layer inside blend with the design as normal. Any other mode blends the group as one flattened picture.",
        "**Layer styles** such as drop shadow and glow each have their own blend mode and opacity inside the Layer style dialog.",
        "**Adjustment and filter layers** have opacity and blend too. Lowering a filter's opacity is the simplest way to soften it.",
      ] },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Blend modes act on everything visible beneath the layer, including other groups and the background colour. If a mode looks wrong, check what is underneath.",
        "On a transparent background, Multiply and Screen have nothing to mix with. Add a background colour or layer to see their effect.",
        "Merging or flattening bakes the blend into pixels, so the result cannot be changed later.",
      ] },
    ],
  },

  // ─── Selections ──────────────────────────────────────────────────
  {
    slug: 'selections',
    title: 'Select part of an image',
    summary: 'Marquee, lasso, polygonal lasso, magic wand, object select and select subject, plus adding, subtracting, feathering and refining selections.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['masks', 'remove-background', 'retouching', 'ai-on-this-device'],
    keywords: 'selection select marquee rectangle ellipse lasso polygonal magic wand tolerance object select subject feather expand contract inverse deselect colour range refine edge hair quick mask cutout',
    body: [
      { t: 'p', text: "A selection marks the part of the image you want to work on. While it is active, painting, filling and deleting only affect the selected area, and you can turn it into a mask or a new layer. This article covers every selection tool and how to combine and refine what you select." },
      { t: 'p', text: "Shortcuts use Ctrl. On a Mac, press Cmd." },

      { t: 'h', text: 'The selection tools' },
      { t: 'table', head: ['Tool', 'Key', 'Best for'], rows: [
        ['Rectangle select', 'M', 'Boxes, crops, straight-edged areas'],
        ['Ellipse select', 'Shift+M', 'Circles and ovals'],
        ['Lasso', 'L', 'Rough freehand areas'],
        ['Polygonal lasso', 'Shift+L', 'Straight-sided objects: click point to point, then double-click or click the first point to close'],
        ['Object select', 'W', 'An object in a photo: drag a box round it and the edges are found for you'],
        ['Magic wand', 'Shift+W', 'Flat areas of one colour, such as a plain sky or a studio backdrop'],
      ] },
      { t: 'p', text: "The Select menu adds **Subject** (finds the main subject of the whole image), **Colour range…** (everything close to one colour), and **Layer pixels** (everything on the selected layer). You can also Ctrl-click a layer's thumbnail in the Layers panel to select its pixels." },

      { t: 'h', text: 'Add, subtract and intersect' },
      { t: 'p', text: "The first four buttons in the options bar set what a new selection does: **New selection**, **Add to selection**, **Subtract from selection** and **Intersect with selection**. You can also hold keys as you start dragging:" },
      { t: 'keys', rows: [
        ['Shift', 'Add to the selection'],
        ['Alt', 'Subtract from the selection'],
        ['Shift+Alt', 'Keep only where the old and new selections overlap'],
      ] },
      { t: 'p', text: "To draw a perfect square or circle, start dragging first, then hold Shift." },

      { t: 'h', text: 'Magic wand settings' },
      { t: 'list', items: [
        "**Tolerance** (0 to 255, default 32): how different a colour can be and still be picked. Raise it if the selection stops short; lower it if it leaks into the subject.",
        "**Contiguous:** on, it only picks connected pixels. Off, it picks that colour everywhere in the image.",
        "**Sample all layers:** on, it looks at the whole visible design. Off, only the selected layer.",
      ] },

      { t: 'h', text: 'Object select and Select subject' },
      { t: 'p', text: "Both run a small model in your browser. Nothing is uploaded. The first time, you are asked before the model downloads, and after that it works offline." },
      { t: 'list', items: [
        "**Select subject** (options bar, or Select, Subject) uses MODNet, about 26 MB, which is tuned for people.",
        "**Object select** uses BiRefNet lite (about 115 MB) when your browser supports WebGPU, which handles any kind of subject, and MODNet otherwise.",
      ] },
      { t: 'p', text: "More on the models in [AI on this device](/learn/ai-on-this-device)." },

      { t: 'h', text: 'Feather and modify' },
      { t: 'p', text: "A hard selection edge can look cut out. Feathering softens it so edits fade in." },
      { t: 'list', items: [
        "**Feather** in the options bar (0 to 200 px) applies to the next selection you draw with the rectangle, ellipse, lasso or polygonal lasso.",
        "**Select, Modify, Feather…** ({{Shift+F6}}) softens the selection you already have.",
        "The Modify menu also has **Expand…**, **Contract…**, **Smooth…** (rounds off jagged corners) and **Border…** (a ring along the edge). Each takes a value from 1 to 200 px.",
      ] },

      { t: 'h', text: 'Refine a tricky edge' },
      { t: 'p', text: "For hair, fur or soft edges, choose **Select and mask…** ({{Ctrl+Alt+R}}, or the button in the options bar). It opens a workspace of its own:" },
      { t: 'list', items: [
        "Three brushes: **Refine edge brush** (paint over hair and the edge is worked out from the surrounding colours), **Add to selection** and **Remove from selection**, with a **Brush size** slider.",
        "**View** shows the result as Overlay, On black, On white, Black and white or On transparency, so you can check the edge against different backgrounds.",
        "**Edge** settings: Radius, Smooth, Feather, Contrast and Shift edge.",
        "**Clean up colour fringes** removes the halo of old background colour, with an Amount slider.",
        "**Send to:** Selection, Layer mask, New layer with mask, or New layer.",
      ] },

      { t: 'h', text: 'Paint a selection with quick mask' },
      { t: 'p', text: "Press {{Q}}. The Brush now adds to the selection and the Eraser takes away, shown as a tinted overlay. Soft brushes give soft selection edges. Press {{Q}} again to finish. This is often quicker than a lasso for organic shapes." },

      { t: 'h', text: 'Using a selection' },
      { t: 'p', text: "While a selection is active and you switch to another tool, the right end of the options bar offers **Copy to layer**, **Make mask**, **Invert** and **Deselect**. Also:" },
      { t: 'keys', rows: [
        ['Ctrl+A', 'Select all'],
        ['Ctrl+D', 'Deselect'],
        ['Ctrl+Shift+D', 'Reselect the last selection'],
        ['Ctrl+Shift+I', 'Inverse'],
        ['Ctrl+J', 'Copy the selected pixels to a new layer'],
        ['Delete', 'Clear the selected pixels'],
        ['Esc', 'Deselect'],
      ] },
      { t: 'list', items: [
        "Brush strokes, fills and gradients stay inside the selection.",
        "**Edit, Fill…** ({{Shift+F5}}) and **Edit, Stroke selection…** fill or outline the selection.",
        "**Image, Crop to selection** crops the design to it.",
        "**Select, Save selection** stores it in the Channels panel so you can load it again later (Ctrl-click the channel). **Make work path from selection** traces it into a path.",
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**Painting does nothing.** You may be painting outside an active selection. Press {{Ctrl+D}} to deselect.",
        "**Delete cleared pixels instead of removing the layer.** With a selection active, Delete clears the selected pixels. Deselect first to delete the layer.",
        "**The wand picks too much or too little.** Adjust Tolerance, or turn Contiguous on.",
        "**Select subject did not load.** The model needs to download once. Check your connection and try again.",
      ] },
    ],
  },

  // ─── Type ────────────────────────────────────────────────────────
  {
    slug: 'type',
    title: 'Add and style text',
    summary: 'Type straight onto the canvas, choose Google fonts or your own font files, and set character and paragraph options, outline and shadow.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['typography-fundamentals', 'brand-kit', 'layer-styles', 'shapes-and-pen'],
    keywords: 'text type typography font google fonts upload font file otf ttf woff paragraph text box wrap leading tracking kerning letter spacing line height outline stroke shadow caps',
    body: [
      { t: 'p', text: "Text in Voidcanvas is typed straight onto the canvas and stays editable: you can retype, restyle and resize it at any time. This article covers adding text, picking fonts, the Character and Paragraph settings, and outline and shadow." },

      { t: 'h', text: 'Add text' },
      { t: 'steps', items: [
        "Press {{T}} for the Type tool.",
        "**Click** for a single line of text that grows as you type (point text). **Drag a box** for a paragraph that wraps inside it.",
        "Type. A small bar above the text lets you change the font, make it smaller or larger, and pick a colour.",
        "Click **Done**, press Escape, or press {{Ctrl+Enter}} to finish. Enter on its own starts a new line.",
      ] },
      { t: 'p', text: "The **Add** button's Text tile does the same without a tool: it drops a new line of text in the middle of the design. New headings start bold; new paragraphs start regular weight with more generous line spacing. If you leave a new text layer empty, it is removed when you click away, so stray clicks never leave blank layers behind." },
      { t: 'p', text: "To edit existing text, double-click it with the Move tool, or select it and press Enter. The Type section in Properties also has a box with the text in it, for people who prefer typing into a form." },

      { t: 'h', text: 'Fonts' },
      { t: 'p', text: "The font menu lists 16 built-in Google fonts: Inter, Poppins, Montserrat, Space Grotesk, DM Sans, Archivo Black, Bebas Neue, Oswald, Anton, Playfair Display, DM Serif Display, Lora, Fraunces, Caveat, Permanent Marker and JetBrains Mono. Fonts used in the design that are not in this list appear first, marked **(in this design)**." },
      { t: 'h3', text: 'Any Google font' },
      { t: 'p', text: "Open the **Character** panel (Window, Character). In the search box, type the name of any family on Google Fonts and press Enter, or click **Use \"name\" from Google Fonts**. Type the name exactly as Google spells it." },
      { t: 'h3', text: 'Your own font files' },
      { t: 'p', text: "In the Character panel, click **Add a font file from this device** and choose a .ttf, .otf, .woff or .woff2 file. The font stays on your device and is saved inside the design, so it opens correctly next time. It is never requested from Google." },
      { t: 'note', text: "Fonts from Google are fetched from Google Fonts. Only the font name is requested; your design is never sent. See [Privacy and data](/learn/privacy-and-data)." },
      { t: 'p', text: "When you open a design or PSD that uses a font this device cannot find, a dialog lists each missing font and how many text layers use it. Pick a replacement, or click **Add font file**." },

      { t: 'h', text: 'Character settings' },
      { t: 'p', text: "The Character panel holds the full set. The most used ones are also in Properties under Type (click **More type options**)." },
      { t: 'table', head: ['Setting', 'What it does'], rows: [
        ['Size (px)', 'Height of the letters'],
        ['Weight', '100 to 900. Variable fonts take any weight in that range'],
        ['Leading (×)', 'Space between lines, as a multiple of the size. 1.1 to 1.2 suits headlines, 1.4 to 1.6 suits body text. Called Line spacing in Properties'],
        ['Tracking (px)', 'Even space between all letters. Called Letter spacing in Properties. A little extra helps text set in capitals'],
        ['Word spacing (px)', 'Extra space between words'],
        ['Baseline shift (px)', 'Moves the text up or down'],
        ['Width (%)', 'Uses the font\'s width axis, from 50 to 200, when the family has one'],
        ['B, I', 'Bold and italic'],
        ['Underline, Strikethrough', 'Lines under or through the text'],
        ['TT, Tt', 'All caps and small caps'],
        ["Use the font's kerning", 'The font\'s own spacing between letter pairs. Leave it on'],
      ] },

      { t: 'h', text: 'Paragraph settings' },
      { t: 'p', text: "The **Paragraph** panel (Window, Paragraph) sets alignment (**Align left**, **Centre**, **Align right**, **Justify**), **Wrap in a text box** with a **Box width**, **First-line indent** and **Space after paragraph**. It also tells you how many lines the text runs to." },
      { t: 'list', items: [
        "Justify needs a text box to spread lines across. Turn on Wrap in a text box first.",
        "Drag a text box's side handles to change its width: the text reflows rather than stretching.",
        "Dragging a corner scales the text, and the font size is updated to match, so the number in the panel stays true.",
      ] },

      { t: 'h', text: 'Outline and shadow' },
      { t: 'p', text: "In Properties under Type, open **More type options**:" },
      { t: 'list', items: [
        "**Outline:** click Add, pick a colour, then set **Outline width**.",
        "**Shadow:** click Add, pick a colour, then set **Shadow opacity**, **Shadow blur**, **Shadow across** and **Shadow down**.",
      ] },
      { t: 'p', text: "For more control, such as glows, gradient fills or an outline in a set position, use [Layer styles](/learn/layer-styles), which work on text too." },

      { t: 'h', text: 'Type on a path' },
      { t: 'p', text: "With the Type tool, click on the outline of the selected shape, or on the path selected in the Paths panel, and the text flows along it. Properties then shows **Start along the path**, **Lift off the path**, **Flip side**, **Edit the path** and **Release from path**. See [Shapes and the Pen](/learn/shapes-and-pen) for drawing paths." },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: "Tap **Text** in the bottom bar, then **Add heading** or **Add paragraph**. With a text layer selected, the same sheet offers fonts, a Size slider, Regular or Bold, alignment and Colour. Tap a text layer, then **Edit text**, to retype it." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The font looks wrong or falls back to a plain font.** The name may be misspelled, or the font is not on Google Fonts. Add the font file instead.",
        "**Justify does nothing.** Point text has no width to justify across. Turn on Wrap in a text box.",
        "**I added a mask and now I cannot edit the text.** A layer mask turns text into pixels. Undo, then use a vector mask or a clipping mask. See [Masks](/learn/masks).",
      ] },
    ],
  },

  // ─── Shapes and the pen ──────────────────────────────────────────
  {
    slug: 'shapes-and-pen',
    title: 'Draw shapes and paths with the Pen',
    summary: 'Rectangles, ellipses, polygons, stars and lines, then the Pen, Curvature pen, Freeform pen and Direct select for custom vector shapes and paths.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['masks', 'type', 'groups-align-guides', 'colour-and-swatches'],
    keywords: 'shape rectangle ellipse circle polygon star line pen tool bezier curve path vector anchor points direct select pathfinder unite subtract svg outline stroke rounded corners',
    body: [
      { t: 'p', text: "Shape layers are vector: they stay crisp at any size, and their fill, outline and corners can be changed at any time. This article covers the Shape tool for quick geometric shapes and the Pen tools for anything custom, plus the Paths panel and Pathfinder." },
      { t: 'p', text: "Shortcuts use Ctrl. On a Mac, press Cmd." },

      { t: 'h', text: 'Draw a shape' },
      { t: 'steps', items: [
        "Press {{U}} for the Shape tool.",
        "In the options bar choose **Rectangle**, **Ellipse**, **Polygon or star** or **Line**.",
        "Drag on the canvas. Hold Shift to keep it even (a square or circle). A click without dragging makes a 300 pixel shape.",
        "The Move tool is picked for you afterwards, so you can place and resize the shape straight away.",
      ] },
      { t: 'p', text: "New shapes are filled with the main colour. Lines use the main colour as a 6 pixel outline. The **Add** button's Shape tile drops a square in the middle of the design." },
      { t: 'h3', text: 'Polygons and stars' },
      { t: 'p', text: "With Polygon or star chosen, set **Points** (3 to 40) and **Star depth** (0% to 90%). At 0% you get a regular polygon; raise Star depth to pull the inner points in and make a star. Both can be changed later in Properties." },

      { t: 'h', text: 'Style a shape' },
      { t: 'p', text: "Select the shape and use the **Style** section in Properties:" },
      { t: 'list', items: [
        "**Fill** and **Outline:** Add or Remove each, and pick a colour.",
        "**Outline width:** 1 to 120 px.",
        "**Rounded corners** for rectangles, up to half the shorter side.",
        "**Ends** (Flat, Round, Square) and **Corners** (Sharp, Round, Bevel) for outlines.",
        "For shapes drawn with the Pen: **Stroke position** (Inside, Centre, Outside) and **Dashes** (Solid, Dashed, Dotted, Dash dot).",
      ] },
      { t: 'p', text: "Resizing a shape changes its real width and height, so outlines and corners stay the thickness you set. Shapes also take drop shadows (the **Shadow** section) and every layer style." },

      { t: 'h', text: 'The Pen tools' },
      { t: 'p', text: "Press {{P}} for the Pen. {{Shift+P}} cycles through the family: **Pen**, **Curvature pen**, **Freeform pen** and **Direct select**. Direct select also has its own key, {{A}}, and edits the points." },
      { t: 'h3', text: 'Pen' },
      { t: 'list', items: [
        "Click to place a corner point. Click and drag to place a curve point and pull out its handles.",
        "Click the first point to close the shape. Press Enter to finish an open path.",
        "Hold Shift to keep lines and handles to 45 degree steps. Hold Alt while dragging to break a handle so the curve can turn a corner. Hold Space while dragging to move the point you are placing.",
        "Hold Ctrl to switch to Direct select for as long as you hold it.",
        "With **Auto add/delete** on, hovering a line lets you click to add a point, and hovering a point lets you click to remove it.",
      ] },
      { t: 'h3', text: 'Curvature pen' },
      { t: 'p', text: "Click points and a smooth curve flows through them, with the handles worked out for you. Double-click or Alt-click for a corner. Drag a point to reshape. It is the easiest way to draw smooth organic shapes." },
      { t: 'h3', text: 'Freeform pen' },
      { t: 'p', text: "Draw freely and smooth curves are fitted when you let go. **Curve fit** (0.5 to 10 px) sets how closely it follows your hand: lower keeps more detail and more points. Turn on **Magnetic** to trace along edges in a photo, with **Width** (how far to look for an edge) and **Contrast** (how strong an edge must be)." },

      { t: 'h', text: 'Shape or path' },
      { t: 'p', text: "The Pen tools have two modes in the options bar:" },
      { t: 'table', head: ['Mode', 'Makes', 'Use it for'], rows: [
        ['Shape', 'A shape layer, filled with the main colour (untick **Fill** for none) and outlined in the second colour at the **Stroke** width you set (0 means no outline)', 'Icons, badges, custom graphics'],
        ['Path', 'A path in the Paths panel, with no layer', 'Precise selections, masks, strokes, text on a path'],
      ] },
      { t: 'p', text: "The next menu sets how a new part combines with the shape: **Normal** (overlaps make holes), **Combine**, **Subtract**, **Intersect** or **Exclude**. Hold Shift as you start a part to add it to the selected shape layer." },

      { t: 'h', text: 'Edit points with Direct select' },
      { t: 'list', items: [
        "Drag points, handles or the line itself to reshape.",
        "Shift-click, or drag a box, to pick several points. {{Ctrl+A}} picks every point. Alt-click the line to pick the whole path.",
        "Arrow keys nudge picked points by 1 pixel, or 10 with Shift. Delete removes them.",
        "**Corner** and **Smooth** in the options bar convert the picked points.",
        "**Path…** in the options bar has more: join picked end points, cut the path at a point, average points, close, reverse and simplify.",
      ] },

      { t: 'h', text: 'The Paths panel' },
      { t: 'p', text: "Open it from Window, Paths. Each saved path is listed with a preview. Double-click to rename. The buttons turn the selected path into something useful: **Make selection** (or Ctrl-click the path, or {{Ctrl+Enter}}), **Make shape**, **Fill with colour**, **Stroke**, **Layer mask**, **From selection** (trace the current selection into a path), **Duplicate** and **Export SVG**." },

      { t: 'h', text: 'Pathfinder' },
      { t: 'p', text: "Select two or more shape layers and use Pathfinder (in Properties under Style, or Layer, Pathfinder) to combine them into new shapes:" },
      { t: 'table', head: ['Command', 'Result'], rows: [
        ['Unite', 'One shape covering all of them'],
        ['Minus front', 'The back shape with the front ones cut out'],
        ['Minus back', 'The front shape with the back ones cut out'],
        ['Intersect', 'Only the area where they overlap'],
        ['Exclude', 'Everything except the overlap'],
        ['Divide', 'Separate pieces wherever they cross'],
      ] },
      { t: 'p', text: "**Outline stroke** turns an outline into a filled shape, so it scales and combines like any other. **Expand parts** bakes combined parts into one clean path." },

      { t: 'h', text: 'Take paths elsewhere' },
      { t: 'p', text: "Layer, Path, **Copy path as SVG** puts the path on your clipboard to paste into Figma or code. **Export path as SVG…** downloads it as a file. **Copy shape outline to Paths** turns a shape layer's outline into a saved path." },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: "Tap **Shape** in the bottom bar for Rectangle, Circle, Line and Polygon. With a shape selected, the sheet has Fill and Stroke colour chips. The Pen tools are under More tools in the Select sheet." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**My shape has a hole where parts overlap.** The part mode is Normal, where overlaps make holes. Set it to Combine, or use Pathfinder, Unite.",
        "**The Pen made a path but no layer.** It is in Path mode. Switch to Shape, or click Make shape in the Paths panel.",
        "**Stroke position and Dashes are missing.** They appear for shapes drawn with the Pen, once the shape has an outline.",
      ] },
    ],
  },

  // ─── Brand kit ───────────────────────────────────────────────────
  {
    slug: 'brand-kit',
    title: 'Keep brand colours, fonts and logos ready',
    summary: 'Save your brand colours, fonts and logos once, and have them ready in every design you open in the Editor.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['colour-and-swatches', 'type', 'brands-library', 'brand-guidelines'],
    keywords: 'brand kit brand colours fonts logos palette house style consistent on brand assets identity',
    body: [
      { t: 'p', text: "The brand kit holds the colours, fonts and logos you use again and again. Set it up once and they are ready in every design: brand colours sit first in your swatches, new text starts in your brand font, and your logos are one click away in the Add menu." },
      { t: 'p', text: "There is one brand kit, kept on this device and shared by all your Editor designs. If you work for several clients, Studio's brands library keeps a separate brand for each one: see [Brands library](/learn/brands-library)." },

      { t: 'h', text: 'Set up the brand kit' },
      { t: 'steps', items: [
        "Open **Edit, Brand kit…** (it is also the **Edit brand kit** button in the Brand kit panel).",
        "Under **Colours**, click **Add colour**, pick the colour, then click away to add it. Repeat for each brand colour. Hover a colour and click its cross to remove it.",
        "Under **Fonts**, click each brand font to switch it on. They are numbered in the order you pick them. **The first one becomes the default for new text.**",
        "Under **Logos**, click **Add logo** and choose one or more image files. PNG or SVG with a transparent background works best.",
      ] },
      { t: 'p', text: "Changes save as you make them. There is no save button." },
      { t: 'tip', text: "Pick your display font first and your body font second. Headlines added with the Type tool then start in the display font, and you can switch a paragraph to the second font with one click in the Brand kit panel." },

      { t: 'h', text: 'Use it while you design' },
      { t: 'h3', text: 'Colours' },
      { t: 'list', items: [
        "When you open a design, brand colours are placed first in its swatches. They appear in the colour picker under **This design** and in Properties when nothing is selected.",
        "The **Colour and swatches** panel has a **Brand kit** row.",
        "In the **Brand kit** panel (Window, Brand kit), click a colour to make it the main colour. **Alt-click** it to apply it straight to the selected text or shape.",
      ] },
      { t: 'h3', text: 'Fonts' },
      { t: 'list', items: [
        "New text starts in the first brand font.",
        "In the Brand kit panel, select a text layer and click a font to apply it.",
      ] },
      { t: 'h3', text: 'Logos' },
      { t: 'list', items: [
        "Click **Add** in the menu bar. Your logos appear under **Your logos**. Click one to place it as a new layer.",
      ] },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "The brand kit's font list is the 16 built-in fonts. You can still use any Google font or a font file of your own in a design, through the Character panel. See [Type](/learn/type).",
        "The kit is stored in this browser on this device. Another browser or computer has its own kit. To move work between devices, export your designs.",
        "A design keeps up to 21 swatches, with brand colours first.",
        "Designs opened from a Studio job with a brand attached also get a brand check in the **Brief** panel: off-brand colours, fonts that are not the brand's, and logos below the minimum size or crowded inside their clear space, each with a Fix or Select button.",
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Colour and swatches ─────────────────────────────────────────
  {
    slug: 'colour-and-swatches',
    title: 'Pick, save and apply colour',
    summary: 'The main and second colours, the colour picker, swatches, the eyedropper, gradients, the paint bucket and Fill.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['brand-kit', 'colour-that-works', 'shapes-and-pen', 'blend-modes-and-opacity'],
    keywords: 'colour color picker hex rgb hsl swatches palette eyedropper colour picker tool sample gradient paint bucket fill foreground background main colour second colour',
    body: [
      { t: 'p', text: "This article shows where colour lives in the Editor and how to pick it, save it and put it on your design. Most tools use the **main colour**; a few also use the **second colour**. Knowing which does what saves a lot of clicking." },

      { t: 'h', text: 'Main and second colour' },
      { t: 'p', text: "At the bottom of the tool rail are two overlapping squares. The front one is the **Main colour**; the one behind is the **Second colour**." },
      { t: 'table', head: ['Uses the main colour', 'Uses the second colour'], rows: [
        ['Brush, Paint bucket, new text, new shapes, Fill path, Stroke path', 'The end of a Gradient, and the outline of shapes drawn with the Pen'],
      ] },
      { t: 'keys', rows: [
        ['X', 'Swap main and second colour'],
        ['D', 'Reset to black and white'],
      ] },
      { t: 'p', text: "Click either square to open the colour picker. When you close it, the colour is added to the design's swatches." },

      { t: 'h', text: 'The colour picker' },
      { t: 'list', items: [
        "Drag in the large square to set how rich and how light the colour is, and along the strip below to choose the hue.",
        "Type an exact **Hex** value and press Enter, or set **R**, **G**, **B** (0 to 255) or **H** (0 to 360), **S** and **L** (0 to 100).",
        "The eyedropper button beside the hue strip picks a colour from anywhere on your screen, even outside the browser. It needs a browser with a screen eyedropper; if yours has none, you are pointed to the Eyedropper tool.",
        "**This design** shows the design's swatches. **Recent** shows the last 12 colours you used in the picker.",
      ] },
      { t: 'p', text: "Colour fields in Properties, such as a shape's Fill or a text Colour, use a compact field: a swatch that opens your system's colour chooser, a hex box, and **Add** or **Remove** where having no colour is allowed." },

      { t: 'h', text: 'Swatches' },
      { t: 'p', text: "Open the **Colour and swatches** panel from Window. At the top, choose whether you are setting **Main** or **Second**, then pick. Below the picker:" },
      { t: 'list', items: [
        "**Save swatch** adds the current colour to the design's swatches. Right-click a swatch to remove it. A design keeps up to 21.",
        "**Used in this design** lists the colours already on your text and shapes, so you can match them.",
        "**Brand kit** shows your brand colours. See [Brand kit](/learn/brand-kit).",
      ] },
      { t: 'p', text: "With nothing selected, the Properties panel also shows the design's swatches under **Colours**. Click one to make it the main colour." },

      { t: 'h', text: 'The Eyedropper tool' },
      { t: 'p', text: "Press {{I}} and click the canvas to make that colour the main colour; it is also added to the swatches. **Alt-click** to set the second colour instead. The Eyedropper samples what you see, all visible layers together, and ignores fully transparent pixels." },

      { t: 'h', text: 'Gradients' },
      { t: 'steps', items: [
        "Set the main colour to where the gradient starts and the second colour to where it ends.",
        "Press {{G}} for the Gradient tool.",
        "Drag across the canvas in the direction you want the blend to run. A longer drag gives a softer blend.",
      ] },
      { t: 'p', text: "The gradient is painted onto the selected image layer, or a new layer if none is selected, and stays inside any active selection. Set its **Opacity** in the options bar. For an editable gradient, use a **Gradient overlay** layer style (from and to colours, angle and scale), or a **Gradient map** adjustment for two-colour and duotone looks." },

      { t: 'h', text: 'Paint bucket and Fill' },
      { t: 'list', items: [
        "**Paint bucket** ({{Shift+G}}): click an area to fill it with the main colour. **Tolerance** (0 to 255) sets how similar the neighbouring colours must be, **Contiguous** limits it to connected pixels, and **Opacity** sets strength. With a selection active, a click fills the whole selection.",
        "**Edit, Fill…** ({{Shift+F5}}): fills the selection, or the whole layer if nothing is selected. **Use** offers Main colour, Second colour, Custom colour, White or Black, with an **Opacity** slider.",
        "**Edit, Stroke selection…** draws a line along the selection edge with a **Width** and a **Position** (Inside, Centre, Outside).",
      ] },
      { t: 'tip', text: "Turn on **Lock transparent pixels** in the Layers panel before filling a cut-out or a painted shape. The colour then only lands where there are already pixels, so the edges stay clean." },

      { t: 'h', text: 'The background colour' },
      { t: 'p', text: "With nothing selected, Properties shows **Background** under **Design**. Pick a colour, or click **Remove** for a transparent background. PNG and WebP exports keep transparency." },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: "The main and second colour squares are not shown on a phone. Instead, the Select, Text and Shape sheets have **Colour**, **Fill** and **Stroke** chips that open your phone's colour chooser for the selected layer." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The gradient went on the wrong layer.** It paints on the selected image layer. Select an empty layer first, or add one with {{Ctrl+Shift+N}}.",
        "**The Paint bucket filled the whole layer.** Tolerance is too high, or Contiguous is off.",
        "**The screen eyedropper button does nothing.** Your browser has no screen eyedropper. Use the Eyedropper tool on the canvas.",
      ] },
    ],
  },
]
