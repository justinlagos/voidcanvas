-- Growth OS, 5 Oct 2026: acquisition quality, not vanity traffic.
-- This migration is additive. It reads the existing privacy-safe events table and
-- exposes source/landing conversion to the password-protected admin surface.
-- A `growth.touch` event may override the original session source when a person
-- discovers VoidCanvas through an owned product loop without starting a new tab/session.

create or replace function public.vc_admin_growth(p_password text, p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  err text;
  d int := greatest(1, least(coalesce(p_days, 30), 180));
  since timestamptz := now() - make_interval(days => d);
  result jsonb;
begin
  err := vc_admin.password_ok(p_password);
  if err is not null then return jsonb_build_object('error', err); end if;

  with
  real as (
    select e.*
    from public.events e
    where e.ts >= since
      and e.ver is not null
      and not e.internal
  ),
  session_rollup as (
    select
      session_id,
      min(ts) first_ts,
      max(device_id) device_id,
      bool_or(name in ('doc.new', 'doc.import', 'doc.open')) started,
      coalesce(sum((props->>'n')::int) filter (where name = 'session.summary' and coalesce(props->>'n', '') ~ '^[0-9]+$'), 0) steps,
      bool_or(name = 'export') exported,
      bool_or(name = 'session.summary' and coalesce((props->>'saves')::int, 0) > 0) saved
    from real
    group by session_id
  ),
  starts as (
    select distinct on (session_id)
      session_id,
      path landing,
      nullif(props->>'utm', '') source,
      nullif(props->>'med', '') medium,
      nullif(props->>'camp', '') campaign,
      nullif(props->>'post', '') content,
      nullif(props->>'ref', '') referrer
    from real
    where name = 'session.start'
    order by session_id, ts asc
  ),
  touches as (
    select distinct on (session_id)
      session_id,
      nullif(props->>'source', '') source,
      nullif(props->>'medium', '') medium,
      nullif(props->>'campaign', '') campaign,
      nullif(props->>'content', '') content,
      nullif(props->>'to', '') landing
    from real
    where name = 'growth.touch'
      and coalesce(props->>'source', '') ~ '^[a-z0-9][a-z0-9._-]{0,39}$'
    order by session_id, ts desc
  ),
  sessions as (
    select
      r.*,
      coalesce(t.source, s.source, s.referrer, 'direct') source,
      coalesce(t.medium, s.medium, '') medium,
      coalesce(t.campaign, s.campaign, '') campaign,
      coalesce(t.content, s.content, '') content,
      coalesce(t.landing, s.landing, '/') landing,
      (r.started and r.steps >= 3 and (r.exported or r.saved)) activated
    from session_rollup r
    left join starts s using (session_id)
    left join touches t using (session_id)
  ),
  source_rollup as (
    select
      source,
      count(*) sessions,
      count(distinct device_id) designers,
      count(*) filter (where started) started,
      count(*) filter (where steps >= 3) worked,
      count(*) filter (where activated) activated,
      count(*) filter (where exported) exported
    from sessions
    group by source
  ),
  landing_rollup as (
    select
      landing,
      count(*) sessions,
      count(distinct device_id) designers,
      count(*) filter (where started) started,
      count(*) filter (where activated) activated,
      count(*) filter (where exported) exported
    from sessions
    group by landing
  ),
  campaign_rollup as (
    select
      source, medium, campaign, content,
      count(*) sessions,
      count(*) filter (where activated) activated
    from sessions
    where campaign <> '' or content <> ''
    group by source, medium, campaign, content
  )
  select jsonb_build_object(
    'days', d,
    'generated_at', now(),
    'definition', 'started + at least 3 meaningful editing steps + saved or exported',
    'totals', jsonb_build_object(
      'sessions', (select count(*) from sessions),
      'designers', (select count(distinct device_id) from sessions),
      'started', (select count(*) from sessions where started),
      'worked', (select count(*) from sessions where steps >= 3),
      'activated', (select count(*) from sessions where activated),
      'exported', (select count(*) from sessions where exported)
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'source', source,
        'sessions', sessions,
        'designers', designers,
        'started', started,
        'worked', worked,
        'activated', activated,
        'exported', exported
      ) order by activated desc, sessions desc), '[]'::jsonb)
      from (select * from source_rollup order by activated desc, sessions desc limit 50) x
    ),
    'landings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'landing', landing,
        'sessions', sessions,
        'designers', designers,
        'started', started,
        'activated', activated,
        'exported', exported
      ) order by activated desc, sessions desc), '[]'::jsonb)
      from (select * from landing_rollup order by activated desc, sessions desc limit 75) x
    ),
    'campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'source', source,
        'medium', medium,
        'campaign', campaign,
        'content', content,
        'sessions', sessions,
        'activated', activated
      ) order by activated desc, sessions desc), '[]'::jsonb)
      from (select * from campaign_rollup order by activated desc, sessions desc limit 100) x
    )
  ) into result;

  return result;
end $function$;

grant execute on function public.vc_admin_growth(text, integer) to anon, authenticated;
