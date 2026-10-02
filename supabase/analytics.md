# Analytics and feedback backend

Supabase project: `voidcanvas` (ref `fpmyuqjiwckcjaufwwit`, London region).

## Tables (schema `public`)

- `events`: one row per anonymous event. Columns: `ts, device_id, session_id, name, props (jsonb, under 2 KB), area, path, device, browser, os, tz, lang, screen, installed, ver, app, internal`.
  - `ver` is the app version (`desktop/package.json`), `app` is `web` or `desktop`, `internal` is true on devices marked as the team's own in /admin. All three came with Phase A (2 Oct 2026); rows before that have no `ver`.
  - A batch insert fails whole if one row breaks a rule (props over 2 KB, a name outside `^[a-z0-9_.:-]{1,64}$`), so the app keeps summaries small.
- `feedback`: `ts, device_id, session_id, mood (1 Not good, 2 It's okay, 3 Love it), message, email, area, path, context, status (new, read, done)`.

Row level security is on. The browser key can only INSERT the listed columns. Nothing can be read through the public API.

## Admin functions

- `vc_admin_dashboard(p_password, p_days)` returns every number the /admin **Everything** view shows, as one JSON object. It reads every row, tests and crawlers included.
- `vc_admin_week(p_password, p_days)` returns the /admin **This week** view: designers only (rows with `ver`, not `internal`), compared with the period before: the funnel, active minutes in visits that ended in an export or a save, friction, searches that found nothing, slow moments, panel controls, changes by kind, versions, regions and errors. SQL in `supabase/migrations/20261002_phase_a_analytics.sql`.
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
| `doc.open` | saved design reopened | `from` (home, landing, link, studio, effects, tab, reload, crash, another-tab, template), `copy` |
| `doc.resume` | designs reopened after a reload, or after a crash from the start screen | `how, tabs` |
| `save.failed`, `storage.full` | a save could not be written / because browser storage is full | `n` |
| `export` / `export.failed` | any download or copy | `format, kb, scale, effect, boards, what` (boards or selection), `via` (home, phone, share) |
| `activation` | the first export of a design | `format, first_on_device, edited` |
| `workflow` | a whole workflow done, once per design per browsing session: `create-edit-export`, `open-change-save`, `master-formats-export`, `template-new-design` | `kind` |
| `version.make`, `version.restore` | a version saved by hand / restored | `named, from` / `copy` |
| `template.save`, `template.use` | saved as a template / a design started from one | `boards` / `from` |
| `variation.make` | Duplicate as variation | `boards` |
| `after_export` | a choice on the card after an export | `use` (other-boards, size, template, variation) |
| `effect.load` / `effect.apply` | image loaded / effect picked in Effects or single tools | `id, tool` |
| `handoff` | work sent to the Editor | `from, images, live` |
| `ai.run`, `ai.download`, `ai.declined` | on-device model use | `tool, ok, ms, gpu, model, mb` |
| `studio.mode` | Studio switched between boards and brand | `mode` |
| `error` | uncaught error (max 10 per tab, URLs stripped); sent even before any input | `msg, src, pre` (true when the page had no input yet) |
| `session.summary` | every 5 minutes and on leaving, when something happened; each row covers the time since the last | `eng` (active seconds), `n` (changes), `steps` (changes by kind), `undo`, `quick` (undos within 3 s), `ctl` (panel control label to count, top 12), `exp`, `saves`, `save_ms` (slowest), `long`, `long_ms` (page froze over 0.2 s), `layers`, `boards` (in buckets), `phone` |
| `undo.quick` | an undo within 3 seconds of the change it undoes | `kind` (text, move, colour, effect, paint, select, layer, board, other); never the step name |
| `panel.abandon` | a watched dialog closed with no change and no export | `id` (`export`, `resize-formats`, `image-size`, `canvas-size`, `ai-expand`, `fill`, `add`, `filters`, `layer-style`, `fx-scope`) |
| `search.none` | Editor command search with no result, after a 1.5 s pause or on close; once per wording per page | `q` (lower case, 32 characters, dropped if it holds an @, a run of 3 digits or a web address), `where` |
| `rage` | four clicks within 1.5 s on one spot (not in text fields); at most one per 5 s | `on` (`canvas`, `button`, `a`...; never a label) |
| `perf` | how long something took | `what` (`editor.ready`, `doc.open`), `ms` |
| `feedback.open` / `feedback.sent` | feedback box | `trigger, mood, has_text` |
| `pwa.install` | app installed | none |
| `bug.open` / `bug.sent` | in-app bug report box opened / report sent (the report itself goes to `feedback` with `context.kind = 'bug'`) | `trigger` / `where, severity` |
| `help.open` | a link in the Help menu of Studio, Effects or the quick tools | `to` |
| `learn.search`, `learn.search.pick` | search on /learn (first 40 characters of the query) | `q, n` / `slug` |
| `learn.helpful` | "Was this guide useful?" | `slug, yes` |
| `landing.nav` | Blog link in the landing header | `to` |
| `account.signin`, `account.setup`, `account.pair`, `account.rotate`, `account.delete` | signed in / recovery key made / device approved / keys replaced / account deleted | none |
| `team.create`, `team.invite`, `team.join`, `team.remove` | team made / invite link made / invite accepted / member removed | `role` on invite and join |
| `share.review`, `share.delivery` | review link made / delivery link made (Studio Share) | `files` |

## What is never counted

- Automated browsers (`navigator.webdriver`): Playwright, Puppeteer and Selenium send nothing, so production checks need no switch.
- A page nobody touches: events wait in memory until the first trusted pointer, touch, wheel or key input; a page that is only loaded (crawlers, or opened and left) sends nothing apart from errors.
- Devices marked as the team's own in /admin still send, marked `internal`, and are left out of This week.

## Local testing

Tracking is off on localhost. Run `localStorage.setItem('vc-usage-dev', '1')` in the console to turn it on for your browser. `e2e/analytics.mjs` also sets `vc-usage-test` so its automated browser counts, and catches every request so nothing reaches Supabase.
Anyone can turn it off in Your privacy. It is also off in a private session and when Do Not Track or Global Privacy Control is set.

## Accounts

Tables `vc_keys`, `vc_devices`, `vc_pairings`, `vc_settings` hold encrypted keys and settings for optional accounts. See `docs/accounts-and-keys.md`.

## Teams

Tables `vc_workspaces`, `vc_members`, `vc_member_keys`, `vc_invites`, `vc_items` and the private Storage bucket `vc-team` (sealed files). Functions `vc_role`, `vc_create_workspace`, `vc_accept_invite`, `vc_delete_account`. See `docs/teams.md`. Test users: `supabase/e2e-users.sql`.
