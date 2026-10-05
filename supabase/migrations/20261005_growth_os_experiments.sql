-- Growth OS experiments, 5 Oct 2026.
-- Additive read-only admin RPC. Exposure is an `experiment.view` event written
-- through the existing analytics pipeline; outcome is derived from the same session.

create or replace function public.vc_admin_experiments(p_password text, p_days integer default 30)
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
    select e.* from public.events e
    where e.ts >= since and e.ver is not null and not e.internal
  ),
  outcome as (
    select
      session_id,
      max(device_id) device_id,
      bool_or(name in ('doc.new', 'doc.import', 'doc.open')) started,
      coalesce(sum((props->>'n')::int) filter (
        where name = 'session.summary' and coalesce(props->>'n', '') ~ '^[0-9]+$'
      ), 0) steps,
      bool_or(name = 'export') exported,
      bool_or(name = 'session.summary' and coalesce((props->>'saves')::int, 0) > 0) saved
    from real group by session_id
  ),
  exposure as (
    select distinct on (session_id, props->>'experiment')
      session_id,
      nullif(props->>'experiment', '') experiment,
      nullif(props->>'variant', '') variant,
      ts
    from real
    where name = 'experiment.view'
      and coalesce(props->>'experiment', '') ~ '^[a-z0-9][a-z0-9._-]{0,39}$'
      and coalesce(props->>'variant', '') ~ '^[a-z0-9][a-z0-9._-]{0,39}$'
    order by session_id, props->>'experiment', ts asc
  ),
  joined as (
    select
      x.experiment, x.variant, o.session_id, o.device_id,
      o.started, o.steps, o.exported, o.saved,
      (o.started and o.steps >= 3 and (o.exported or o.saved)) activated
    from exposure x join outcome o using (session_id)
  ),
  variants as (
    select experiment, variant,
      count(*) sessions,
      count(distinct device_id) designers,
      count(*) filter (where started) started,
      count(*) filter (where steps >= 3) worked,
      count(*) filter (where activated) activated,
      count(*) filter (where exported) exported
    from joined
    group by experiment, variant
  ),
  experiments as (
    select experiment,
      sum(sessions) sessions,
      sum(activated) activated,
      count(*) variants
    from variants group by experiment
  )
  select jsonb_build_object(
    'days', d,
    'generated_at', now(),
    'definition', 'started + at least 3 meaningful editing steps + saved or exported',
    'experiments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'experiment', experiment,
        'sessions', sessions,
        'activated', activated,
        'variants', variants
      ) order by sessions desc), '[]'::jsonb)
      from experiments
    ),
    'variants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'experiment', experiment,
        'variant', variant,
        'sessions', sessions,
        'designers', designers,
        'started', started,
        'worked', worked,
        'activated', activated,
        'exported', exported
      ) order by experiment, activated desc, sessions desc), '[]'::jsonb)
      from variants
    )
  ) into result;

  return result;
end $function$;

grant execute on function public.vc_admin_experiments(text, integer) to anon, authenticated;
