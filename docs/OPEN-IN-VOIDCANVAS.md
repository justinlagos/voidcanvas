# Open in Voidcanvas

Status: v1

`https://voidcanvas.app/open` is the stable entrypoint for sites, educators, creators and partner resources that want to send someone into Voidcanvas.

The gateway is intentionally narrow. It does not accept an arbitrary redirect URL and v1 does not fetch a remote asset. It maps a small set of query values onto known Voidcanvas routes and adds canonical acquisition tags.

## Basic links

Open the Editor:

```text
https://voidcanvas.app/open?to=editor&source=resource&campaign=partner-name
```

Open Effects:

```text
https://voidcanvas.app/open?to=effects&source=creator&campaign=effect-tutorial
```

Open a quick tool:

```text
https://voidcanvas.app/open?to=tools&tool=halftone&source=education&campaign=print-class
```

## Parameters

| Parameter | Purpose | Behaviour |
|---|---|---|
| `to` | Voidcanvas destination | `editor`, `effects`, `studio`, `brand`, or `tools`; anything else becomes `editor` |
| `tool` | Quick-tool slug | Used only when `to=tools`; unknown slugs become the `/tools` hub |
| `source` | Attribution source | Must be one of the Growth OS source IDs; unknown values become `resource` |
| `medium` | Distribution medium | Optional; defaults to `referral` |
| `campaign` | Stable campaign id | Optional; defaults to `open-in-voidcanvas` |
| `content` | Specific placement/creative id | Optional |

IDs are lower-case and restricted to letters, numbers, dot, dash and underscore, up to 40 characters.

## Security properties

- No arbitrary external redirect.
- No URL supplied by a partner is fetched by the gateway.
- No script or payload is accepted.
- Unknown destinations fall back to the Editor.
- Unknown quick-tool slugs fall back to the tools hub.
- Unknown attribution sources become `resource`.
- The route is a 307 redirect to a Voidcanvas-owned path.

A future remote-resource import must be designed as a separate capability with explicit file-type, size, origin, CORS and content-safety rules. Do not overload this v1 gateway with remote fetching.

## Attribution

The redirect produces the same canonical UTM fields used by Voidcanvas first-party analytics. Product loops that remain inside one browser session may additionally emit `growth.touch`, so the Growth OS can credit the assisted source without requiring a new session.

The Growth OS optimises these links for activated designers, not clicks.

## Embedding

Partners can start with a normal link or button:

```html
<a href="https://voidcanvas.app/open?to=editor&source=resource&campaign=your-site">
  Open in Voidcanvas
</a>
```

Do not promise that the external file itself will open in Voidcanvas unless a later import contract explicitly supports that resource type and origin.
