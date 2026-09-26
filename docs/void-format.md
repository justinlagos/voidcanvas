# The .void file format

Version 3. Written by `src/editor/voidfile.ts`. Keep this document and that module in step.

A `.void` file holds one complete, editable Voidcanvas design. It is the unit used everywhere: saving to disk, backups, the desktop app, and later sync and share links. The format is open so people own their work: anyone can read a `.void` file without Voidcanvas.

## Container

A standard ZIP archive. Voidcanvas writes entries uncompressed (the images inside are already compressed) and reads both stored and deflate entries, so a file re-zipped by another tool still opens.

| Entry | Required | Contents |
|---|---|---|
| `mimetype` | yes, first, stored | The ASCII text `application/vnd.voidcanvas+zip` |
| `manifest.json` | yes | Everything except pixels and font files. See below |
| `preview.png` | no | A picture of the design, up to 512 px on the long side (1600 px inside a `.void.png`) |
| `blobs/<sha256>.<ext>` | as listed | One file per bitmap or font. The name is the lowercase hex SHA-256 of the file's bytes |

Blobs are named by content hash, so identical pixels are stored once, and a future sync only needs to move blobs whose hash it has not seen.

Extensions: `png`, `jpg`, `webp`, `ttf`, `otf`, `woff`, `woff2`, or `bin` for anything else. Readers should find a blob by hash if the extension differs.

## manifest.json

```json
{
  "format": "voidcanvas",
  "version": 3,
  "minReader": 3,
  "app": "voidcanvas-web",
  "savedAt": "2026-09-26T13:00:00.000Z",
  "doc": { "id": "…", "name": "Poster", "width": 1080, "height": 1350, "background": "#ffffff", "frames": [], "channelMeta": [] },
  "layers": [ { "id": "L1", "type": "raster", "hasMask": true, "…": "…" } ],
  "groups": [],
  "swatches": ["#111111"],
  "assets": { "L1": { "hash": "…", "type": "image/png", "size": 1234 }, "L1:mask": { "…": "…" }, "ch:c1": { "…": "…" } },
  "fonts": { "My Font": { "hash": "…", "type": "font/ttf", "size": 5678 } },
  "preview": "preview.png"
}
```

- `doc`: the document as stored by the Editor (`packDoc` in `io.ts`). Saved selections are listed in `channelMeta`; their pixels are the assets `ch:<id>`.
- `layers`: layer metadata in the Editor's layer order. Pixel data is not inline. A raster layer's bitmap is the asset keyed by its id. A layer with `hasMask: true` has its mask in the asset `<id>:mask`.
- `assets`: pixels, keyed as above.
- `fonts`: font files added from the person's device, keyed by family name. Google Fonts are not embedded; they load by name.

## Versions and compatibility

- `version` is the version the writer used. `minReader` is the oldest reader that can open the file correctly.
- A reader opens any file with `minReader` at or below its own version. If `version` is newer than the reader, it opens what it understands and tells the person that some things were left out.
- A reader refuses a file with `minReader` above its own version, and asks the person to update.
- Readers ignore fields they do not know. Layers with a `type` the reader cannot draw are left out, with a note. Writers must never reuse a field name with a different meaning.
- Raise `minReader` only for a change older readers would get wrong rather than simply miss (for example, a change in how existing layers are positioned).

History:

| Version | Container | Notes |
|---|---|---|
| 1, 2 | One JSON object | Bitmaps base64 inline under `blobs`. Fonts were not saved. Still readable |
| 3 | ZIP | Content-addressed blobs, fonts included, preview, `minReader` |

## .void.png

A normal PNG of the design with the project inside, so it previews in any file browser.

- Version 3: the complete `.void` ZIP in a private ancillary chunk of type `voId` (ancillary, private, safe to copy), placed just before `IEND`.
- Versions 1 and 2: the JSON bundle in a `tEXt` chunk with keyword `voidcanvas`. Still readable.

Editing the PNG in another app will usually drop the chunk and with it the project.

## Where it is used

- File, Save to disk… and Ctrl+S on a linked file (`src/editor/disk.ts`)
- File, Download project file (.void), and Download .void on the start screen
- Export dialog, Save editable file (.void.png)
- Later: the desktop app's library folder, sync and share links (see `plans/desktop-and-sync.md` in the project)
