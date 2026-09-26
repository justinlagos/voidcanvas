# Working on Voidcanvas

Owner: Justin Ukaegbu (MotionPlay Labs Ltd). Live: https://voidcanvas.netlify.app. Repo: github.com/justinlagos/voidcanvas, default branch `master`.

## Ship every change: local, git, Netlify, desktop

Nothing is finished until it is on `master`, deployed, and checked. Never leave work uncommitted, on a side branch,
or as a bundle or patch file in the repo.

1. Before committing: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`. All must pass.
2. Run the e2e checks that cover what changed (against `npx next start -p 3123`, `BASE=http://localhost:3123`).
   `e2e/run.mjs` runs the web suite; it should pass in full.
3. Commit with a message that says what changed and why. Then `git fetch origin master`, rebase if needed,
   rerun the checks if the rebase brought in code, and `git push origin master`.
4. Confirm the push: `git ls-remote origin master` equals `git rev-parse HEAD`, `git status` is clean.
5. Confirm Netlify deployed that commit (Netlify project `voidcanvas`, site id `31789165-bd12-4e37-b0ed-25512bb96421`):
   the latest deploy's `commit_ref` is the pushed commit and its state is `ready`.
6. Confirm GitHub Actions for that commit are green (`CI`, and `Desktop app` when it ran).
7. At the end of a piece of user-facing work, raise the patch version in `desktop/package.json` and push, so the
   desktop app gets the same update. The `Desktop app` workflow builds Windows, macOS and Linux, runs
   `e2e/desktop.mjs`, and publishes release `v<version>`. Check the release has all 17 files.
8. Update the plan in the Claude project (`plans/*.md`) and the matching doc in `docs/` when behaviour changes,
   and the Learn pages in `src/content/learn/` when anything a person sees changes.

Tag pushes are refused from Claude sessions; releases follow the version in `desktop/package.json`.

## Layout

- `src/editor/` Editor. `io.ts` local database and files; `voidfile.ts` the .void format; `disk.ts` files on disk.
- `src/lib/` shared: `analytics.ts`, `vault.ts` (all encryption), `account.ts` (optional accounts), `settings-sync.ts`, `teams.ts`, `share.ts` (review and delivery links).
- `src/components/account/` account and team UI. `src/app/` routes. `src/content/learn/` Learn articles.
- `desktop/` Electron app (serves a static export of the web app offline). `npm run build:desktop`, then `xvfb-run -a npm run e2e:desktop`.
- `docs/` format, accounts and plans. `supabase/analytics.md` backend tables.

## Rules that are easy to break

- No em dashes in any copy. Plain English, no marketing phrasing.
- Encryption happens only in `src/lib/vault.ts`, with Web Crypto. The server never receives anything readable
  from accounts or teams: keys, settings and shared data are sealed on the device.
- The browser-side Supabase key is public; every table relies on row level security. After a schema change, run
  the Supabase security advisor.
- Test users for `e2e/accounts.mjs`, `e2e/teams.mjs` and `e2e/share.mjs` are made with SQL and deleted after the run.
- Do not add npm dependencies to the web app without a reason; features load lazily where they can.
