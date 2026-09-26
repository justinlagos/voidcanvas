-- Test users for e2e/accounts.mjs, e2e/teams.mjs and e2e/share.mjs. Run before a test, and the delete line again after it.
-- Set the password first in the same session: select set_config('vc.e2e_password', '<password>', false);
delete from auth.users where email like 'e2e-%@voidcanvas.test';
delete from public.vc_workspaces w where not exists (select 1 from public.vc_members m where m.workspace_id = w.id);
with emails(e) as (values ('e2e-accounts@voidcanvas.test'), ('e2e-owner@voidcanvas.test'), ('e2e-member@voidcanvas.test'), ('e2e-solo@voidcanvas.test')),
u as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', e, extensions.crypt(current_setting('vc.e2e_password'), extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '' from emails
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now() from u;
