# Analytics and feedback backend

Supabase project: `voidcanvas` (ref `fpmyuqjiwckcjaufwwit`, London region).

## Tables (schema `public`)

- `events`: one row per anonymous event. Columns: `ts, device_id, session_id, name, props (jsonb, under 2 KB), area, path, device, browser, os, tz, lang, screen, installed`.
- `feedback`: `ts, device_id, session_id, mood (1 Not good, 2 It's okay, 3 Love it), message, email, area, path, context, status (new, read, done)`.

Row level security is on. The browser key can only INSERT the listed columns. Nothing can be read through the public API.

## Admin functions

- `vc_admin_dashboard(p_password, p_days)` returns every number the /admin page shows, as one JSON object.
- `vc_admin_feedback_status(p_password, p_id, p_status)` marks feedback read or done.
- `vc_admin_set_password(p_password, p_new)` changes the dashboard password (also in the dashboard footer).

The password is stored as a bcrypt hash in `vc_admin.config` (a schema the API cannot reach). After 8 wrong tries in 15 minutes every call returns `locked` until the window passes.

To see a function's current SQL: `select pg_get_functiondef('public.vc_admin_dashboard(text,int)'::regprocedure);`

## Event names sent by the app

| Event | Sent when | Props |
|---|---|---|
| `session.start` | first event in a tab after 30 min idle | `first, ref, utm` |
| `page.view` | route change | none |
| `action` | any menu, palette or shortcut command; tool picks as `tool.<id>` | `id, via` |
| `doc.new` | blank design from a size preset | `preset, w, h` |
| `doc.import` | files opened or work sent between tools | `kind, count` |
| `doc.open` | saved design reopened | `copy` |
| `export` / `export.failed` | any download or copy | `format, kb, scale, effect` |
| `effect.load` / `effect.apply` | image loaded / effect picked in Effects or single tools | `id, tool` |
| `handoff` | work sent to the Editor | `from, images, live` |
| `ai.run`, `ai.download`, `ai.declined` | on-device model use | `tool, ok, ms, gpu, model, mb` |
| `studio.mode` | Studio switched between boards and brand | `mode` |
| `error` | uncaught error (max 10 per tab, URLs stripped) | `msg, src` |
| `feedback.open` / `feedback.sent` | feedback box | `trigger, mood, has_text` |
| `pwa.install` | app installed | none |
| `bug.open` / `bug.sent` | in-app bug report box opened / report sent (the report itself goes to `feedback` with `context.kind = 'bug'`) | `trigger` / `where, severity` |
| `help.open` | a link in the Help menu of Studio, Effects or the quick tools | `to` |
| `learn.search`, `learn.search.pick` | search on /learn (first 40 characters of the query) | `q, n` / `slug` |
| `learn.helpful` | "Was this guide useful?" | `slug, yes` |
| `landing.nav` | Blog link in the landing header | `to` |
| `account.signin`, `account.setup`, `account.pair` | signed in with a code / recovery key made / a device approved | none |

## Local testing

Tracking is off on localhost. Run `localStorage.setItem('vc-usage-dev', '1')` in the console to turn it on for your browser.
Anyone can turn it off in Your privacy. It is also off in a private session and when Do Not Track or Global Privacy Control is set.

## Accounts

Tables `vc_keys`, `vc_devices`, `vc_pairings`, `vc_settings` hold encrypted keys and settings for optional accounts. See `docs/accounts-and-keys.md`.
