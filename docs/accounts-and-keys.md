# Accounts and keys

Step 3 of the desktop-and-sync plan. Code: `src/lib/vault.ts` (crypto), `src/lib/account.ts` (session, API, state),
`src/lib/settings-sync.ts`, `src/components/account/`. Tables: see "Database" below.

An account is optional. Everything it stores is encrypted on the person's device first. The server holds
ciphertext, public keys and device names, nothing it can read.

## Keys

| Key | What it is | Where it lives |
|---|---|---|
| Account key | 32 random bytes. Encrypts the person's own data: settings now, workspace keys and files later | Each unlocked device (IndexedDB store `account`). Never sent anywhere in the clear |
| Identity key | ECDH P-256 key pair. For sharing keys with this person later (Team) | Public half in `vc_keys.public_key`. Private half sealed with the account key in `vc_keys.wrapped_identity` |
| Recovery key | 32 random bytes, shown once as 52 base32 characters in 13 groups | Only with the person. A copy of the account key sealed with a key derived from it sits in `vc_keys.recovery_wrapped_key` |

Sealing is AES-256-GCM through Web Crypto: `v1.<iv>.<ciphertext>`, base64url, with additional data naming the
purpose and user (`identity:<uid>`, `recovery:<uid>`, `settings:<uid>`, `pair:<id>`), so one sealed value cannot
stand in for another. The recovery wrapping key is HKDF-SHA256(recovery key, salt `voidcanvas-recovery-v1`, info user id).

If someone loses every device and the recovery key, what the account stores cannot be recovered. Designs on
their devices are unaffected. The app says this before the key is made, and asks for the last group back to
confirm it was saved.

## Signing in

Email code (one-time password) through Supabase Auth, over plain fetch. Codes work in the browser, the desktop
app and on phones; links would not reach the desktop app. The session is kept in localStorage (`vc-account`).

## States

`off` (private session) → `signed-out` → `needs-setup` (first sign-in: make the recovery key) → `ready`.
A device signing in to an account that already has keys is `locked` until it gets the account key by pairing
or with the recovery key. Signing out deletes the account key from the device and removes it from the list.

## Pairing a new device

1. New device makes a one-time ECDH key pair, a 10-character id and a 10-byte secret. It stores
   `{id, new_pub, new_mac = HMAC(secret, "new|id|pub")}` in `vc_pairings` and shows the code (id + secret,
   26 characters) and a QR code for `https://voidcanvas.netlify.app/pair#<code>`. The fragment never reaches a server.
2. Existing device, signed in and unlocked, takes the code (typed, or by scanning), reads the row, checks the
   MAC (the server cannot swap the key without the secret), shows which device asked and when, and on approval
   writes `{old_pub, payload = account key sealed with HKDF(ECDH), payload_mac}`.
3. New device polls every 2 seconds, checks `payload_mac`, opens the payload, deletes the row.

Rows expire after ten minutes (enforced by RLS and a trigger that also fixes timestamps and the new device's
key once written). Expired rows are deleted when new ones are made.

## Settings sync

Keys synced: `vc-ui-v1` (interface preferences and workspaces), `vc-recent-colours`, `vc-landing-theme`,
`vc-usage-off`. One sealed JSON per person in `vc_settings`. Checked on start, every 5 minutes, when the tab
comes back, and sent when local settings change (checked every 30 seconds and when the tab is hidden).
A device signing in for the first time takes the account's settings. After that the latest change wins.

## Database (Supabase project `fpmyuqjiwckcjaufwwit`, migration `accounts_and_keys`)

Full SQL: `select statements from supabase_migrations.schema_migrations where name = 'accounts_and_keys';`

- `vc_keys (user_id, public_key, wrapped_identity, recovery_wrapped_key, key_version, created_at, updated_at)`
- `vc_devices (id, user_id, name, platform, created_at, last_seen)`
- `vc_pairings (id, user_id, new_pub, new_mac, new_device, old_pub, payload, payload_mac, created_at, expires_at)`
- `vc_settings (user_id, ciphertext, device_id, updated_at)`

Row level security on all four: a signed-in person reads and writes only their own rows; nothing is readable
without signing in. Deleting the auth user deletes everything.

## Setup still needed in the Supabase dashboard

Supabase does not allow template changes on the free plan until a custom SMTP sender is set, and the email rate
limit cannot be raised without one either. So, in this order:

1. **SMTP**: Authentication, Emails, SMTP Settings. Resend is chosen (account ready). Needs a Voidcanvas sending domain
   verified in Resend (DKIM TXT plus two CNAMEs), a sending-only API key, host `smtp.resend.com`, port 465, user
   `resend`, the API key as password, sender name `Voidcanvas`. Supabase's built-in email only sends to the project's
   own team, two an hour.
2. **Email templates**: Magic link and Confirm signup: subject `Your Voidcanvas sign-in code`, body with
   `{{ .Token }}` (for example `<p>Your Voidcanvas sign-in code is <strong>{{ .Token }}</strong></p>`). Change email
   address: subject `Your Voidcanvas email change code`, body with `{{ .Token }}`. Without `{{ .Token }}` people get a
   link the app cannot use.
3. **Rate limits**: Authentication, Rate Limits. Raise emails per hour (currently 2).

## Tests

- `src/lib/__tests__/vault.test.ts`: sealing, recovery, replacing the recovery key, pairing, a server swapping keys, tampered replies, sealed boxes, file sealing.
- `e2e/teams.mjs` also covers replacing keys, email change and deletion (see `docs/teams.md`).
- `e2e/accounts.mjs`: three browser contexts against the real project with a password test user (sign-in by
  code cannot be automated). Setup, wrong confirmation, anonymous read refused, ciphertext only on the server,
  pairing with QR, settings arriving on the paired device, wrong and right recovery keys, device list,
  new recovery key replacing the old, sign-out clearing the key.

## Changing the email address

`PUT /auth/v1/user` sends a code to the new address, and one to the current address when Supabase's "Secure email
change" is on. The app asks for both and verifies each (`type: email_change`), then reloads the user. Needs
`{{ .Token }}` in the Change email address template too.

## Lost a device

"Replace my keys" makes a new account key, identity key and recovery key (shown once, confirmed by its last group),
replaces `vc_keys` only if it still holds the version the device started from, re-seals team keys for the new
identity, signs out every other session (`logout?scope=others`), clears the device list and re-sends settings.
The lost device's copy of the old key opens nothing the server still serves.

## Deleting the account

`vc_delete_account()` deletes the auth user and, through foreign keys, everything that belongs to them. It needs a
sign-in from the last 10 minutes (the token's `amr` timestamps), so the app offers an emailed code first when the
session is older. It refuses while the person is the only owner of a team with other members. Designs on devices
are not touched.

## Not yet

- Signing in with a passkey or Google.
