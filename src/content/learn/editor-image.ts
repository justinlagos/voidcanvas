import type { Article } from '../types'

// Editor: image work. Adjustments, filters, layer styles, retouching, background removal, crop and canvas,
// and the on-device AI tools. Every label here is spelled as the Editor spells it.

export const articles: Article[] = [
  // ─── Adjustment layers ─────────────────────────────────────────────
  {
    slug: 'adjustment-layers',
    title: 'Change colour and tone with adjustment layers',
    summary: "Curves, levels, hue and saturation, exposure and the other adjustments, added as layers you can change or remove at any time without touching your pixels.",
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['filters-in-the-editor', 'masks', 'blend-modes-and-opacity', 'workflow-portrait-retouch'],
    keywords: 'adjustment layer curves levels hue saturation brightness contrast exposure vibrance colour balance color balance channel mixer photo filter gradient map duotone posterize threshold invert black and white blur temperature warmth tint lut cube colour grade non-destructive',
    body: [
      { t: 'p', text: "Adjustment layers let you brighten, recolour or grade a design without changing a single pixel underneath. You can reopen the settings, lower the strength, hide the layer or delete it later, which matters when a client asks for the photo to be a little less warm three rounds from now." },

      { t: 'h', text: 'How an adjustment layer works' },
      { t: 'p', text: "An adjustment layer has no pixels of its own. It takes everything below it in the Layers panel, changes it, and shows the result. Layers above it are not affected. Move it up and it changes more of the design; move it down and it changes less." },
      { t: 'list', items: [
        "Your original pixels are never changed. Delete the adjustment and the image is back as it was.",
        "Adjustments stack. Each one works on the result of everything below it, including other adjustments, so order matters.",
        "Opacity and blend mode work on adjustments too. Lower **Opacity** to soften an adjustment instead of reworking its settings.",
        "On a design with boards, an adjustment that belongs to a board only changes that board.",
      ] },

      { t: 'h', text: 'Add an adjustment' },
      { t: 'p', text: "There are several ways in. They all add the same kind of layer, directly above the layer you have selected. If that layer is inside a group, the adjustment goes above the whole group, so it still changes everything beneath it." },
      { t: 'list', items: [
        "**Image > Adjustments** lists every adjustment, plus **Colour lookup (.cube LUT)…**.",
        "The **Adjustments** panel (Window > Adjustments) shows them as a grid of buttons.",
        "The **New adjustment layer** button (the sliders icon) at the bottom of the Layers panel opens a short menu, which also holds **Colour match from a saved look…** and **Filter gallery…**.",
        "**Filter > Filter gallery…** has an Adjustments section with a one-line hint for each.",
        "Press {{Ctrl+K}} and type the name, for example curves. On a Mac use Cmd instead of Ctrl.",
      ] },
      { t: 'p', text: "Once added, the settings appear in the **Properties** panel. Every adjustment has a reset button (the circular arrow) at the top of its section." },
      { t: 'try', label: 'Open the Editor', href: '/editor' },

      { t: 'h', text: 'Tone: brightness, levels, curves and exposure' },
      { t: 'h3', text: 'Brightness and contrast' },
      { t: 'p', text: "Two sliders, **Brightness** and **Contrast**, each from -100 to 100. Use it for a quick lift. For anything careful, use Levels or Curves, which give you control over shadows and highlights separately." },
      { t: 'h3', text: 'Levels' },
      { t: 'p', text: "Levels fixes flat or washed-out photos. **Darkest point** sets which tone becomes pure black, **Brightest point** sets which becomes pure white, and **Midtones** moves the middle greys lighter or darker without touching the ends. Tabs for **RGB**, **R**, **G** and **B** let you set each colour channel on its own." },
      { t: 'p', text: "The **Black**, **Grey** and **White** pickers are the fastest route to a clean photo. Choose one, then click something in the image that should be pure black, neutral grey or pure white. The grey picker is the one that removes colour casts: click a grey wall or a white shirt in shade and the tint goes." },
      { t: 'h3', text: 'Curves' },
      { t: 'p', text: "Curves is the most precise tone tool. The graph runs from shadows on the left to highlights on the right. Click the line to add a point, drag a point to bend the curve, and double-click a point to remove it. Push a point up to brighten that tone range, pull it down to darken it. A gentle S shape (shadows down, highlights up) adds contrast." },
      { t: 'p', text: "Switch to the **R**, **G** or **B** tab to fix colour casts: lowering the blue curve in the highlights warms them, for example. On the **RGB** tab there are four starting points: **More contrast**, **Brighten**, **Darken** and **Faded film**." },
      { t: 'h3', text: 'Exposure' },
      { t: 'p', text: "**Exposure (stops × 100)** runs from -500 to 500, so 100 is one photographic stop brighter. **Offset** lifts or crushes the darkest tones, and **Gamma** moves the midtones. It is the right tool for a shot that is simply too dark or too bright overall." },

      { t: 'h', text: 'Colour adjustments' },
      { t: 'table', head: ['Adjustment', 'Settings', 'Use it for'], rows: [
        ['Hue and saturation', 'Hue, Saturation, Lightness, for All colours or one range', 'Shifting or boosting colour, or changing only one hue'],
        ['Vibrance', 'Vibrance, Saturation', 'Richer colour that holds back on already strong colours'],
        ['Temperature', 'Warmth, Tint', 'Warming or cooling a photo, fixing a green or magenta tint'],
        ['Colour balance', 'Cyan to red, Magenta to green, Yellow to blue, for Shadows, Midtones or Highlights, plus Keep brightness', 'Grading, such as warm shadows and cool highlights'],
        ['Photo filter', 'Filter colour, Density, Keep brightness', 'The look of a coloured lens filter'],
        ['Channel mixer', 'Red, Green and Blue for each output channel, from -200% to 200%, plus Black and white mix', 'Custom black and white, or swapping colours'],
        ['Gradient map', 'Up to five colour stops, presets, Reverse', 'Duotones and strong colour grades'],
        ['Colour lookup (LUT)', 'Strength', 'Applying a grade from a .cube file'],
        ['Colour match (look)', 'Strength', 'Matching the colour of a reference saved in Studio'],
      ] },
      { t: 'h3', text: 'Change just one colour' },
      { t: 'p', text: "Hue and saturation has buttons for **All colours**, **Reds**, **Yellows**, **Greens**, **Cyans**, **Blues** and **Magentas**. Pick one and the sliders change only that range. Each range takes full effect within 15 degrees of its centre hue and fades out by 45 degrees, so edits blend rather than leaving hard edges. Not sure which range a colour falls in? Click **Pick a colour on the image** and then click the colour. Greys have no hue, so the picker asks you to choose something with colour in it." },
      { t: 'h3', text: 'Photo filter and gradient map presets' },
      { t: 'p', text: "Photo filter starts at a **Density** of 25% and has five presets: **Warm**, **Cool**, **Sepia**, **Green** and **Deep red**. Gradient map maps the brightness of every pixel onto a row of colours: the darkest tones take the first stop and the lightest take the last. Its presets are **Black to white**, **Duotone violet**, **Sunset**, **Teal and orange** and **Newsprint**. Use **Add stop** for up to five colours and **Reverse** to flip the order." },
      { t: 'h3', text: 'LUTs and saved looks' },
      { t: 'p', text: "**Image > Adjustments > Colour lookup (.cube LUT)…** asks for a 3D .cube file, the format most grading tools export. If the file is not a 3D LUT the Editor says so and nothing is added. **Colour match from a saved look…** uses looks you saved in Studio by opening a reference in a job and choosing **Take the look**. If you have none yet, the dialog tells you how to make one." },

      { t: 'h', text: 'Special effects adjustments' },
      { t: 'table', head: ['Adjustment', 'Settings', 'What it does'], rows: [
        ['Black and white', 'Amount (0 to 100, starts at 100)', 'Removes colour. Lower Amount for a muted, part-colour look.'],
        ['Invert', 'None', 'A negative of everything below.'],
        ['Posterize', 'Levels (2 to 32, starts at 4)', 'Reduces each channel to a few flat steps for a poster look.'],
        ['Threshold', 'Level (1 to 255, starts at 128)', 'Pure black and white. Pixels brighter than Level turn white.'],
        ['Blur', 'Amount (1 to 80, starts at 8)', 'Softens everything below, for a background or a dreamy base.'],
      ] },

      { t: 'h', text: 'Limit an adjustment to part of the design' },
      { t: 'p', text: "By default an adjustment changes the whole of everything below it. There are three ways to narrow it down." },
      { t: 'steps', items: [
        "**Paint a mask.** Select the adjustment layer and paint. The Editor gives it a mask automatically and your strokes paint on the mask: the **Eraser** hides the adjustment where you paint, the **Brush** brings it back. See [Masks](/learn/masks).",
        "**Start from a selection.** Make a selection, select the adjustment layer, then choose **Layer > Layer mask > Add layer mask**. The mask matches the selection.",
        "**Put it in a group.** Select the adjustment and the layers it should change and group them ({{Ctrl+G}}), then set the group's blend to anything other than **Pass through** (Normal works), or lower the group's opacity. A group set up that way is flattened on its own first, so the adjustment inside only reaches the layers inside it.",
      ] },
      { t: 'note', text: "Adjustment layers cannot be used as clipping masks, and a layer cannot clip to an adjustment. Use a mask or a group instead." },

      { t: 'h', text: 'Compare before and after' },
      { t: 'p', text: "Hold {{\\}} (backslash) to hide every adjustment and filter while the key is down. A label at the top of the canvas reads **Before: adjustments and filters hidden**. You can also run **View > Before and after (hold \\)** from the menu, which shows the before view for a moment. To check one adjustment alone, click its eye in the Layers panel." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "**Merge down**, **Merge visible** and **Flatten image** bake adjustments into pixels. After that they cannot be edited. Save a version first if you might want them back.",
        "Changing a layer below an adjustment makes the adjustment recalculate. On large designs with many stacked adjustments this can make editing feel slower. Hide the adjustments you are not working on.",
        "The **Fill** setting in the Layers panel does not apply to adjustment layers. Use **Opacity**.",
        "On a phone, adjustments are under the **Effects** tab, then **Adjustments**. See [Designing on a phone](/learn/designing-on-a-phone).",
      ] },
    ],
  },

  // ─── Filters ───────────────────────────────────────────────────────
  {
    slug: 'filters-in-the-editor',
    title: 'Use filters as editable layers',
    summary: "Add any of the 58 Void filters from the filter gallery as a live layer, then stack, mask and fade it. Also explains why exports look slightly sharper than the preview.",
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['adjustment-layers', 'effects-overview', 'artistic-effects', 'masks'],
    keywords: 'filter gallery effects fx halftone glitch dither film grain vignette live filter layer non-destructive stack mask fade preview export sharper',
    body: [
      { t: 'p', text: "Every effect from the Effects tool is also a filter in the Editor, and each one goes on as its own layer. That means you can change its settings later, fade it, paint it out of parts of the image, or stack several for a finished look, while the photo underneath stays untouched." },

      { t: 'h', text: 'Open the filter gallery' },
      { t: 'p', text: "Choose **Filter > Filter gallery…**. The window is titled **Filters and adjustments**. It has the adjustments at the top and the **Void filters** below, each with a thumbnail rendered from a small copy of your own design, so you see what the filter will do to your work rather than to a sample photo." },
      { t: 'list', items: [
        "Type in **Search filters** to find one by name or description.",
        "The category buttons narrow the list: All, Artistic, Stylize, Color, Distort and Enhance.",
        "Click a filter to add it as a layer and close the gallery.",
      ] },
      { t: 'p', text: "Other routes to the same place: the **Filter gallery** button in the Adjustments panel, **Filters and adjustments** under Quick actions in Properties when an image layer is selected, and **Filter gallery…** in the Layers panel's **New adjustment layer** menu. If you already know the name, each filter is also listed in its own submenu under **Filter** (Artistic, Stylize, Colour, Distort, Enhance), and in the command palette ({{Ctrl+K}}; Cmd+K on a Mac)." },
      { t: 'try', label: 'Try filters in the Editor', href: '/editor' },

      { t: 'h', text: 'What a filter layer does' },
      { t: 'p', text: "A filter layer works like an adjustment layer. It takes everything below it in the Layers panel, runs the filter over it and shows the result. Layers above it are not affected. The layer is named after the filter, for example Halftone filter." },
      { t: 'p', text: "Select it and the **Filter settings** section appears in Properties with that filter's controls. The reset button at the top of the section puts every setting back to its default. Filters with a random element, such as grain or noise, get a fresh random pattern each time you add one." },
      { t: 'p', text: "Each filter and its settings are described in the Effects articles: [artistic](/learn/artistic-effects), [stylise](/learn/stylise-effects), [colour](/learn/colour-effects), [distortion](/learn/distortion-effects) and [texture](/learn/texture-effects)." },

      { t: 'h', text: 'Fade, blend and mask a filter' },
      { t: 'list', items: [
        "**Fade it.** Many filters have their own **Opacity** or **Strength** in Filter settings. For any filter, you can also lower the layer's **Opacity** (in the Layers panel, or the **Layer** section of Properties) to mix the filtered result with the original.",
        "**Blend it.** Change the layer's blend mode. A halftone set to Multiply keeps the colour below and adds only the dark dots; Overlay or Soft light gives a subtler texture. See [Blend modes and opacity](/learn/blend-modes-and-opacity).",
        "**Mask it.** With the filter layer selected, paint with the **Eraser** to hide the filter where you paint and the **Brush** to bring it back. The Editor adds the mask for you. See [Masks](/learn/masks).",
        "**Hide it.** Click the eye in the Layers panel, or hold {{\\}} to hide every filter and adjustment at once for a before view.",
      ] },

      { t: 'h', text: 'Stack filters' },
      { t: 'p', text: "Each filter processes the result of everything below it, including other filters, so the order changes the result. Film grain above a halftone puts grain over the dots; below it, the grain gets turned into dots. Drag layers in the Layers panel to reorder them and watch the canvas update." },
      { t: 'p', text: "To keep a filter to certain layers only, group it with them ({{Ctrl+G}}) and set the group's blend to anything other than **Pass through**, or lower the group's opacity. A group set up that way is worked out on its own, so the filter inside it only sees the layers inside it. On a design with boards, a filter that belongs to a board only changes that board." },
      { t: 'tip', text: "A common finished stack for a photo: a colour adjustment such as Curves at the bottom, a texture filter like Film Grain at low opacity, and a Vignette on top." },

      { t: 'h', text: 'Why the export looks slightly sharper than the preview' },
      { t: 'p', text: "Filters are worked out at a working size of 1200 pixels on the long edge, then scaled to fit the canvas. This keeps the Editor quick, and it is the same working size the Effects tool uses, so a filter looks the same in both." },
      { t: 'p', text: "When you export, every filter runs again at the full output size. Settings that are measured in pixels, such as dot size, block size, blur radius or shift distance, are scaled up by the same amount, so the result keeps the look you saw, only sharper. Filters that work pixel by pixel with no size setting (dither, edge detect, emboss, sharpen, pencil sketch and noise) simply come out finer." },
      { t: 'table', head: ['Design size', 'What you see while editing', 'What you get on export'], rows: [
        ['1200 px or smaller on the long edge', 'The filter at full size', 'The same'],
        ['Larger than 1200 px', 'The filter worked out at 1200 px, scaled up to fit', 'The filter at full size, with pixel settings scaled, so finer detail'],
      ] },
      { t: 'note', text: "Because of this, a very fine pattern (small halftone dots, a single-pixel dither) on a large design can look softer on screen than it will in the file. Zooming in does not change that. Export a test at the size you need to judge the fine detail. See [Export for screen](/learn/export-for-screen) and [Export for print](/learn/export-for-print)." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The filter changed my text and logo too.** It affects everything below it. Move the filter layer down so it sits directly above the photo, with the text above it.",
        "**Editing is slow.** Each filter recalculates when something below it changes. Hide filters while you work on layers beneath them, and turn them back on to check.",
        "**I want to bake the filter in.** **Merge down** or **Flatten image** turns it into pixels. After that it cannot be edited, so save a version first.",
        "**On a phone:** open the **Effects** tab and tap **Filters**. With an image layer selected, the **Select** tab also has a **Filters** button.",
      ] },
    ],
  },

  // ─── Layer styles ──────────────────────────────────────────────────
  {
    slug: 'layer-styles',
    title: 'Add shadows, strokes and glows with layer styles',
    summary: "Drop shadow, stroke, outer and inner glow, overlays and bevel, added as live styles that follow the layer's shape and never change its pixels.",
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['type', 'blend-modes-and-opacity', 'remove-background', 'layers'],
    keywords: 'layer style fx effects drop shadow stroke outline border glow neon inner shadow colour overlay color overlay gradient overlay bevel emboss sticker fill opacity copy paste style',
    body: [
      { t: 'p', text: "Layer styles add effects such as a drop shadow or an outline around whatever is on a layer: a cut-out photo, a logo, text or a shape. They follow the layer's outline, update when you move or edit the layer, and never change its pixels, so you can switch them off or tweak them at any point." },

      { t: 'h', text: 'The eight styles' },
      { t: 'table', head: ['Style', 'What it does', 'Its own settings'], rows: [
        ['Drop shadow', 'A shadow cast behind the layer', 'Colour, Angle, Distance, Spread, Size'],
        ['Outer glow', 'A soft glow outside the edge', 'Colour, Spread, Size'],
        ['Bevel and emboss', 'A raised edge lit from one side', 'Highlight and shadow colours, Light angle, Size, Depth, Soften'],
        ['Inner shadow', 'A shadow inside the edge, as if cut into the page', 'Colour, Angle, Distance, Choke, Size'],
        ['Inner glow', 'A glow from the edge inwards', 'Colour, Choke, Size'],
        ['Colour overlay', "Fills the layer's shape with one colour", 'Colour'],
        ['Gradient overlay', 'Fills the shape with a two-colour gradient', 'From and to colours, Angle, Scale'],
        ['Stroke', 'An outline around the shape', 'Colour, Size, Position (Outside, Centre, Inside)'],
      ] },
      { t: 'p', text: "Every style also has **Blend mode** and **Opacity**. Size, Distance and Soften are in pixels; Spread and Choke are percentages." },

      { t: 'h', text: 'Add a style' },
      { t: 'steps', items: [
        "Select an image, text or shape layer. Adjustment and filter layers cannot take styles.",
        "Choose **Layer > Layer style** and pick a style, for example **Drop shadow…**. The style is switched on with sensible defaults and the **Layer style** window opens on it.",
        "Adjust the sliders. The canvas updates as you go.",
        "Click **OK** to keep the changes. **Cancel**, or closing the window, puts everything back as it was when you opened it.",
      ] },
      { t: 'p', text: "Other ways in: the **Layer style** button (fx icon) at the bottom of the Layers panel, **Layer > Layer style > Blending options…**, and the **Layer styles** panel from the Window menu." },

      { t: 'h', text: 'The Layer style window' },
      { t: 'p', text: "The list on the left has **Blending options** and the eight styles. Tick a box to turn a style on or off, click its name to edit it. The right side shows the settings for whatever you clicked." },
      { t: 'p', text: "**Blending options** holds the layer's own **Blend mode**, **Opacity** and **Fill opacity**. Opacity fades the layer and its styles together. Fill opacity fades only the layer's own pixels and keeps the styles at full strength. Set Fill to 0% on text with a Stroke and you get outlined, hollow lettering." },
      { t: 'p', text: "Styles are drawn in the order of the list. Drag a style by its handle to change the order, which matters when, say, a Colour overlay and a Gradient overlay are both on. **Clear all** at the bottom removes every style." },

      { t: 'h', text: 'Quick presets and the Layer styles panel' },
      { t: 'p', text: "Open **Window > Layer styles** for a faster route. Six presets set up a finished look in one click:" },
      { t: 'table', head: ['Preset', 'What you get'], rows: [
        ['Soft shadow', 'A light, wide drop shadow'],
        ['Outline', 'A 6 px white stroke'],
        ['Neon', 'A pink outer glow with a soft white inner glow'],
        ['Emboss', 'Bevel and emboss at its defaults'],
        ['Sticker', 'A 10 px white stroke and a small drop shadow, like a die-cut sticker'],
        ['Gradient', 'A violet to coral gradient overlay'],
      ] },
      { t: 'warn', text: "A preset replaces every style already on the layer. Apply the preset first, then add or tune individual styles." },
      { t: 'p', text: "Below the presets, the eye next to each style shows or hides it, and clicking a name opens that style in the Layer style window. There is also a **Fill** slider and **Edit styles…**." },

      { t: 'h', text: 'Shadow straight from Properties' },
      { t: 'p', text: "For images and shapes, the **Shadow** section in Properties edits the same drop shadow without opening a window. Pick a **Colour** to switch it on, then set **Opacity**, **Blur**, **Distance**, **Angle** and **Spread**. Clear the colour to turn it off." },
      { t: 'note', text: "Text layers have their own **Outline** and **Shadow** under **More type options** in Properties. Those are part of the text itself. The Stroke and Drop shadow layer styles work on text too, and give you more control, such as stroke position and glows." },

      { t: 'h', text: 'Reuse a style on other layers' },
      { t: 'steps', items: [
        "Select the layer with the style you like and choose **Layer > Layer style > Copy layer style**.",
        "Select one or more other layers in the Layers panel.",
        "Choose **Layer > Layer style > Paste layer style**. Every selected layer gets the same styles, replacing any it had.",
      ] },
      { t: 'p', text: "The same two commands, plus **Clear layer style**, are in the right-click menu of a layer in the Layers panel." },

      { t: 'h', text: 'Tips for good-looking styles' },
      { t: 'list', items: [
        "Keep shadows soft and low. A shadow at 30 to 40% opacity with a large Size reads as real; a hard black shadow at full opacity reads as a mistake.",
        "Use the same Angle for every shadow in a design, so the light seems to come from one place.",
        "On a cut-out photo, a Stroke set to **Outside** with a white colour gives the sticker look. Use [Remove background](/learn/remove-background) first so the stroke follows the subject.",
        "A Stroke set to **Inside** never grows the layer's footprint, which helps when the layer sits against the edge of the page.",
      ] },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Styles follow the layer's mask. Paint part of a layer out and its shadow and stroke go with it.",
        "Styles are part of the layer, so they are included when you export.",
        "Styles from PSD files are rebuilt as editable styles where possible. See [Import PSD and PDF](/learn/import-psd-and-pdf).",
        "Layer styles work in every browser, Safari included.",
      ] },
    ],
  },

  // ─── Retouching ────────────────────────────────────────────────────
  {
    slug: 'retouching',
    title: 'Retouch photos with the brush, heal and clone tools',
    summary: "Paint, erase, spot heal, clone and dodge or burn, with brush size, hardness, opacity, flow, smoothing and pen pressure explained.",
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['workflow-portrait-retouch', 'masks', 'ai-on-this-device', 'selections'],
    keywords: 'retouch brush eraser spot heal healing brush clone stamp dodge burn sponge blemish remove spots skin paint flow hardness opacity smoothing stabiliser stabilizer pen pressure tablet stylus',
    body: [
      { t: 'p', text: "These are the hands-on tools for fixing and painting on photos: removing spots and stray hairs, copying texture over a distraction, lightening eyes, or painting on a mask. Knowing what each setting does saves a lot of undoing." },

      { t: 'h', text: 'The tools and their keys' },
      { t: 'keys', rows: [
        ['B', 'Brush'],
        ['E', 'Eraser'],
        ['J', 'Spot heal'],
        ['Shift+J', 'Remove object (switches within the heal group)'],
        ['S', 'Clone stamp'],
        ['O', 'Dodge (lighten)'],
        ['Shift+O', 'Burn (darken), then Sponge (saturation)'],
        ['[ and ]', 'Make the brush smaller or larger'],
        ['1 to 0', 'Brush, eraser or clone opacity: 1 is 10%, 0 is 100%'],
        ['Alt+click', 'Clone stamp: choose where to copy from'],
      ] },
      { t: 'p', text: "Remove object uses an AI model on your device and is covered in [AI on this device](/learn/ai-on-this-device)." },

      { t: 'h', text: 'Brush settings in the options bar' },
      { t: 'table', head: ['Setting', 'Tools', 'What it does'], rows: [
        ['Size', 'All brush tools', 'Diameter in pixels, 1 to 1000. [ and ] change it in steps of about a fifth.'],
        ['Hardness', 'All except Spot heal and Remove object', 'How crisp the edge is. 100% is a sharp edge, 0% fades gently to nothing.'],
        ['Opacity', 'Brush, Eraser, Clone stamp', 'The most one stroke can lay down. Going over the same spot in one stroke never exceeds it.'],
        ['Flow', 'Brush, Eraser, Clone stamp', 'How much each dab lays down. Low flow builds up gradually as you keep painting over an area within one stroke.'],
        ['Smoothing', 'Brush, Eraser', 'Makes the stroke trail the pointer slightly, which steadies shaky lines.'],
        ['Pen size', 'All brush tools', 'With a pen, pressure changes the size. On by default.'],
        ['Pen opacity', 'Brush, Eraser', 'With a pen, pressure changes how much paint goes down.'],
      ] },
      { t: 'p', text: "Opacity and Flow together: think of Opacity as the ceiling for a stroke and Flow as how quickly you reach it. For soft, controllable build-up, such as shading or painting a mask around hair, set Opacity high and Flow low (10 to 30%)." },
      { t: 'p', text: "Pen settings only react to a real pen or stylus. A mouse or finger always paints at full pressure. The lightest touch still paints at 15% of the size, so strokes never vanish." },

      { t: 'h', text: 'Brush and Eraser' },
      { t: 'p', text: "The Brush paints in the main colour. If you start painting while a photo layer is selected, the Editor adds a new layer for your strokes first, so the photo underneath stays untouched. If a text or shape layer is selected, painting also goes onto a new layer." },
      { t: 'p', text: "The Eraser removes pixels from the selected image layer. For anything you may want to undo later, use a mask instead: the same Brush and Eraser then show and hide the layer without deleting anything. The options bar says **Painting on the mask: Brush shows, Eraser hides.** while you are on a mask. See [Masks](/learn/masks)." },
      { t: 'p', text: "If there is a selection, every brush tool only paints inside it. That is the easiest way to keep a stroke off an edge." },

      { t: 'h', text: 'Spot heal' },
      { t: 'p', text: "Spot heal is for small things: spots, dust, a stray hair, a sensor mark. Paint over the spot (the stroke shows in pink while you paint) and let go. The Editor looks around the spot for a clean patch of similar texture, matches its colour to the surroundings and blends it in with a soft edge." },
      { t: 'list', items: [
        "Make the brush just bigger than the blemish and dab rather than paint long strokes. Several small fixes look better than one big one.",
        "It works on the pixels of the selected image layer only, not on the layers above or below.",
        "If the painted area is too big or too close to the edge of the image, the Editor says **That area is too large or too close to the edge to heal. Try a smaller spot, or use Remove object.**",
      ] },

      { t: 'h', text: 'Clone stamp' },
      { t: 'p', text: "Clone stamp copies pixels from one place to another. Use it where Spot heal guesses wrong, such as along a straight edge or a repeating pattern, because you choose exactly what gets copied." },
      { t: 'steps', items: [
        "Press **S** for the Clone stamp.",
        "Hold Alt (Option on a Mac) and click the area you want to copy from. A marker shows the source on the canvas.",
        "Paint over the area you want to cover.",
      ] },
      { t: 'p', text: "Each new stroke starts copying from the source point again, keeping the same offset for the length of that stroke. If you click without a source, the Editor reminds you: **Hold Alt (Option) and click to choose where to copy from.** Like Spot heal, it copies from the selected layer only. Lower **Hardness** so the copied patch blends at its edges." },

      { t: 'h', text: 'Dodge, burn and sponge' },
      { t: 'list', items: [
        "**Dodge (lighten)** brightens where you paint. **Burn (darken)** darkens.",
        "Both have a **Range** (**Shadows**, **Midtones** or **Highlights**) that limits which tones they affect, and an **Exposure** that sets how strong each stroke is.",
        "**Sponge (saturation)** has **Desaturate** and **Saturate** modes and a **Flow** setting.",
      ] },
      { t: 'p', text: "Keep Exposure low (10 to 20%) and build up with several strokes. Dodging the whites of the eyes on Highlights, or burning the edges of a portrait on Midtones, looks natural at low strength and fake at high strength." },

      { t: 'h', text: 'Work non-destructively' },
      { t: 'p', text: "Heal, clone, dodge, burn and sponge all change the pixels of the layer you are on. To keep a way back:" },
      { t: 'steps', items: [
        "Duplicate the photo layer with {{Ctrl+J}} (Cmd+J on a Mac) and retouch the copy. Hide it to compare.",
        "If your design already has several layers, use **Layer > Stamp visible to new layer** ({{Ctrl+Alt+Shift+E}}) to make one merged layer to retouch, since these tools only see one layer.",
        "Undo steps are listed in the History panel, and you can save a version at any time with {{Ctrl+Alt+S}}. See [History and undo](/learn/history-and-undo).",
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**Nothing happens when I paint.** The layer may be locked; the Editor says **This layer is locked. Unlock it to paint.** Or you may be on an adjustment layer, in which case your strokes paint its mask.",
        "**My photo lost its scale or rotation handles.** Painting on an image layer that has been scaled or rotated turns that transform into pixels first, so the paint lines up. Duplicate first if you still need to resize it cleanly.",
        "**The stroke stops at an invisible line.** There is a selection. Press {{Ctrl+D}} to deselect.",
        "**Heal or clone copies nothing.** They read the selected layer only. If that layer is empty (a new layer you just added), select the photo layer instead.",
      ] },

      { t: 'h', text: 'On a phone or tablet' },
      { t: 'p', text: "On a phone, open the **Select** tab, tap **More tools** and choose a tool; a Done pill appears on the canvas. With a pen on a tablet, turn on **Touch mode** in **Edit > Preferences…** so fingers pan and zoom while the pen paints. See [Designing on a phone](/learn/designing-on-a-phone)." },
    ],
  },

  // ─── Remove background ─────────────────────────────────────────────
  {
    slug: 'remove-background',
    title: 'Remove a background on your device',
    summary: "Cut a person or product out of a photo with a model that runs in your browser, then refine the edge and export a transparent PNG.",
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['ai-on-this-device', 'masks', 'selections', 'export-for-screen'],
    keywords: 'remove background background remover cutout cut out transparent png no background delete background subject person product isolate matte hair edge refine free private offline',
    body: [
      { t: 'p', text: "Remove background finds the subject in a photo and hides everything else. It runs entirely in your browser: the photo is never uploaded and there is no charge. Use it for product shots, portraits for a poster, or anything you want to place on a new background." },

      { t: 'h', text: 'Remove a background' },
      { t: 'steps', items: [
        "Open or place the photo so it is its own image layer, and select it.",
        "In Properties, under **Quick actions**, click **Remove background**. It is also at **Layer > Remove background** and in the command palette ({{Ctrl+K}}; Cmd+K on a Mac).",
        "The first time, your browser asks to download the model once (about 26 MB). Click OK. Progress shows as **Downloading model** with a percentage.",
        "The Editor shows **Finding the subject**, then hides the background with a mask and says **Background hidden with a mask. Paint on the mask to fine-tune the edges.**",
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
      { t: 'p', text: "On a phone, select the photo and tap **Remove background** in the **Select** or **Image** tab." },

      { t: 'h', text: 'Choose the right model' },
      { t: 'table', head: ['', 'Standard', 'Any subject'], rows: [
        ['How to use it', 'Remove background', 'Not a person? Use the any-subject model (115 MB, needs a recent browser)'],
        ['Model', 'MODNet', 'BiRefNet lite'],
        ['Download, once', 'About 26 MB', 'About 115 MB'],
        ['Best at', 'People and portraits', 'Products, animals and objects'],
        ['Needs', 'Any modern browser', 'WebGPU'],
      ] },
      { t: 'p', text: "The standard model is trained on people, so it is fast and strong on portraits but can struggle with a bottle or a chair. For those, click the **Not a person?** link under the button. If your browser has no WebGPU, the Editor says **This browser cannot run the any-subject model. Using the standard one.** and carries on with the standard model. [Browser support](/learn/browser-support) lists which browsers have WebGPU." },

      { t: 'h', text: 'Why it uses a mask' },
      { t: 'p', text: "Nothing is deleted. The background is hidden by a layer mask: white where the layer shows, black where it is hidden, grey for soft edges such as hair. That means a bad cut is easy to fix, and you can always get the full photo back." },
      { t: 'p', text: "The **Mask** section in Properties has the controls: **Paint on mask**, **Turn off** (to see the whole photo again), **Invert** (keep the background, hide the subject) and **Delete mask**. More in [Masks](/learn/masks)." },

      { t: 'h', text: 'Refine the edge' },
      { t: 'h3', text: 'Paint small fixes' },
      { t: 'steps', items: [
        "Click **Paint on mask** in Properties. The Brush tool is selected for you.",
        "Paint with the **Brush** to bring back parts that were hidden by mistake, such as a hand or the edge of a product.",
        "Switch to the **Eraser** (E) to hide leftovers of the background.",
        "Use a soft brush (low Hardness) on hair and fur, a hard one on product edges. [ and ] change the size.",
        "Click **Done painting mask** when finished.",
      ] },
      { t: 'h3', text: 'Rework hair and fur with Select and mask' },
      { t: 'p', text: "For difficult edges, **Select > Select and mask…** ({{Ctrl+Alt+R}}) opens a focused workspace that works out soft edges from the colours around them." },
      { t: 'steps', items: [
        "Select the cut-out layer and choose **Select > Layer pixels** to turn the current cut-out into a selection. Or start from scratch with **Select > Subject**.",
        "Open **Select and mask…**. Set **View** to **On black** or **On white** to see the edge clearly.",
        "Paint over hair and fuzzy edges with the **Refine edge brush**. Use **Add to selection** and **Remove from selection** for areas that are plainly in or out.",
        "Tune the **Edge** sliders: **Radius** widens the band that gets worked out automatically, **Smooth** evens out a jagged outline, **Feather** softens it, **Contrast** makes it crisper and **Shift edge** moves it in or out.",
        "Tick **Clean up colour fringes** if the old background colour glows through the hair, and set its **Amount**.",
        "Under **Send to**, choose **Layer mask** and click **OK**. This replaces the layer's current mask.",
      ] },
      { t: 'p', text: "The other **Send to** options are **Selection**, **New layer with mask** and **New layer**. The two new-layer options are the ones that include the colour fringe clean-up, because they build new pixels." },

      { t: 'h', text: 'Export a transparent PNG' },
      { t: 'steps', items: [
        "Click an empty part of the canvas to deselect layers. Under **Design** in Properties, set **Background** to none. The panel confirms: **Transparent. PNG and WebP exports keep it see-through.**",
        "Or keep the background colour and tick **Leave out the background colour** in the export window.",
        "Export with {{Ctrl+E}} as PNG or WebP. JPG has no transparency.",
      ] },
      { t: 'p', text: "To crop the result tight to the subject, use **Image > Trim transparent edges** before exporting. See [Export for screen](/learn/export-for-screen)." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The button is missing or greyed out.** It only works on image layers. Text and shapes have no photo background to remove.",
        "**It says it could not load the background remover.** The model downloads the first time you use it, so you need a connection once. Check it and try again. After that it works offline.",
        "**It cut the wrong thing.** The model looks at this layer's own pixels only, not the rest of the design. If the subject is small or low contrast, try the any-subject model, or select it with the Object select tool (W) and use **Select and mask…** to send it to a layer mask. See [AI on this device](/learn/ai-on-this-device).",
        "**I pressed Cancel on the download prompt.** Nothing happens and nothing is stored. Click Remove background again to be asked again.",
      ] },
    ],
  },

  // ─── Crop and canvas ───────────────────────────────────────────────
  {
    slug: 'crop-and-canvas',
    title: 'Crop, resize, rotate and flip',
    summary: "Crop with fixed ratios, change the canvas size without scaling, resize the whole image with resolution, and rotate or flip the canvas or a single layer.",
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['image-resolution-explained', 'resize-to-every-format', 'ai-on-this-device', 'export-for-print'],
    keywords: 'crop trim canvas size image size resize resample scale dpi resolution rotate flip mirror straighten aspect ratio square 4:5 16:9 9:16 expand extend border',
    body: [
      { t: 'p', text: "These commands change the page itself: cutting it down, adding space around it, scaling everything to a new pixel size, or turning it round. Knowing which one to reach for keeps text sharp and saves you rebuilding a layout." },

      { t: 'h', text: 'Which command do I need?' },
      { t: 'table', head: ['You want to', 'Use', 'Scales layers?'], rows: [
        ['Cut the page down to part of the design', 'Crop tool (C), or Image > Crop to selection', 'No'],
        ['Remove empty transparent space round the edges', 'Image > Trim transparent edges', 'No'],
        ['Add space around the design, or take it away', 'Image > Canvas size…', 'No'],
        ['Add space and fill it to match the photo', 'Image > Expand with AI fill…', 'No'],
        ['Make the whole design bigger or smaller in pixels', 'Image > Image size…', 'Yes'],
        ['Turn or mirror the whole design', 'Image > Image rotation', 'No'],
        ['Turn or mirror one layer', 'Edit > Transform', 'No'],
        ['Make versions at other sizes, such as a story and a banner', 'File > Resize for other formats…', 'Rebuilt per format'],
      ] },
      { t: 'p', text: "The last row has its own article: [Resize to every format](/learn/resize-to-every-format)." },

      { t: 'h', text: 'Crop' },
      { t: 'steps', items: [
        "Press **C** for the Crop tool.",
        "Pick a ratio in the options bar: **Free**, **1:1**, **4:5**, **16:9**, **9:16** or **3:2**.",
        "Drag over the part you want to keep. The options bar shows the size in pixels.",
        "Press Enter or click **Apply**. Press Escape or click **Cancel** to back out.",
      ] },
      { t: 'p', text: "4:5 suits portrait social posts, 9:16 stories and reels, 16:9 video and slides, 3:2 most camera photos. To crop to an exact shape you have already selected, use **Image > Crop to selection**, which crops to the selection's bounding box." },
      { t: 'tip', text: "Cropping moves the edges of the page, not your layers' pixels. Image layers keep the parts that now sit off the page, so after a crop you can still drag a photo to show a different part of it." },
      { t: 'p', text: "**Image > Trim transparent edges** crops the page to whatever is visible, which is handy after [removing a background](/learn/remove-background)." },
      { t: 'p', text: "On a phone, select a photo and tap **Crop** in the **Select** or **Image** tab." },

      { t: 'h', text: 'Canvas size: add or remove space' },
      { t: 'p', text: "**Image > Canvas size…** ({{Ctrl+Alt+C}}; Cmd+Option+C on a Mac) changes the page size without scaling anything. Use it to add a border, make room for a caption, or turn a landscape photo into a square with space above and below." },
      { t: 'list', items: [
        "Type the new **Width** and **Height** in pixels.",
        "Tick **Relative** to type how much to add instead, for example 200 to add 200 px.",
        "Click a square in the 3 by 3 **Anchor** grid to choose where the current design sits in the new page. The centre square adds space evenly; the top-left square adds it only to the right and bottom.",
        "Typing smaller numbers takes space away. Layers are not deleted, only moved off the page.",
      ] },
      { t: 'p', text: "The new area shows the design's background colour, or transparency if it has none." },

      { t: 'h', text: 'Expand with AI fill' },
      { t: 'p', text: "**Image > Expand with AI fill…** is the same window, starting at 125% of the current size, with **Fill the new area with AI** ticked. When you click **Apply**, the page grows and a model on your device paints the new edges to continue the picture. The fill goes on its own layer called AI fill at the bottom of the stack, so you can hide it or paint on it. The first use downloads the model once (208 MB). More in [AI on this device](/learn/ai-on-this-device)." },
      { t: 'warn', text: "AI fill fills every see-through part of the design, not only the new edges. Give the design a background layer or colour first if it has transparent areas you want to keep." },

      { t: 'h', text: 'Image size: scale everything' },
      { t: 'p', text: "**Image > Image size…** ({{Ctrl+Alt+I}}) scales every layer to a new pixel size. Text and shapes are redrawn, so they stay sharp at any size. Photos are resampled, which means scaling a photo up cannot add detail that was not there." },
      { t: 'list', items: [
        "**Width** and **Height** are linked by default so the proportions stay the same. Click the link button between them to unlink.",
        "**Units** switches between **Pixels** and **Percent**.",
        "**Resolution** is the dpi saved with the design. It does not change the pixels; it tells you how big the design prints. The line underneath shows the size in centimetres at that dpi, and roughly how much memory each layer will take.",
      ] },
      { t: 'p', text: "For print, aim for 300 dpi at the final printed size. A 2480 by 3508 px design prints at A4 at 300 dpi. See [Image resolution explained](/learn/image-resolution-explained) and [Export for print](/learn/export-for-print)." },
      { t: 'note', text: "When either side of the new size is over 4000 px, the Editor saves a version called Before image size first, so you can go back from File > Version history. Above 8000 px it warns that very large images may be slow in the browser." },

      { t: 'h', text: 'Rotate and flip' },
      { t: 'h3', text: 'The whole design' },
      { t: 'p', text: "**Image > Image rotation** has **Rotate 90° clockwise**, **Rotate 90° anticlockwise**, **Rotate 180°**, **Flip canvas horizontal** and **Flip canvas vertical**. Every layer turns with the page, and a 90° turn swaps the width and height." },
      { t: 'note', text: "Flipping the canvas mirrors image layers and their masks. Text and shape layers move to the mirrored position but are not reversed, so words still read normally." },
      { t: 'h3', text: 'One layer' },
      { t: 'p', text: "**Edit > Transform** holds **Rotate layer 90° clockwise**, **Rotate layer 180°**, **Flip layer horizontal** and **Flip layer vertical**. For any other angle, use **Free transform** ({{Ctrl+T}}). The **Mirror** and **Flip** buttons in Properties do the same for image layers." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Every one of these commands is a single undo step. {{Ctrl+Z}} takes it back.",
        "Canvas size and Image size also move or scale guides, paths and saved selections to match.",
        "Size and position boxes for a single layer (X, Y, W, H) are in the Position section of Properties. Those change one layer, not the page.",
      ] },
    ],
  },

  // ─── AI on this device ─────────────────────────────────────────────
  {
    slug: 'ai-on-this-device',
    title: 'Use the AI tools that run on your device',
    summary: "Remove background, select subject, object select, remove object and expand with AI fill: what each does, which model it uses, the one-time downloads, and what never leaves your browser.",
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['remove-background', 'selections', 'privacy-and-data', 'browser-support'],
    keywords: 'ai artificial intelligence on device local offline private free no upload no credits select subject object selection remove object inpaint content aware fill generative expand outpaint model download webgpu modnet birefnet lama',
    body: [
      { t: 'p', text: "The Editor has five AI tools, and all of them run in your browser. Your images are never uploaded, there are no credits and nothing is charged. This article covers what each tool does, what it downloads the first time, and what to try when the result is not right." },

      { t: 'h', text: 'The tools' },
      { t: 'table', head: ['Tool', 'Where', 'What it does'], rows: [
        ['Remove background', 'Properties > Quick actions, or Layer menu', 'Hides everything but the subject of an image layer with a mask'],
        ['Select subject', 'Select > Subject, or the options bar of any selection tool', 'Selects the main subject of the whole visible design'],
        ['Object select', 'Tool rail, key W', 'Selects the object inside a box you drag'],
        ['Remove object', 'Tool rail, Shift+J, or Filter > Remove object (AI, on device)', 'Fills in whatever you paint over, as if it was never there'],
        ['Expand with AI fill', 'Image > Expand with AI fill…', 'Enlarges the canvas and paints the new edges to continue the picture'],
      ] },
      { t: 'p', text: "Remove background has its own article: [Remove a background on your device](/learn/remove-background)." },

      { t: 'h', text: 'The models and their downloads' },
      { t: 'p', text: "Each tool uses a model. A model is downloaded once, the first time you use a tool that needs it, then kept in your browser and used offline from then on." },
      { t: 'table', head: ['Model', 'Download', 'Licence', 'Used for'], rows: [
        ['MODNet', 'About 26 MB', 'Apache-2.0', 'Remove background and select subject (best on people)'],
        ['BiRefNet lite', 'About 115 MB', 'MIT', 'Remove background and object select (any subject). Needs WebGPU; without it the MODNet model is used instead.'],
        ['LaMa', 'About 208 MB', 'Apache-2.0', 'Remove object and expand with AI fill'],
      ] },
      { t: 'p', text: "Before a model downloads for the first time, the browser shows a prompt with its name and size, saying it runs on your device, nothing is uploaded, it is free, and it works offline after the first download. Click OK to go ahead. If you cancel, nothing is downloaded and you are asked again next time. Once you say yes, you are not asked again for that model." },
      { t: 'p', text: "**Help > AI on this device** lists every model with its size and licence. The same list is under **Edit > Preferences… > AI and privacy**. Both have **Remove downloaded models**, which deletes the cached models and resets the prompts, useful if you need the storage back." },
      { t: 'note', text: "The first download needs a connection. The model files come from public hosts for open models, not from Voidcanvas, and nothing about your image goes with the request. Voidcanvas records that a model ran, how long it took and whether it worked, never the image. See [Privacy and data](/learn/privacy-and-data)." },

      { t: 'h', text: 'Select subject' },
      { t: 'p', text: "**Select > Subject** runs the MODNet model on everything visible and turns the result into a selection. It respects the selection mode in the options bar, so with **Add to selection** chosen it adds the subject to what you already have. When it finishes it suggests **Select and mask** for hair and soft edges. The same **Select subject** button is in the options bar of every selection tool and inside the Select and mask workspace. See [Selections](/learn/selections)." },

      { t: 'h', text: 'Object select' },
      { t: 'steps', items: [
        "Press **W** for Object select.",
        "Drag a box around the object. Leave a little room round it.",
        "The Editor finds the object's edges inside the box and selects it. Anything the model finds outside the box is left out.",
      ] },
      { t: 'p', text: "Hold Shift while dragging to add to the selection, Alt to subtract. If your browser has WebGPU, Object select uses the any-subject model (BiRefNet lite); otherwise it uses MODNet, which is best on people. Very small boxes are ignored." },

      { t: 'h', text: 'Remove object' },
      { t: 'steps', items: [
        "Select the image layer that holds the thing you want gone.",
        "Press Shift+J (or choose **Filter > Remove object (AI, on device)**).",
        "Set the brush size in the options bar and paint over the object, covering it completely, shadow included.",
        "Let go. The Editor shows **Removing** and fills the area to match its surroundings.",
      ] },
      { t: 'p', text: "Remove object works on a square area around what you painted, scaled to 512 by 512 pixels for the model, then puts back only the painted part with a soft edge, so the rest of the photo keeps its full resolution. It works best on objects that take up a modest part of the frame. A large area on a big photo can come back softer than the pixels around it." },
      { t: 'p', text: "If the model cannot start in your browser, the Editor says **The AI remover could not start in this browser, so a simpler fill was used.** and falls back to the same patch fill that Spot heal uses. If the area is too big even for that, it says **That area is too large to fill. Try a smaller area.** For small blemishes, [Spot heal](/learn/retouching) (J) is quicker and needs no download." },
      { t: 'tip', text: "Remove object changes the layer's pixels. Duplicate the layer first ({{Ctrl+J}}; Cmd+J on a Mac) if you want to compare or keep the original." },

      { t: 'h', text: 'Expand with AI fill' },
      { t: 'p', text: "**Image > Expand with AI fill…** opens the canvas size window at 125% of the current size with **Fill the new area with AI** ticked. Set the size and anchor, then click **Apply**. The new area is filled on its own layer, called AI fill, at the bottom of the stack, and the Editor says **New area filled on its own layer at the bottom. Hide or paint on it to adjust.** You can also tick the same box in **Image > Canvas size…**. See [Crop, resize, rotate and flip](/learn/crop-and-canvas)." },
      { t: 'p', text: "It uses the same 512 by 512 approach as Remove object, so modest expansions look best. Expanding a photo by a little on each side works better than doubling it in one go." },

      { t: 'h', text: 'Speed and browsers' },
      { t: 'list', items: [
        "The first run of each model is the slowest, because it downloads and starts the model. Later runs are quicker.",
        "Where the browser supports WebGPU, Remove object and expand use it, and fall back to a slower path that works everywhere. The any-subject model needs WebGPU to be usable.",
        "The models are large for a phone. They can work there, but expect longer waits, and use Wi-Fi for the first download.",
        "See [Browser support](/learn/browser-support) for which browsers have WebGPU.",
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**Could not load the model.** The first download failed. Check your connection and try again.",
        "**The subject selection includes too much.** Select subject looks at the whole visible design. Use Object select and draw a box, or tidy the result in **Select > Select and mask…**.",
        "**The removed area looks smudged.** Paint a little beyond the object's edge so no fringe is left, and try removing a big object in two or three smaller passes.",
      ] },
    ],
  },
]
