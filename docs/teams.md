# Teams

Step 4 of the desktop-and-sync plan. Code: `src/lib/teams.ts` (workspaces, members, invites, keys),
`src/lib/team-sync.ts` (shared brands and jobs), `src/components/account/TeamsBox.tsx`, `ShareControl.tsx`,
`/join`. Encryption in `src/lib/vault.ts`. Supabase migrations `teams`, `teams_key_policy`, `teams_accept_invite_fix`.

## What the server knows

| Stored readable | Stored sealed |
|---|---|
| Who is in which workspace, their role and email, member public keys, when items changed and who changed them, file sizes | Workspace names, workspace keys (per member), shared brands and jobs, every file inside them |

## Keys

- Each workspace has a key (32 random bytes), with a version number. A member holds every version, each in its
  own row of `vc_member_keys`, sealed to their identity key with a sealed box (one-time ECDH P-256, HKDF,
  AES-256-GCM, additional data `wskey:<workspace>:<version>`).
- Items are sealed with the latest version (`item:<workspace>:<kind>:<id>`); the row records which version.
- Files are sealed separately (`file:<workspace>`) and named by HMAC-SHA256 of their content under the workspace
  key, so identical files are stored once and the server cannot tell which file is which.

## Roles

| Role | Can |
|---|---|
| Owner | Everything: rename, invite, change roles, remove people, delete the team |
| Editor | Read and change shared brands and jobs, add files |
| Reviewer | Read shared work (free, no seat) |

Enforced by row level security through `vc_role(workspace)`, and by a trigger on `vc_members` (only owners change
roles; a member may only change their own public key; emails are fixed).

## Inviting

1. The owner enters an email and role. The device makes an invite id and a 16-byte secret, seals the team name and
   every key version with a key derived from the secret, and stores that in `vc_invites`.
2. The link is `https://voidcanvas.netlify.app/join#<id>.<secret>`. The fragment never reaches a server. The owner
   sends it themselves (Voidcanvas does not email invites).
3. The invitee opens it, signs in with the invited email, and `vc_accept_invite` adds them as a member after checking
   the email matches, the invite is unused and under 7 days old. Their device opens the keys with the secret and
   stores them sealed to its own identity key.

## Removing someone

The owner removes the member (their key rows go with them), then the device makes a new key version, seals it to
every remaining member's public key, and updates the workspace. From then on new and changed items use the new
key. The removed member keeps whatever their devices already downloaded; the server no longer serves them anything.

## Sync

Brands and jobs gain `workspaceId`, `syncedAt` and `pushedAt`. The share control in Studio (brand editor and job
header) moves an item between "Only me" and a team. Changes are sent 1.5 seconds after an edit; teams are checked
every 20 seconds and when Studio comes back into view. Latest change wins. If an item changed here and in the team
at the same time, the team's version is kept beside yours as "(their version)", on this device only. Deleting a
shared item, or taking it out of a team, leaves a sealed empty marker so other devices remove it too.

## Account changes that touch teams

- Replacing account keys ("Lost a device?") makes a new identity key; the device re-seals every team key for it and
  updates the member public key.
- Deleting an account is refused while the person is the only owner of a team with other members. Teams where they
  are the only member are deleted with the account.

## Tests

`e2e/teams.mjs`, against the real project with password test users made from `supabase/e2e-users.sql`:
team creation, sealed name, invite link format, invite refused for another email, join from link, invite used once,
brand with logo shared and received byte for byte, edit synced back, sole owner cannot delete account, removal
replaces the key and locks the member out; then key replacement, email change (codes planted by SQL, phase 2) and
account deletion.

## Not yet

- Seat billing: step 4c. Studio Share (review and delivery links) is in `docs/studio-share.md`.
- Checking a member's public key out of band (safety numbers). Today the owner trusts the key the server returns.
- Re-sealing old items with a new key after someone is removed (they stay under the old version until edited).
