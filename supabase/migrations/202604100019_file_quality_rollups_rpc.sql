create index if not exists idx_file_quality_data_loan_last_synced
  on public.file_quality_data(loan_number, last_synced_at desc);

create index if not exists idx_divisions_lookup_recent
  on public.divisions(division_id, last_synced_at desc);

create index if not exists idx_branches_lookup_recent
  on public.branches(branch_id, last_synced_at desc);

create index if not exists idx_production_data_funded_loan_recent
  on public.production_data(funded_date, loan_number, last_synced_at desc);

create or replace function public.get_file_quality_rollups(
  p_month_start date default (date_trunc('month', current_date - interval '1 month'))::date
)
returns table (
  entity_type text,
  key_id text,
  label text,
  file_count integer,
  touches_per_app numeric,
  avg_expected_touches numeric,
  net_touches numeric,
  has_expected_and_net_metrics boolean
)
language sql
stable
as $$
  with month_window as (
    select
      coalesce(
        p_month_start,
        (date_trunc('month', current_date - interval '1 month'))::date
      ) as month_start
  ),
  production_latest as (
    select distinct on (nullif(btrim(p.loan_number), ''))
      nullif(btrim(p.loan_number), '') as loan_number,
      nullif(btrim(p.division_id), '') as division_id,
      nullif(btrim(p.branch_id), '') as branch_id,
      p.funded_date
    from public.production_data p
    cross join month_window w
    where p.funded_date >= w.month_start
      and p.funded_date < (w.month_start + interval '1 month')
      and nullif(btrim(p.loan_number), '') is not null
    order by
      nullif(btrim(p.loan_number), ''),
      p.funded_date desc nulls last,
      p.last_synced_at desc nulls last,
      p.external_row_key desc
  ),
  file_quality_latest as (
    select distinct on (nullif(btrim(f.loan_number), ''))
      nullif(btrim(f.loan_number), '') as loan_number,
      coalesce(f.touch_count, 0)::numeric as touches_per_app_raw,
      coalesce(f.expected_touches, 0)::numeric as expected_touches_raw,
      coalesce(f.net_touches, 0)::numeric as net_touches_raw
    from public.file_quality_data f
    where nullif(btrim(f.loan_number), '') is not null
    order by
      nullif(btrim(f.loan_number), ''),
      f.last_synced_at desc nulls last,
      f.external_row_key desc
  ),
  joined as (
    select
      p.loan_number,
      p.division_id,
      p.branch_id,
      f.touches_per_app_raw,
      f.expected_touches_raw,
      f.net_touches_raw
    from production_latest p
    join file_quality_latest f
      on f.loan_number = p.loan_number
  ),
  joined_stats as (
    select
      count(*)::integer as file_count,
      avg(j.expected_touches_raw)::numeric as avg_expected_touches_raw,
      avg(j.net_touches_raw)::numeric as avg_net_touches_raw
    from joined j
  ),
  metrics_flag as (
    select
      case
        when js.file_count > 0
          and js.avg_expected_touches_raw > 0
          and js.avg_expected_touches_raw <= 20
          and js.avg_net_touches_raw is not null
          and abs(js.avg_net_touches_raw) <= 20
        then true
        else false
      end as has_expected_and_net_metrics
    from joined_stats js
  ),
  division_lookup as (
    select distinct on (nullif(btrim(d.division_id), ''))
      nullif(btrim(d.division_id), '') as division_id,
      nullif(btrim(d.division_name), '') as division_name
    from public.divisions d
    where nullif(btrim(d.division_id), '') is not null
    order by
      nullif(btrim(d.division_id), ''),
      d.last_synced_at desc nulls last,
      d.external_row_key desc
  ),
  branch_lookup as (
    select distinct on (nullif(btrim(b.branch_id), ''))
      nullif(btrim(b.branch_id), '') as branch_id,
      nullif(btrim(b.branch_name), '') as branch_name
    from public.branches b
    where nullif(btrim(b.branch_id), '') is not null
    order by
      nullif(btrim(b.branch_id), ''),
      b.last_synced_at desc nulls last,
      b.external_row_key desc
  ),
  division_rows as (
    select
      'division'::text as entity_type,
      j.division_id as key_id,
      coalesce(dl.division_name, 'Division ' || j.division_id) as label,
      count(*)::integer as file_count,
      round(avg(j.touches_per_app_raw), 2)::numeric as touches_per_app,
      round(avg(j.expected_touches_raw), 2)::numeric as avg_expected_touches,
      case
        when m.has_expected_and_net_metrics then round(avg(j.net_touches_raw), 2)::numeric
        else null
      end as net_touches,
      m.has_expected_and_net_metrics
    from joined j
    cross join metrics_flag m
    left join division_lookup dl
      on dl.division_id = j.division_id
    where j.division_id is not null
    group by
      j.division_id,
      dl.division_name,
      m.has_expected_and_net_metrics
  ),
  branch_rows as (
    select
      'branch'::text as entity_type,
      j.branch_id as key_id,
      coalesce(bl.branch_name, 'Branch ' || j.branch_id) as label,
      count(*)::integer as file_count,
      round(avg(j.touches_per_app_raw), 2)::numeric as touches_per_app,
      round(avg(j.expected_touches_raw), 2)::numeric as avg_expected_touches,
      case
        when m.has_expected_and_net_metrics then round(avg(j.net_touches_raw), 2)::numeric
        else null
      end as net_touches,
      m.has_expected_and_net_metrics
    from joined j
    cross join metrics_flag m
    left join branch_lookup bl
      on bl.branch_id = j.branch_id
    where j.branch_id is not null
    group by
      j.branch_id,
      bl.branch_name,
      m.has_expected_and_net_metrics
  ),
  company_rows as (
    select
      entity.entity_type,
      'company_averages'::text as key_id,
      'Company Averages'::text as label,
      0::integer as sort_rank,
      js.file_count,
      round(avg(j.touches_per_app_raw), 2)::numeric as touches_per_app,
      round(avg(j.expected_touches_raw), 2)::numeric as avg_expected_touches,
      case
        when m.has_expected_and_net_metrics then round(avg(j.net_touches_raw), 2)::numeric
        else null
      end as net_touches,
      m.has_expected_and_net_metrics
    from (values ('division'::text), ('branch'::text)) as entity(entity_type)
    cross join joined_stats js
    cross join metrics_flag m
    left join joined j
      on true
    where js.file_count > 0
    group by
      entity.entity_type,
      js.file_count,
      m.has_expected_and_net_metrics
  ),
  all_rows as (
    select
      c.entity_type,
      c.key_id,
      c.label,
      c.file_count,
      c.touches_per_app,
      c.avg_expected_touches,
      c.net_touches,
      c.has_expected_and_net_metrics,
      c.sort_rank
    from company_rows c

    union all

    select
      d.entity_type,
      d.key_id,
      d.label,
      d.file_count,
      d.touches_per_app,
      d.avg_expected_touches,
      d.net_touches,
      d.has_expected_and_net_metrics,
      1::integer as sort_rank
    from division_rows d

    union all

    select
      b.entity_type,
      b.key_id,
      b.label,
      b.file_count,
      b.touches_per_app,
      b.avg_expected_touches,
      b.net_touches,
      b.has_expected_and_net_metrics,
      1::integer as sort_rank
    from branch_rows b
  )
  select
    a.entity_type,
    a.key_id,
    a.label,
    a.file_count,
    a.touches_per_app,
    a.avg_expected_touches,
    a.net_touches,
    a.has_expected_and_net_metrics
  from all_rows a
  order by a.entity_type, a.sort_rank, a.net_touches asc nulls last, a.file_count desc, a.label asc;
$$;

grant execute on function public.get_file_quality_rollups(date) to anon;
grant execute on function public.get_file_quality_rollups(date) to authenticated;
grant execute on function public.get_file_quality_rollups(date) to service_role;
