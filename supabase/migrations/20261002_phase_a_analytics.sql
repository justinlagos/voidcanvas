-- Phase A, 2 Oct 2026: data we can trust.
-- Applied to the Supabase project `voidcanvas` (ref fpmyuqjiwckcjaufwwit). Kept here so the schema has a record.

-- 1. Which app version and build sent an event, and whether the device is the team's own.
alter table public.events
  add column if not exists ver text check (ver is null or ver ~ '^[0-9a-z.+-]{1,24}$'),
  add column if not exists app text check (app is null or app in ('web', 'desktop')),
  add column if not exists internal boolean not null default false;
grant insert (ver, app, internal) on public.events to anon, authenticated;
create index if not exists events_ts_real on public.events (ts) where ver is not null and not internal;

-- 2. The "This week" view in /admin (workflows added after Phase 6 shipped its `workflow` event): designers only. Rows from builds before Phase A (no `ver`) are left out,
--    because they mix in test runs and crawlers; rows from the team's own devices (`internal`) are left out too.
create or replace function public.vc_admin_week(p_password text, p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  err text;
  d int := greatest(1, least(coalesce(p_days, 7), 90));
  v_tz constant text := 'Europe/London';
  since timestamptz := now() - make_interval(days => d);
  prev_since timestamptz := now() - make_interval(days => 2 * d);
  result jsonb;
begin
  err := vc_admin.password_ok(p_password);
  if err is not null then return jsonb_build_object('error', err); end if;

  with
  real as (select e.* from public.events e where e.ts >= prev_since and e.ver is not null and not e.internal),
  cur as (select * from real where ts >= since),
  prev as (select * from real where ts < since),
  funnel_of as (
    select w, jsonb_build_object(
      'visitors', count(distinct device_id),
      'opened_editor', count(distinct device_id) filter (where area = 'editor'),
      'started', count(distinct device_id) filter (where name in ('doc.new', 'doc.import', 'doc.open')),
      'worked', count(distinct device_id) filter (where name = 'session.summary' and coalesce((props->>'n')::int, 0) > 0),
      'exported', count(distinct device_id) filter (where name = 'export'),
      'came_back', (select count(*) from (select device_id from real r2 where (case when r2.ts >= since then 'cur' else 'prev' end) = x.w group by device_id having count(distinct (r2.ts at time zone v_tz)::date) > 1) z)
    ) f
    from (select *, case when ts >= since then 'cur' else 'prev' end as w from real) x
    group by w
  ),
  sess as (
    select session_id, max(ver) ver, max(app) app,
      coalesce(sum((props->>'eng')::int) filter (where name = 'session.summary'), 0) eng,
      bool_or(name = 'export') exported,
      bool_or(name = 'session.summary' and coalesce((props->>'saves')::int, 0) > 0) saved,
      bool_or(name in ('doc.new', 'doc.import', 'doc.open')) started
    from cur group by session_id
  ),
  sess_prev as (
    select session_id,
      coalesce(sum((props->>'eng')::int) filter (where name = 'session.summary'), 0) eng,
      bool_or(name = 'export') exported,
      bool_or(name = 'session.summary' and coalesce((props->>'saves')::int, 0) > 0) saved
    from prev group by session_id
  ),
  friction as (
    select name, left(coalesce(props->>'kind', props->>'id', props->>'on', props->>'what', ''), 60) as what, count(*) n, count(distinct device_id) devices
    from cur where name in ('undo.quick', 'panel.abandon', 'rage', 'save.failed', 'export.failed')
    group by 1, 2
  ),
  ctl as (
    select k, sum(v::int) n, count(distinct device_id) devices
    from cur, jsonb_each_text(case when jsonb_typeof(props->'ctl') = 'object' then props->'ctl' else '{}'::jsonb end) as j(k, v)
    where name = 'session.summary' group by k
  ),
  steps as (
    select k, sum(v::int) n
    from cur, jsonb_each_text(case when jsonb_typeof(props->'steps') = 'object' then props->'steps' else '{}'::jsonb end) as j(k, v)
    where name = 'session.summary' group by k
  ),
  region as (
    select device_id, case
      when tz in ('Africa/Lagos', 'Africa/Accra', 'Africa/Abidjan', 'Africa/Dakar', 'Africa/Porto-Novo', 'Africa/Lome', 'Africa/Bamako', 'Africa/Conakry', 'Africa/Freetown', 'Africa/Monrovia', 'Africa/Niamey', 'Africa/Ouagadougou', 'Africa/Banjul', 'Africa/Douala') then 'West Africa'
      when tz = 'Europe/London' then 'UK'
      when tz like 'Africa/%' then 'Rest of Africa'
      else 'Elsewhere' end as r,
      bool_or(name = 'export') exported, bool_or(name in ('doc.new', 'doc.import', 'doc.open')) started
    from cur group by device_id, 2
  )
  select jsonb_build_object(
    'days', d,
    'generated_at', now(),
    'since', since,
    'first_real_event', (select min(ts) from public.events where ver is not null and not internal),
    'funnel', coalesce((select f from funnel_of where w = 'cur'), '{}'::jsonb),
    'funnel_prev', coalesce((select f from funnel_of where w = 'prev'), '{}'::jsonb),
    'time', jsonb_build_object(
      'sessions', (select count(*) from sess),
      'finished_sessions', (select count(*) from sess where exported or saved),
      'finished_minutes', (select round(coalesce(sum(eng), 0) / 60.0, 1) from sess where exported or saved),
      'finished_median_min', (select round(coalesce(percentile_cont(0.5) within group (order by eng), 0)::numeric / 60.0, 1) from sess where exported or saved),
      'all_minutes', (select round(coalesce(sum(eng), 0) / 60.0, 1) from sess),
      'prev_finished_minutes', (select round(coalesce(sum(eng), 0) / 60.0, 1) from sess_prev where exported or saved),
      'prev_finished_sessions', (select count(*) from sess_prev where exported or saved)
    ),
    'friction', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'what', what, 'n', n, 'devices', devices) order by n desc), '[]'::jsonb) from (select * from friction order by n desc limit 15) a),
    'search_misses', (select coalesce(jsonb_agg(jsonb_build_object('q', q, 'n', n, 'devices', dv) order by n desc), '[]'::jsonb) from (
      select props->>'q' q, count(*) n, count(distinct device_id) dv from cur where name = 'search.none' group by 1 order by 2 desc limit 25) a),
    'slow', (select coalesce(jsonb_agg(jsonb_build_object('what', what, 'n', n, 'median_ms', md, 'p90_ms', p9) order by p9 desc), '[]'::jsonb) from (
      select props->>'what' what, count(*) n,
        round(percentile_cont(0.5) within group (order by (props->>'ms')::numeric)) md,
        round(percentile_cont(0.9) within group (order by (props->>'ms')::numeric)) p9
      from cur where name = 'perf' group by 1) a),
    'saves', (select jsonb_build_object('n', coalesce(sum((props->>'saves')::int), 0), 'slowest_ms', coalesce(max((props->>'save_ms')::int), 0),
      'long_tasks', coalesce(sum((props->>'long')::int), 0), 'longest_ms', coalesce(max((props->>'long_ms')::int), 0))
      from cur where name = 'session.summary'),
    'controls', (select coalesce(jsonb_agg(jsonb_build_object('id', k, 'n', n, 'devices', devices) order by n desc), '[]'::jsonb) from (select * from ctl order by n desc limit 25) a),
    'steps', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from steps),
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('ver', ver, 'app', app, 'sessions', s, 'started', st, 'exported', ex, 'median_min', mm) order by ver desc), '[]'::jsonb) from (
      select ver, app, count(*) s, count(*) filter (where started) st, count(*) filter (where exported) ex,
        round(coalesce(percentile_cont(0.5) within group (order by eng) filter (where eng > 0), 0)::numeric / 60.0, 1) mm
      from sess group by ver, app) a),
    'regions', (select coalesce(jsonb_agg(jsonb_build_object('region', r, 'visitors', v, 'started', st, 'exported', ex) order by v desc), '[]'::jsonb) from (
      select r, count(*) v, count(*) filter (where started) st, count(*) filter (where exported) ex from region group by r) a),
    'workflows', jsonb_build_object(
      'n', (select count(*) from cur where name = 'workflow'),
      'designers', (select count(distinct device_id) from cur),
      'prev_n', (select count(*) from prev where name = 'workflow'),
      'prev_designers', (select count(distinct device_id) from prev),
      'kinds', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(props->>'kind', '?') k, count(*) n from cur where name = 'workflow' group by 1) a)
    ),
    'errors', (select coalesce(jsonb_agg(jsonb_build_object('msg', m, 'n', n, 'devices', dv, 'before_input', pre) order by n desc), '[]'::jsonb) from (
      select left(props->>'msg', 160) m, count(*) n, count(distinct device_id) dv, count(*) filter (where props->>'pre' = 'true') pre
      from cur where name = 'error' group by 1 order by 2 desc limit 12) a)
  ) into result;
  return result;
end $function$;

grant execute on function public.vc_admin_week(text, integer) to anon, authenticated;
