# Studio Share

Step 4b of the desktop-and-sync plan. Review and delivery links for clients. Code: `src/lib/share.ts` (links, sealing,
server calls), `src/studio/share-merge.ts` (client events into a version), `src/studio/job/LinkBox.tsx`, the Review and
Deliver tabs, and the client page `src/components/share/SharePage.tsx` at `/s`. Key derivation in `src/lib/vault.ts`
(`shareKeys`). Supabase migration `studio_share`.

The client needs no account and installs nothing. The designer needs an account that is ready on the device.

## Link

`https://voidcanvas.netlify.app/s#<id>.<secret>`: `id` is 16 random bytes and `secret` another 16, both base64url.
The fragment never reaches a server (analytics records the path only).

From the secret, with HKDF-SHA256 and the id as info:

| Derived | Salt | Used for |
|---|---|---|
| Content key | `voidcanvas-share-v1` | AES-256-GCM over the manifest (`share:<id>:manifest`), each file (`share:<id>:file`) and each event (`share:<id>:event`) |
| Token | `voidcanvas-share-token-v1` | Sent with every call. The server stores `sha256(token)` and compares |

The server cannot derive the key from the token, and the token alone opens nothing.

## What the server knows

| Stored readable | Stored sealed |
|---|---|
| Who made the link, its kind (review or delivery), when it was made and expires, total size, number and time of comments, whether a comment came from the team | Client and job names, version label and notes, every image and file, every comment, reply, name and decision |

## Database

- `vc_shares (id, owner_id, workspace_id, kind, token_hash, manifest, ready, bytes, created_at, expires_at)`. Owners
  manage their own rows (RLS). Expiry at most 92 days ahead; the app uses 30. `bytes` at most 500 MB.
- `vc_share_events (id, share_id, body, by_team, at)`. Owners can read; nobody inserts directly.
- `vc_share_open(id, token, after)` (anon and signed in): checks the token hash and expiry, returns the sealed
  manifest on the first call and events after `after` (500 at a time).
- `vc_share_post(id, token, body)`: review links only; body under 16,000 characters; at most 3,000 events per link and
  60 a minute. `by_team` is set by the server when the caller is the owner or an owner or editor of the link's team,
  so a client cannot post as the designer.
- Storage bucket `vc-share`, public, 50 MB per file. Files are fetched by exact name (`<id>/<16 random bytes>`), listed
  only inside the sealed manifest. There is no read policy for anyone but the owner, so nobody can list the bucket.
  Owners upload, list and delete in folders of their own links.

## Flow

1. Designer: the device makes the id, secret, key and token, seals the manifest (with random file names), inserts
   the row with `ready = false`, uploads each sealed file, then sets `ready = true` and `bytes`. On a failure it deletes
   what it made.
2. Client: `/s` opens the share, decrypts the manifest and files in the browser, and checks for new events every 15
   seconds and when the tab comes back.
3. Designer: while the Review tab is open, every link that has not expired is checked every 20 seconds.
   `applyShareEvents` adds client pins (with name, `shared: true`), replies, resolved marks and the latest decision.
   Applying the same events twice changes nothing. Approval sets the version to Approved; a request for changes sets
   Changes asked and adds the note to the to-do list.
4. Designer replies and **Done** on a client pin are posted back. The designer's own pins stay on the device.

Event bodies: `pin {id, img, x, y, text, by}`, `reply {id, pin, text, by}`, `done {pin, done, by}`,
`decision {id, value, note, by}`.

## Stopping and expiry

**Stop this link** deletes the files and the row (events go with it). Expired links: Studio deletes its owner's expired
links when it starts with the account ready. Deleting the account deletes every link's files first.

The job keeps the link (`Version.share`, `deliveries[].link`), so a team member with the job can see the client's
comments too; team owners and editors post as the team.

## Tests

- `src/lib/__tests__/vault.test.ts`: key and token derivation, link parsing.
- `src/studio/__tests__/share-merge.test.ts`: merging is idempotent, decisions, to-dos.
- `e2e/share.mjs` (21 checks, real project, test user `VC_SOLO` from `supabase/e2e-users.sql`, deleted after): sealed
  manifest and files, no anonymous listing, wrong token and wrong secret refused, client on a phone comments and asks
  for changes, comments sealed, designer receives both and replies (marked as team by the server), client approves,
  delivery file downloads byte for byte, stopped link closes and its row is gone.

## Not yet

- Email or WhatsApp notifications when a client comments (needs the email sender).
- A password on a link, or a shorter expiry chosen per link.
- Showing the designer or studio name to the client (links say "Designer").
- Charging: links will be part of Team and Pro (step 4c).
