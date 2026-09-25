import type { Article } from '../types'

const UPDATED = '2026-09-25'

const opacityNote =
  'Every effect in this group also has an **Opacity** slider (0 to 100%). It blends the effect over your untouched photo: 100% is the full effect, 50% is half effect and half original, 0% is the original. Lower it when an effect is right in character but too strong.'

export const articles: Article[] = [
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'effects-overview',
    title: 'Use Effects to restyle a photo in one click',
    summary: 'Load a photo, pick one of 58 effects, tune its sliders, compare with the original, then download at full size or send it to the Editor as a live layer.',
    category: 'effects',
    level: 'Beginner',
    updated: UPDATED,
    related: ['artistic-effects', 'quick-tools', 'moving-work-between-tools', 'filters-in-the-editor'],
    keywords: 'photo filter image effect filters online free halftone glitch dither download full size compare before after open in editor',
    body: [
      { t: 'p', text: 'Effects turns a photo into something else with one click: print dots, pixel art, a heat map, a glitch. You will be able to load an image, find an effect, tune it, check it against the original and get it out at full size or into the Editor. It is the fastest route when you want a look, not a layout.' },
      { t: 'try', label: 'Open Effects', href: '/effects' },

      { t: 'h', text: 'Load a photo' },
      { t: 'steps', items: [
        'Go to **/effects**. The page opens on a drop zone that says **Drop an image here**.',
        'Drag a file onto it, or click anywhere in the box to browse.',
        'The photo appears in the canvas with the effect list beside it (below it on a phone).',
      ] },
      { t: 'p', text: 'PNG, JPG, WebP and GIF are listed on the drop zone, and AVIF, BMP and SVG files are accepted too. The limit is 25 MB per file. If a file is too big or is not an image, a message under the badges tells you why and nothing is loaded.' },
      { t: 'p', text: 'Your photo is read in the browser. It is never uploaded. See [privacy and data](/learn/privacy-and-data) for what is and is not sent.' },

      { t: 'h', text: 'Pick an effect' },
      { t: 'p', text: 'The **Effects** section of the side panel holds every effect as a tile with a name and a one-line description. Click a tile and the effect is applied straight away. **Original** at the top removes the effect.' },
      { t: 'list', items: [
        '**Search effects...** filters by name and description, so typing "blur" finds Blur, Motion Blur, Radial Blur and Tilt Shift.',
        'The category tabs narrow the list: **All**, **Artistic**, **Stylize**, **Color**, **Distort** and **Enhance**. Each tab shows how many effects it holds.',
        'The small line at the bottom of the panel shows which effect is active.',
      ] },
      { t: 'p', text: 'Every effect is explained, setting by setting, in its own article: [artistic](/learn/artistic-effects), [stylize](/learn/stylise-effects), [color](/learn/colour-effects), [distort](/learn/distortion-effects) and [enhance](/learn/texture-effects).' },

      { t: 'h', text: 'Tune the settings' },
      { t: 'p', text: 'Under **Parameters** you get the sliders for the active effect, with a count of how many there are. Each slider shows its current value, and colour settings show a swatch and hex code. Changes apply live. On heavier effects the canvas shows a quick low-resolution version while you drag and the sharp version a moment after you let go, and the header shows **Processing** while it works.' },
      { t: 'p', text: 'Every effect has an **Opacity** slider as its last setting. It fades the effect back towards your original photo, which is often the quickest way to make a strong effect usable.' },

      { t: 'h3', text: 'Randomise' },
      { t: 'p', text: 'Effects built on a random pattern (Stipple, Pointillism, Crystallize, Glitch, Slice Shift, Noise, Film Grain and others) have a **Randomize** slider, called **Pattern** or **Noise Pattern** on a few. Each value gives a different but repeatable pattern, so you can scrub through variations and come back to the one you liked by returning to the same number.' },

      { t: 'h3', text: 'Reset, Undo and Clear' },
      { t: 'table', head: ['Button', 'What it does'], rows: [
        ['**Reset**', 'Puts every slider and colour back to its default and picks a new random pattern. The small **Reset** link above the sliders does the same.'],
        ['**Undo**', 'Goes back to the effect you had before, with the settings it had then. It steps through effect changes, not individual slider moves. It keeps the last 30 steps.'],
        ['**Clear**', 'Removes the photo and returns to the drop zone.'],
      ] },

      { t: 'h', text: 'Compare with the original' },
      { t: 'p', text: 'Click **Compare** above the canvas. A divider appears: the left side is labelled **EDITED** and the right side **ORIGINAL**. Drag the round handle to move the split. It works with a mouse, a finger or a pen.' },
      { t: 'keys', rows: [
        ['Left / Right', 'Move the divider by 2% (focus the handle first)'],
        ['Shift+Left / Shift+Right', 'Move the divider by 10%'],
        ['Home', 'Divider to the left edge'],
        ['End', 'Divider to the right edge'],
      ] },
      { t: 'p', text: 'The zoom controls sit on the right of the same bar: zoom out, zoom in, **Fit to view** and **1:1** (actual size). Zoom runs from 10% to 400%. The numbers beside them are your photo\'s real pixel size.' },

      { t: 'h', text: 'Download' },
      { t: 'p', text: 'Pick **PNG**, **JPG** or **WebP** in the header (in the bottom bar on a phone). The download is rendered again from your original photo at its own size, up to 8000 px on the long edge, not taken from the preview. Files are named like `voidcanvas-halftone-3000x2000.png`.' },
      { t: 'table', head: ['Format', 'Use it for'], rows: [
        ['PNG', 'Graphic effects with hard edges (Halftone, Dither, Threshold, Pixelate). No compression artefacts.'],
        ['JPG', 'Photographic looks (Vintage, Film Grain, Bloom) where a smaller file matters.'],
        ['WebP', 'Web pages. Smaller than JPG at similar quality.'],
      ] },

      { t: 'h', text: 'Send to the Editor' },
      { t: 'p', text: '**Open in Editor** sends your photo to the Editor with the effect on its own live filter layer above it. The effect stays editable there: you can re-tune it, hide it, mask it or stack more filters. Hold Shift when you click (desktop) to send one flattened image instead. On a phone the button is labelled **Editor**.' },
      { t: 'p', text: 'Read [filters in the Editor](/learn/filters-in-the-editor) for what you can do with the layer, and [moving work between tools](/learn/moving-work-between-tools) for how the handoff works.' },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: 'On a phone or a portrait tablet the canvas sits on top and the effect list and sliders sit underneath in their own scrolling panel. A bar pinned to the bottom of the screen holds **Undo**, **Reset**, **Clear**, **Editor** and the three download buttons, so they stay within reach of your thumb.' },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'The preview works at up to 1200 px on the long edge. Settings measured in pixels (dot size, block size, blur, shift distance) are scaled up for the download so it looks like the preview, only sharper.',
        'Dither, Edge Detect, Emboss, Sharpen, Pencil Sketch and Noise work pixel by pixel with no size setting. On a large photo their download is finer grained than the preview.',
        '**Open in Editor** sends the photo at the preview size (up to 1200 px on the long edge), so the live filter looks the same on the other side. If you need the full resolution, download instead.',
        'Sliders are shared between effects. If you set **Intensity** to 90 on Sepia and then pick Vintage, Vintage starts at 90 too. Press **Reset** when an effect looks wrong on arrival.',
        'Hue Shift and Channel Mix start at a visible setting when you pick them, because their neutral values change nothing. **Reset** puts them back to neutral.',
        'Only one effect applies at a time here. To stack effects, send the result to the Editor and add more filter layers.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'artistic-effects',
    title: 'Artistic effects and their settings',
    summary: 'All 12 effects in the Artistic tab, from Halftone and Dither to Oil Paint and Woodcut, with what every slider does to the picture.',
    category: 'effects',
    level: 'Beginner',
    updated: UPDATED,
    related: ['effects-overview', 'quick-tools', 'workflow-textured-print-look', 'texture-effects'],
    keywords: 'halftone dither ascii mosaic oil paint crosshatch stipple watercolour watercolor pencil sketch pop art warhol pointillism woodcut linocut print look drawing filter',
    body: [
      { t: 'p', text: 'The **Artistic** tab turns a photo into something that looks drawn, painted or printed. Use this page to pick the right one and to know which slider to reach for. Most of these effects throw away colour or detail on purpose, so start with a photo that has a clear subject and strong light.' },
      { t: 'note', text: opacityNote },
      { t: 'try', label: 'Try them in Effects', href: '/effects' },

      { t: 'h', text: 'Halftone' },
      { t: 'p', text: 'Classic print dots. The photo becomes black dots on white, laid out on a square grid. Each dot is sized by how dark that patch of the photo is: dark areas get big dots that touch, light areas get tiny ones or none.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Dot Size', '10 to 100', 'The grid spacing. Low values give fine dots that read as a photo from a distance. High values give big, graphic dots.'],
        ['Contrast', '20 to 100', 'How large the dots grow. At 50 the darkest dots just fill their cell. Above 50 dark dots grow into each other and shadows go solid. Below 50 every dot shrinks and the image goes lighter.'],
      ] },
      { t: 'p', text: '**Good for:** comic and pop-art posters, newspaper looks, screen-print style graphics. The result is always black and white; recolour it in the Editor with a colour layer or blend mode. There is also a dedicated [Halftone quick tool](/learn/quick-tools).' },

      { t: 'h', text: 'Dither' },
      { t: 'p', text: 'Floyd-Steinberg dithering. Every pixel becomes pure black or pure white, and the error is spread to its neighbours, so grey tones become patterns of scattered dots.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Threshold', '0 to 100', 'Where the split between black and white sits. Higher values push more of the image dark; lower values keep it bright.'],
      ] },
      { t: 'p', text: '**Good for:** retro computer and early game-console looks, one-colour print, zine covers. Works pixel by pixel, so the full-size download is finer than the preview.' },

      { t: 'h', text: 'ASCII' },
      { t: 'p', text: 'Splits the image into a grid of square cells and fills each one solid black or solid white from the cell\'s average brightness. It does not draw letters: the result is a chunky two-tone block grid.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Cell Size', '10 to 80', 'The size of each block. Small cells keep the shape of the subject; large cells turn it into a bold, blocky silhouette.'],
      ] },
      { t: 'p', text: '**Good for:** a harsh one-bit, low-resolution look and bold silhouettes on a strong subject.' },

      { t: 'h', text: 'Mosaic' },
      { t: 'p', text: 'Square tiles, each filled with the average colour of the photo under it, with a thin darker line on the top and left of every tile like grout.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Tile Size', '5 to 100', 'The width of each tile. Small tiles keep the picture readable; large ones abstract it into blocks of colour.'],
      ] },
      { t: 'p', text: '**Good for:** tile and glass-block textures, backgrounds, abstract colour studies. Pick Pixelate instead if you do not want the grout lines.' },

      { t: 'h', text: 'Oil Paint' },
      { t: 'p', text: 'Each pixel takes the average colour of the most common tone around it. Fine texture disappears, edges stay, and flat patches of colour form like brush strokes.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Brush Size', '10 to 100', 'How far around each pixel it looks. Bigger brushes give larger, smoother patches and a more painted look. Larger values take longer to render.'],
        ['Detail', '10 to 100', 'How many tone bands it separates the photo into. Low values give broad, flat areas; high values keep more subtle shading.'],
      ] },
      { t: 'p', text: '**Good for:** portraits and landscapes you want to feel painted, softening busy backgrounds while keeping outlines.' },

      { t: 'h', text: 'Crosshatch' },
      { t: 'p', text: 'Dark ink lines on warm cream paper. Light areas stay blank. As the photo gets darker, more line directions are added: first one diagonal, then the other diagonal, then horizontal lines, and vertical lines only in the very darkest areas.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Line Spacing', '10 to 100', 'The gap between lines. Tight spacing reads as fine pen shading; wide spacing looks bold and graphic.'],
      ] },
      { t: 'p', text: '**Good for:** engraving and pen-and-ink illustration looks, editorial portraits, packaging.' },

      { t: 'h', text: 'Stipple' },
      { t: 'p', text: 'Tiny near-black dots scattered on cream paper. Dark areas get many dots, light areas few or none, the way an illustrator shades with a technical pen.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Dot Density', '10 to 100', 'How many dots go into dark areas. Raise it to make shadows denser and the image darker overall.'],
        ['Cell Size', '10 to 100', 'The patch size the photo is measured in. Small cells follow detail closely; larger cells give a looser, more even spread.'],
        ['Randomize', '0 to 1000', 'Moves every dot to a new random position without changing the tone.'],
      ] },
      { t: 'p', text: '**Good for:** scientific-illustration and old-print looks, subtle texture behind type.' },

      { t: 'h', text: 'Watercolor' },
      { t: 'p', text: 'Softens the photo, reduces it to a limited set of colours, then darkens the boundaries between colour areas slightly, like paint pooling at the edge of a wash.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Softness', '10 to 100', 'How much the photo is blurred first. Higher values give looser, blurrier washes.'],
        ['Detail Levels', '10 to 100', 'How many colour steps are kept. Low values give flat, poster-like washes; high values keep smoother gradients.'],
      ] },
      { t: 'p', text: '**Good for:** gentle, illustrated looks for invitations, menus and travel images.' },

      { t: 'h', text: 'Pencil Sketch' },
      { t: 'p', text: 'Finds the edges in the photo and draws them as grey pencil lines on white. Flat areas go white.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Line Strength', '10 to 100', 'How dark the lines are and how many faint edges show. Low values give a light outline sketch; high values bring in texture and heavy lines.'],
      ] },
      { t: 'p', text: '**Good for:** line drawings of products and buildings, colouring-page style art, a base to paint over in the Editor. Works pixel by pixel, so large downloads have finer lines than the preview.' },

      { t: 'h', text: 'Pop Art' },
      { t: 'p', text: 'Splits the photo into bands of brightness and gives each band a bright colour from a fixed palette of pink, cyan, yellow, orange, green, purple, light pink and blue.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Color Levels', '10 to 100', 'How many brightness bands there are. Low values give three bold flat colours; high values give up to eight.'],
        ['Color Blend', '0 to 100%', 'How much of the pop palette replaces the photo\'s own colours. 100% is pure palette; lower values let the original show through.'],
      ] },
      { t: 'p', text: '**Good for:** Warhol-style portraits, loud social posts, a series of the same image in different treatments.' },

      { t: 'h', text: 'Pointillism' },
      { t: 'p', text: 'Round dots of colour taken from the photo, slightly jittered off a grid, on a near-black background that shows between them.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Dot Size', '10 to 100', 'The size of each dot. Small dots keep the image readable; large dots make an abstract, confetti-like picture.'],
        ['Randomize', '0 to 1000', 'Shuffles the jitter so each dot lands in a slightly different place.'],
      ] },
      { t: 'p', text: '**Good for:** colourful abstract backgrounds, a painterly nod to Seurat, night-time and neon photos where the dark background suits.' },

      { t: 'h', text: 'Woodcut' },
      { t: 'p', text: 'Black ink on off-white paper, cut with diagonal grain lines. Dark areas print solid, mid-tones become lines, and light areas stay paper.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Threshold', '0 to 100', 'Shown on the panel. In the current version it does not change the result.'],
        ['Line Spacing', '10 to 100', 'The width of the grain lines. Low values give fine lines; high values give broad, rough cuts.'],
      ] },
      { t: 'p', text: '**Good for:** linocut and woodblock posters, craft beer and folk-style labels. For a rougher print, follow with Film Grain in the Editor. See [the textured print look workflow](/learn/workflow-textured-print-look).' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'stylise-effects',
    title: 'Stylize effects and their settings',
    summary: 'All 11 effects in the Stylize tab: Pixelate, Posterize, Edge Detect, Emboss, Threshold, Solarize, Kaleidoscope, Mirror, Tilt Shift, Crystallize and Low Poly.',
    category: 'effects',
    level: 'Beginner',
    updated: UPDATED,
    related: ['effects-overview', 'artistic-effects', 'distortion-effects'],
    keywords: 'stylise stylize pixelate pixel art posterise posterize edge detection outline emboss threshold black and white solarise solarize kaleidoscope mirror symmetry tilt shift miniature crystallise crystallize low poly triangles',
    body: [
      { t: 'p', text: 'The **Stylize** tab changes the structure of a photo: its tones, its edges or its geometry. Use this page to find the effect that gives you the shape you want and to set it quickly. These are often the first step of a graphic treatment rather than the finish.' },
      { t: 'note', text: opacityNote },
      { t: 'try', label: 'Try them in Effects', href: '/effects' },

      { t: 'h', text: 'Pixelate' },
      { t: 'p', text: 'Square blocks, each filled with the average colour of the photo under it. No gaps or lines between blocks.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Pixel Size', '5 to 100', 'The block size. Low values give a subtle low-resolution look; high values give big, obvious pixel art.'],
      ] },
      { t: 'p', text: '**Good for:** retro game looks, hiding faces or details, bold backgrounds. Combine with Posterize in the Editor for a limited-palette pixel look.' },

      { t: 'h', text: 'Posterize' },
      { t: 'p', text: 'Cuts each colour channel down to a few steps, so smooth gradients become flat bands.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Levels', '10 to 100', 'How many steps each channel keeps, from 2 at the low end to 10 at the top. Fewer levels give flatter, harsher colour; the image also gets a little darker as levels drop.'],
      ] },
      { t: 'p', text: '**Good for:** screen-print and poster looks, preparing an image for a limited ink count, stylised skies.' },

      { t: 'h', text: 'Edge Detect' },
      { t: 'p', text: 'Finds edges with a Sobel filter and draws them as white lines on black. Everything else goes black.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Threshold', '0 to 200', 'How strong an edge must be to show. Low values show every texture and a lot of noise; high values keep only the strongest outlines.'],
      ] },
      { t: 'p', text: '**Good for:** neon outline looks, technical and blueprint styles, a mask source in the Editor. Invert it in the Editor for black lines on white. Works pixel by pixel, so large downloads show finer edges than the preview.' },

      { t: 'h', text: 'Emboss' },
      { t: 'p', text: 'Turns the photo into a grey relief, as if pressed into metal or paper. Edges facing the light go bright, edges facing away go dark, flat areas go mid-grey. Some colour shows at strong edges.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Depth', '10 to 100', 'How deep the relief looks. Higher values give stronger light and shadow on every edge.'],
        ['Light Angle', '0 to 360°', 'The direction the light comes from. It snaps to the nearest of eight directions (every 45°), so small moves may not change anything.'],
      ] },
      { t: 'p', text: '**Good for:** stamped logos, metal and coin looks, texture layers set to Overlay in the Editor.' },

      { t: 'h', text: 'Threshold' },
      { t: 'p', text: 'Every pixel becomes pure black or pure white depending on its brightness. No patterns, no greys.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Threshold', '0 to 100', 'The cut point. Higher values turn more of the image black; lower values turn more of it white.'],
      ] },
      { t: 'p', text: '**Good for:** stencil and photocopy looks, one-colour stamps, cleaning up scanned line art. Use Dither instead if you want to keep a sense of grey.' },

      { t: 'h', text: 'Solarize' },
      { t: 'p', text: 'Inverts only the bright parts of each colour channel and leaves the dark parts alone, the darkroom effect Man Ray made famous. Highlights flip, shadows stay.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Threshold', '0 to 100', 'Brightness above which a channel is inverted. Lower values invert more of the image; at 100 nothing changes.'],
      ] },
      { t: 'p', text: '**Good for:** surreal portraits, album art, psychedelic colour.' },

      { t: 'h', text: 'Kaleidoscope' },
      { t: 'p', text: 'Takes one wedge of the photo, starting just right of the centre, and repeats it around the centre, mirroring every other wedge.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Segments', '2 to 24', 'How many wedges make the circle. Low values give simple mirror symmetry; high values give dense mandala patterns.'],
      ] },
      { t: 'p', text: '**Good for:** patterns, abstract backgrounds, music and festival graphics. Because the source wedge sits to the right of centre, crop or place the photo in the Editor first so the interesting part is there.' },

      { t: 'h', text: 'Mirror' },
      { t: 'p', text: 'Reflects part of the photo onto the rest. The **Mode** slider is shown in degrees, but it picks one of four modes by range rather than setting an angle.' },
      { t: 'table', head: ['Mode value', 'Result'], rows: [
        ['0 to 89°', 'Left half mirrored onto the right half.'],
        ['90 to 179°', 'Top half mirrored onto the bottom half.'],
        ['180 to 269°', 'Top-left quarter mirrored into all four quarters.'],
        ['270 to 360°', 'Left half copied to the right, turned upside down (point symmetry).'],
      ] },
      { t: 'p', text: '**Good for:** symmetrical faces and architecture, surreal landscapes, reflections in a "lake" when you use top to bottom.' },

      { t: 'h', text: 'Tilt Shift' },
      { t: 'p', text: 'Keeps a horizontal band sharp and blurs more and more above and below it. Scenes shot from above start to look like miniature models.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Blur Strength', '10 to 100', 'How blurry the top and bottom get at their furthest point.'],
        ['Focus Band', '10 to 100', 'How tall the sharp band is, roughly as a percentage of the image height.'],
        ['Center Y', '0 to 100%', 'Where the sharp band sits, from the top (0%) to the bottom (100%).'],
      ] },
      { t: 'p', text: '**Good for:** city and street shots from a height, drawing the eye to one strip of a photo. The band is always horizontal.' },

      { t: 'h', text: 'Crystallize' },
      { t: 'p', text: 'Breaks the photo into irregular polygon cells, each filled with a single colour sampled from the photo, like looking through textured glass.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Crystal Size', '10 to 100', 'The size of each cell. Small cells keep detail; large ones make a stained-glass abstraction.'],
        ['Randomize', '0 to 1000', 'Moves the cell centres to give a new arrangement.'],
      ] },
      { t: 'p', text: '**Good for:** abstract backgrounds, frosted-glass and stained-glass looks, disguising a busy photo behind type.' },

      { t: 'h', text: 'Low Poly' },
      { t: 'p', text: 'Divides the photo into a regular grid of squares and splits each one corner to corner into two triangles, each filled with its average colour.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Triangle Size', '10 to 100', 'The size of the grid squares. Small triangles keep the subject recognisable; large ones make a bold geometric pattern.'],
      ] },
      { t: 'p', text: '**Good for:** geometric backgrounds, tech and gaming graphics. The grid is regular, so the look is ordered rather than a hand-cut polygon portrait.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'colour-effects',
    title: 'Color effects and their settings',
    summary: 'All 12 effects in the Color tab, from Duotone and Gradient Map to Thermal and Night Vision, and how to set their colours so they do what you expect.',
    category: 'effects',
    level: 'Beginner',
    updated: UPDATED,
    related: ['effects-overview', 'colour-that-works', 'adjustment-layers', 'stylise-effects'],
    keywords: 'colour color grade grading duotone two tone sepia invert negative channel mixer thermal heat map night vision infrared cyberpunk neon vintage film gradient map hue shift colour balance tint',
    body: [
      { t: 'p', text: 'The **Color** tab changes the colours of a photo but keeps its shapes. Use this page to set up duotones and gradient maps with the right colours, and to know what the preset looks such as Thermal or Vintage will do. Several of these start from shared default colours that do little or something odd, so the colour tips here matter.' },
      { t: 'note', text: opacityNote },
      { t: 'try', label: 'Try them in Effects', href: '/effects' },

      { t: 'h', text: 'Duotone' },
      { t: 'p', text: 'Maps the photo\'s brightness onto two colours: the darkest parts take the shadow colour, the brightest take the highlight colour, and everything between is a blend.' },
      { t: 'table', head: ['Setting', 'Type', 'What it does'], rows: [
        ['Shadow Color', 'Colour', 'The colour of the darkest areas. Usually the deeper, richer of your two colours.'],
        ['Highlight Color', 'Colour', 'The colour of the brightest areas. A light tint keeps the image readable.'],
      ] },
      { t: 'p', text: 'The starting colours are black and white, which gives a plain greyscale image. Pick your own two to see the effect. Use a dark and a light colour: two colours of similar lightness flatten the photo.' },
      { t: 'p', text: '**Good for:** brand-coloured photos, a set of images that need to match, posters in two inks. Use your [brand kit](/learn/brand-kit) colours.' },

      { t: 'h', text: 'Sepia' },
      { t: 'p', text: 'The warm brown tone of old photographic prints.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Intensity', '0 to 100', 'How far the photo moves towards full sepia. 0 is unchanged, 100 is full brown-toned.'],
      ] },
      { t: 'p', text: '**Good for:** heritage and anniversary material, a gentle warm grade at low Intensity.' },

      { t: 'h', text: 'Invert' },
      { t: 'p', text: 'Turns every colour into its opposite, like a film negative. It has only the Opacity slider. At 50% the result turns into flat grey, so keep Opacity high.' },
      { t: 'p', text: '**Good for:** negative looks, turning black-on-white line art into white-on-black, checking tone balance.' },

      { t: 'h', text: 'Channel Mix' },
      { t: 'p', text: 'Turns the red, green and blue channels up or down on their own. It starts on a warm setting (Red 130, Green 95, Blue 70) so you see a change straight away.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Red', '0 to 200', 'Strength of the red channel. 100 is unchanged, above 100 adds red, below removes it (and the image shifts towards cyan).'],
        ['Green', '0 to 200', 'Strength of the green channel. Below 100 shifts towards magenta.'],
        ['Blue', '0 to 200', 'Strength of the blue channel. Below 100 shifts towards yellow and warmer tones.'],
      ] },
      { t: 'p', text: '**Good for:** quick warm or cool casts, correcting a colour cast, strange alien colour when you push one channel to 0.' },

      { t: 'h', text: 'Thermal' },
      { t: 'p', text: 'A heat-camera look. Brightness is mapped along a fixed ramp: black, then blue, purple, red, yellow and white for the brightest areas. It has only the Opacity slider.' },
      { t: 'p', text: '**Good for:** tech and science themes, music artwork, attention-grabbing thumbnails. The photo is not measuring heat: bright things look hot.' },

      { t: 'h', text: 'Night Vision' },
      { t: 'p', text: 'Green, grainy monochrome with darkened corners, like looking through a night-vision scope.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Noise Pattern', '0 to 1000', 'Changes the pattern of the grain. The amount of grain stays the same.'],
      ] },
      { t: 'p', text: '**Good for:** thriller, surveillance and gaming themes.' },

      { t: 'h', text: 'Infrared' },
      { t: 'p', text: 'Imitates infrared photography. Green areas such as foliage turn pale and bright, reds turn dark, and blue is pulled right down, so the image takes on a warm, pale cast. It has only the Opacity slider.' },
      { t: 'p', text: '**Good for:** dreamlike landscapes and trees, album covers. Works best on photos with a lot of green.' },

      { t: 'h', text: 'Cyberpunk' },
      { t: 'p', text: 'A neon violet grade. Highlights go violet, mid-tones go lavender, and shadows are lifted towards a pale grey.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Intensity', '10 to 100', 'How far the grade is applied. At high values the dark areas become light, so contrast flattens or flips. Around 30 to 50 keeps the photo readable with a strong neon tint.'],
      ] },
      { t: 'p', text: '**Good for:** night-life, gaming and tech promos, synthwave artwork.' },

      { t: 'h', text: 'Vintage' },
      { t: 'p', text: 'A faded film look: lower contrast, lifted blacks, a warm yellow cast with less blue, and darkened corners.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Intensity', '10 to 100', 'Controls the colour fade and the corner darkening together. Higher values look older and more washed out.'],
      ] },
      { t: 'p', text: '**Good for:** nostalgic and lifestyle images, a soft background for type. Add Film Grain in the Editor for a fuller film feel.' },

      { t: 'h', text: 'Gradient Map' },
      { t: 'p', text: 'Like Duotone with a third colour in the middle. Shadows blend into midtones, and midtones blend into highlights.' },
      { t: 'table', head: ['Setting', 'Type', 'What it does'], rows: [
        ['Shadows', 'Colour', 'The colour of the darkest areas.'],
        ['Midtones', 'Colour', 'The colour at mid-grey.'],
        ['Highlights', 'Colour', 'The colour of the brightest areas.'],
      ] },
      { t: 'p', text: 'The starting colours are black, white and red, which puts white in the midtones and red in the highlights. For a natural-looking map, choose three colours that go from dark to light, such as navy, coral and cream.' },
      { t: 'p', text: '**Good for:** brand-coloured imagery, sunset and neon grades, turning a dull photo into a poster background.' },

      { t: 'h', text: 'Hue Shift' },
      { t: 'p', text: 'Rotates every colour around the colour wheel. Brightness and saturation stay the same. It starts at 120° so you see a change straight away.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Hue Rotation', '0 to 360°', 'How far to turn the colour wheel. 0 and 360 are unchanged, 180 swaps each colour for its opposite (blue sky turns orange).'],
      ] },
      { t: 'p', text: '**Good for:** colour variations of one product shot, surreal skies and foliage. Greys, black and white do not change.' },

      { t: 'h', text: 'Color Balance' },
      { t: 'p', text: 'Tints the shadows and the highlights separately. The tint is measured against mid-grey: a colour picked as mid-grey (#808080) adds nothing, and the further your colour is from grey the stronger its push.' },
      { t: 'table', head: ['Setting', 'Type or range', 'What it does'], rows: [
        ['Shadow Tint', 'Colour', 'Pushes dark areas towards this colour. A dark colour also deepens shadows.'],
        ['Highlight Tint', 'Colour', 'Pushes bright areas towards this colour. A light colour also brightens highlights.'],
        ['Intensity', '0 to 100', 'How strong both tints are. 0 is no change.'],
      ] },
      { t: 'p', text: 'The starting tints are black and white, which simply adds contrast. For the classic film grade, try a teal shadow tint and a warm orange highlight tint at a low Intensity.' },
      { t: 'p', text: '**Good for:** cinematic grades, matching a set of photos to a mood, warming skin while cooling shadows.' },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'Duotone, Gradient Map, Color Balance and Lens Flare share their colour slots. A colour you pick in one is waiting in the next. Press **Reset** to go back to the starting colours.',
        'For precise, stackable colour work (curves, levels, hue and saturation), use [adjustment layers](/learn/adjustment-layers) in the Editor.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'distortion-effects',
    title: 'Distort effects and their settings',
    summary: 'All 12 effects in the Distort tab, from Glitch and RGB Shift to Swirl, Fisheye and Pixel Sort, with what every slider does.',
    category: 'effects',
    level: 'Intermediate',
    updated: UPDATED,
    related: ['effects-overview', 'quick-tools', 'stylise-effects', 'texture-effects'],
    keywords: 'distortion distort glitch datamosh rgb split chromatic aberration wave ripple displace warp crt retro tv swirl twirl fisheye bulge motion blur radial zoom blur pixel sort pixel sorting slice shift',
    body: [
      { t: 'p', text: 'The **Distort** tab moves pixels around: slicing, shifting, warping and smearing them. Use this page to get a glitch or lens look under control. These effects are sensitive, so small slider moves can change a lot; set the strength first, then the pattern.' },
      { t: 'note', text: opacityNote },
      { t: 'try', label: 'Try them in Effects', href: '/effects' },

      { t: 'h', text: 'Glitch' },
      { t: 'p', text: 'Cuts the photo into horizontal strips and slides about three in ten of them sideways, like a corrupted video frame. The rest stay in place.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Offset', '10 to 100', 'How far the shifted strips move. Low values give a subtle tear; high values throw strips far across the frame.'],
        ['Slice Height', '5 to 100', 'How tall each strip is. Thin strips look like signal noise; tall strips look like broken blocks.'],
        ['Randomize', '0 to 1000', 'Picks which strips move and by how much. Scrub it to find a good arrangement.'],
      ] },
      { t: 'p', text: '**Good for:** music, tech and gaming artwork, thumbnails. There is also a [Glitch quick tool](/learn/quick-tools).' },

      { t: 'h', text: 'RGB Shift' },
      { t: 'p', text: 'Moves the red channel one way and the blue channel the opposite way. Green stays put, so edges get red and blue fringes.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Shift Amount', '5 to 100', 'How far the channels are pulled apart. Low values give a slight 3D-glasses edge; high values double the image.'],
        ['Direction', '0 to 360°', 'The direction of the split. 0° is horizontal, 90° vertical.'],
      ] },
      { t: 'p', text: '**Good for:** a quick analogue or VHS feel, energy on portraits and type.' },

      { t: 'h', text: 'Chromatic' },
      { t: 'p', text: 'A stronger colour split. Red and blue move in opposite directions along the angle, and green moves at right angles to them by half the distance, so all three colours separate.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Spread', '5 to 100', 'How far the colours separate. It goes further than RGB Shift at the same value.'],
        ['Angle', '0 to 360°', 'The direction of the red and blue split.'],
      ] },
      { t: 'p', text: '**Good for:** lens-aberration and cheap-camera looks, trippy portraits. The split is the same across the whole frame, unlike a real lens where it grows towards the edges.' },

      { t: 'h', text: 'Wave' },
      { t: 'p', text: 'Ripples the photo with a regular sine wave.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Frequency', '10 to 100', 'The width of each wave. Despite the name, higher values give wider, gentler waves and lower values give tight ripples.'],
        ['Amplitude', '10 to 100', 'How far pixels are pushed. Higher values bend lines more.'],
        ['Direction', '0 to 360°', 'The direction the waves run across the image.'],
      ] },
      { t: 'p', text: '**Good for:** water reflections, heat haze, psychedelic posters.' },

      { t: 'h', text: 'Displace' },
      { t: 'p', text: 'An organic, irregular warp built from overlapping waves, so it looks less regular than Wave.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Strength', '5 to 100', 'How far pixels are pushed.'],
        ['Frequency', '10 to 100', 'The size of the warp. As with Wave, higher values give broader, smoother bends.'],
        ['Pattern', '0 to 1000', 'Shifts the warp to a new arrangement.'],
      ] },
      { t: 'p', text: '**Good for:** liquid and dream effects, warped backgrounds behind type.' },

      { t: 'h', text: 'CRT' },
      { t: 'p', text: 'An old tube monitor: the image bulges outward, dark scanlines run across it, red, green and blue stripes appear in the columns, and the edges fade to black.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Barrel Distortion', '0 to 100', 'How much the screen bulges. 0 keeps it flat.'],
        ['Scanline Gap', '10 to 100', 'The spacing of the dark scanlines. Low values give dense lines; high values space them out.'],
      ] },
      { t: 'p', text: '**Good for:** retro gaming, 80s and 90s nostalgia, screenshots made to look like old TVs.' },

      { t: 'h', text: 'Swirl' },
      { t: 'p', text: 'Twists the photo around its centre. The twist is strongest in the middle and fades to nothing at a circle as wide as the shorter side, so the corners stay untouched.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Twist Amount', '0 to 100', 'How far the centre is turned, up to about two full turns. 0 is no change.'],
      ] },
      { t: 'p', text: '**Good for:** hypnotic and psychedelic art, drain and vortex looks. Centre the subject first, as the swirl is always around the middle.' },

      { t: 'h', text: 'Fisheye' },
      { t: 'p', text: 'Bends the photo as if through a wide lens.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Distortion', '10 to 100', 'At 50 nothing changes. Above 50 the centre bulges outward (the fisheye look). Below 50 the centre pinches inward.'],
      ] },
      { t: 'p', text: 'The default value (after **Reset**) is 50, so the photo looks unchanged until you move the slider. Strong bulges stretch and smear the corners.' },
      { t: 'p', text: '**Good for:** skate and street photo looks, comic close-ups, funny pet portraits.' },

      { t: 'h', text: 'Motion Blur' },
      { t: 'p', text: 'Smears the photo in one direction, as if the camera or subject moved.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Length', '5 to 100', 'How long the streak is.'],
        ['Direction', '0 to 360°', 'The direction of the streak. 0° is horizontal.'],
      ] },
      { t: 'p', text: '**Good for:** a sense of speed on cars, runners and sport. Mask it in the Editor to keep the subject sharp and blur only the background.' },

      { t: 'h', text: 'Radial Blur' },
      { t: 'p', text: 'A zoom blur. Pixels are smeared along lines from a centre point, and the blur grows with distance from it, so the centre stays sharp.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Strength', '10 to 100', 'How much the outer areas are smeared.'],
        ['Center X', '0 to 100%', 'Horizontal position of the sharp point, from left to right.'],
        ['Center Y', '0 to 100%', 'Vertical position of the sharp point, from top to bottom.'],
      ] },
      { t: 'p', text: '**Good for:** action and impact, pulling focus to a face or product. Set Center X and Y on the subject first.' },

      { t: 'h', text: 'Pixel Sort' },
      { t: 'p', text: 'In every row, runs of pixels brighter than the threshold are sorted from dark to light, left to right. Bright areas turn into horizontal streaks; dark areas stay as they are.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Brightness Threshold', '0 to 100', 'Only pixels brighter than this are sorted. Lower values sort more of the image and give longer streaks; higher values sort only highlights.'],
        ['Randomize', '0 to 1000', 'Shown on the panel. In the current version Pixel Sort gives the same result at any value.'],
      ] },
      { t: 'p', text: '**Good for:** glitch art, skies and bright backgrounds that melt into streaks. Sorting is always horizontal.' },

      { t: 'h', text: 'Slice Shift' },
      { t: 'p', text: 'Cuts the whole photo into equal bands and shifts every band by a random amount. Unlike Glitch, every band moves.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Shift Amount', '10 to 100', 'How far the bands can move.'],
        ['Slice Count', '5 to 100', 'How many bands the photo is cut into. Low values give a few wide bands; high values give many thin ones.'],
        ['Direction', '0 to 360°', 'Between about 46° and 134° the bands are vertical columns shifted up and down. At every other value they are horizontal rows shifted sideways.'],
        ['Randomize', '0 to 1000', 'Picks new shift amounts for each band.'],
      ] },
      { t: 'p', text: '**Good for:** editorial and fashion layouts, broken-poster looks, type treatments.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'texture-effects',
    title: 'Enhance and texture effects and their settings',
    summary: 'All 11 effects in the Enhance tab: Blur, Sharpen, Vignette, Noise, Film Grain, Scanlines, Bloom, Freeze, Dot Matrix, Lens Flare and Film Burn.',
    category: 'effects',
    level: 'Beginner',
    updated: UPDATED,
    related: ['effects-overview', 'workflow-textured-print-look', 'distortion-effects', 'artistic-effects'],
    keywords: 'texture enhance blur soften sharpen vignette noise film grain grainy analogue scanlines bloom glow freeze icy dot matrix led lens flare light leak film burn',
    body: [
      { t: 'p', text: 'The **Enhance** tab adds finishing texture and light: grain, glow, flares and edges. Use this page to pick the right finish and keep it subtle. Most of these work best at lower strength than you first try, and many are worth stacking in the Editor on top of another effect.' },
      { t: 'note', text: opacityNote },
      { t: 'try', label: 'Try them in Effects', href: '/effects' },

      { t: 'h', text: 'Blur' },
      { t: 'p', text: 'An even blur across the whole photo.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Radius', '10 to 100', 'How soft the image gets. Even at 100 it is a moderate blur, not a full wash.'],
      ] },
      { t: 'p', text: '**Good for:** softening a background so type on top reads better. For heavier or masked blurs, use blur in the Editor.' },

      { t: 'h', text: 'Sharpen' },
      { t: 'p', text: 'Increases the contrast along edges so detail looks crisper.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Amount', '10 to 100', 'How strongly edges are boosted. High values create bright halos and bring up noise.'],
      ] },
      { t: 'p', text: '**Good for:** slightly soft photos and product shots. Keep it low and check at 1:1 zoom. Works pixel by pixel, so a large download sharpens finer detail than the preview shows.' },

      { t: 'h', text: 'Vignette' },
      { t: 'p', text: 'Darkens the photo towards its edges and corners to hold the eye in the middle.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Strength', '10 to 100', 'How dark the edges get. Above about 50 the corners go fully black.'],
        ['Radius', '10 to 100', 'How far the darkening reaches in. Low values keep it at the edges; high values spread it towards the centre, and at 100 the whole image darkens evenly.'],
      ] },
      { t: 'p', text: '**Good for:** portraits, food and product shots, moody posters.' },

      { t: 'h', text: 'Noise' },
      { t: 'p', text: 'Adds fine random speckle, one pixel at a time, in grey rather than colour.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Amount', '0 to 100', 'How strong the speckle is. 0 is none.'],
        ['Randomize', '0 to 1000', 'Changes the speckle pattern.'],
      ] },
      { t: 'p', text: '**Good for:** breaking up banding in gradients, a digital-sensor texture. Use Film Grain for something softer.' },

      { t: 'h', text: 'Film Grain' },
      { t: 'p', text: 'Like Noise, but the speckle comes in small clumps, closer to the grain of film.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Amount', '0 to 100', 'How strong the grain is.'],
        ['Grain Size', '10 to 100', 'The size of each clump. Low values are fine; high values are coarse.'],
        ['Randomize', '0 to 1000', 'Changes the grain pattern.'],
      ] },
      { t: 'p', text: '**Good for:** analogue and film looks, giving flat digital graphics a tactile finish, print-style texture. Pairs well with Vintage.' },

      { t: 'h', text: 'Scanlines' },
      { t: 'p', text: 'Dark horizontal lines across the photo at regular intervals.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Line Spacing', '10 to 100', 'The distance from one line to the next.'],
        ['Darkness', '10 to 100', 'How dark each line is. 100 is solid black.'],
        ['Thickness', '10 to 100', 'How thick each line is. If lines get as thick as the spacing, the whole image just darkens.'],
      ] },
      { t: 'p', text: '**Good for:** retro screen and broadcast looks, subtle texture on social graphics. Use CRT (in Distort) for the full old-TV treatment.' },

      { t: 'h', text: 'Bloom' },
      { t: 'p', text: 'Makes bright areas glow: they are picked out, blurred and added back over the photo.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Brightness Cutoff', '0 to 100', 'How bright an area must be to glow. Low values make most of the image glow and wash it out; high values limit glow to lights and highlights.'],
        ['Glow Size', '10 to 100', 'How far the glow spreads.'],
        ['Glow Strength', '10 to 100', 'How bright the glow is.'],
      ] },
      { t: 'p', text: '**Good for:** night scenes and neon signs, dreamy portraits, product highlights.' },

      { t: 'h', text: 'Freeze' },
      { t: 'p', text: 'An icy blue grade. Reds are pulled down, blues lifted, and the brightest highlights get a cold shimmer.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Intensity', '10 to 100', 'How cold the image gets and how strong the highlight shimmer is.'],
      ] },
      { t: 'p', text: '**Good for:** winter campaigns, cold drinks, sci-fi.' },

      { t: 'h', text: 'Dot Matrix' },
      { t: 'p', text: 'A grid of round dots on black, like an LED sign. Each dot takes its colour from the photo, and brighter areas get bigger dots.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Dot Size', '10 to 100', 'The grid spacing. Small values keep the picture readable; large values make big, obvious LEDs.'],
      ] },
      { t: 'p', text: '**Good for:** scoreboards, stadium and event graphics, retro tech. It keeps colour, unlike Halftone, and bright dots on black is the reverse of Halftone\'s dark dots on white.' },

      { t: 'h', text: 'Lens Flare' },
      { t: 'p', text: 'A soft glow of colour at a point you choose, with a thin pale ring around it.' },
      { t: 'table', head: ['Setting', 'Type or range', 'What it does'], rows: [
        ['Brightness', '10 to 100', 'How strong the glow and ring are.'],
        ['Flare Size', '10 to 100', 'The radius of the glow, as a share of the image\'s long side.'],
        ['Position X', '0 to 100%', 'Where the flare sits from left to right.'],
        ['Position Y', '0 to 100%', 'Where the flare sits from top to bottom.'],
        ['Flare Color', 'Colour', 'The colour of the glow.'],
      ] },
      { t: 'warn', text: 'The starting Flare Color is black, and a black glow adds nothing, so at first you only see the ring. Pick a warm white, yellow or orange to see the flare.' },
      { t: 'p', text: '**Good for:** sunlight in a corner of a landscape, a warm glow behind a product or headline. Put the flare where a light source could plausibly be.' },

      { t: 'h', text: 'Film Burn' },
      { t: 'p', text: 'Warm light leaks creeping in from the left, right and top edges, plus scattered orange and red burn speckle across the frame.' },
      { t: 'table', head: ['Setting', 'Range', 'What it does'], rows: [
        ['Burn Intensity', '10 to 100', 'How strong the leaks and burns are. High values wash the edges out in orange.'],
        ['Pattern', '0 to 1000', 'Changes the burn speckle. The edge leaks stay in the same place.'],
      ] },
      { t: 'p', text: '**Good for:** analogue film and music artwork, warm nostalgic social posts. Keep Opacity around 50 to 70% for a gentler leak.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'quick-tools',
    title: 'Use the Halftone, Dither and Glitch quick tools',
    summary: 'Three single-purpose pages that load with a sample image, give you just the sliders that matter, and download a full-size PNG or send the result to the Editor.',
    category: 'effects',
    level: 'Beginner',
    updated: UPDATED,
    related: ['effects-overview', 'artistic-effects', 'distortion-effects', 'moving-work-between-tools'],
    keywords: 'halftone generator dither generator glitch image generator online free tool no account send to layer stack shuffle download png',
    body: [
      { t: 'p', text: 'The quick tools are three focused pages for the effects people look for most: halftone, dither and glitch. You will be able to use each one, get a full-size file out and move the result into the Editor. Use them when you know the look you want; use [Effects](/learn/effects-overview) when you want to browse.' },

      { t: 'h', text: 'The three tools' },
      { t: 'table', head: ['Tool', 'Address', 'Sliders'], rows: [
        ['Halftone Generator', '/tools/halftone', 'Dot size, Contrast'],
        ['Dither Generator', '/tools/dither', 'Threshold'],
        ['Glitch Image Generator', '/tools/glitch', 'Offset, Slice height, Randomize'],
      ] },
      { t: 'p', text: 'The sliders behave exactly as in Effects. See [Halftone and Dither](/learn/artistic-effects) and [Glitch](/learn/distortion-effects) for what each does to the picture.' },
      { t: 'try', label: 'Open the Halftone Generator', href: '/tools/halftone' },

      { t: 'h', text: 'Use a quick tool' },
      { t: 'steps', items: [
        'Open the tool. A sample photo is already loaded, marked **Example. Drop your own image to start.**, so you can see the effect before you do anything.',
        'Click **Upload your image**, or drag a file onto the preview. The preview works at up to 1200 px on the long edge.',
        'Move the sliders under **Adjust**. The preview updates as you drag.',
        'On the Glitch tool, press **Shuffle** for a new random arrangement of slices, or scrub the **Randomize** slider.',
        'Press **Download PNG**, or **Send to Layer Stack** to carry on in the Editor.',
      ] },
      { t: 'p', text: '**Reset adjustments** puts the sliders back to their starting values.' },

      { t: 'h', text: 'Download PNG' },
      { t: 'p', text: 'The download is rendered again from your original file at its own size, up to 8000 px on the long edge, with pixel-based settings scaled so it matches the preview, only sharper. The file is named after the tool and its size, for example `halftone-3000x2000.png`. The quick tools save PNG only; use Effects if you need JPG or WebP.' },

      { t: 'h', text: 'Send to Layer Stack' },
      { t: 'p', text: 'This opens the Editor with your photo as one layer and the effect as a live filter layer above it, carrying your slider settings. You can keep tuning the effect there, mask it, lower its opacity or add type and shapes around it. See [filters in the Editor](/learn/filters-in-the-editor).' },

      { t: 'h', text: 'Quick tools compared with Effects' },
      { t: 'table', head: ['', 'Quick tools', 'Effects'], rows: [
        ['Effects available', 'One per tool', 'All 58'],
        ['Starts with', 'A sample image', 'An empty drop zone'],
        ['Opacity slider', 'No', 'Yes'],
        ['Compare and zoom', 'No', 'Yes'],
        ['Download formats', 'PNG', 'PNG, JPG, WebP'],
        ['Send to Editor', 'Send to Layer Stack', 'Open in Editor (Shift-click for flattened)'],
      ] },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'Nothing is uploaded. The tools run in your browser and there is no account or watermark.',
        'The halftone result is black and white. Recolour it in the Editor with a colour fill and a blend mode.',
        'Dither works pixel by pixel, so the full-size download of a large photo has a finer pattern than the preview.',
        'Each tool page links to the other two under **More tools**, and to the full Effects page.',
      ] },
    ],
  },
]
