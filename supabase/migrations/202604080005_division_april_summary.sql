create or replace function public.get_division_april_summary(
  p_reference_date date default current_date
)
returns table (
  division_id text,
  division_name text,
  file_count integer,
  total_volume numeric
)
language sql
stable
as $$
  with april_window as (
    select make_date(extract(year from p_reference_date)::integer, 4, 1) as start_date
  ),
  division_lookup as (
    select distinct on (d.division_id)
      d.division_id,
      nullif(trim(d.division_name), '') as division_name
    from public.divisions d
    where d.division_id is not null
    order by d.division_id, d.last_synced_at desc nulls last, d.external_row_key desc
  ),
  aggregated as (
    select
      p.division_id,
      count(*)::integer as file_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as total_volume
    from public.production_data p
    cross join april_window w
    where p.closed_date >= w.start_date
      and p.closed_date < (w.start_date + interval '1 month')
    group by p.division_id
  )
  select
    a.division_id,
    case
      when division_lookup.division_name is not null and nullif(a.division_id, '') is not null then
        division_lookup.division_name || ' (' || a.division_id || ')'
      when division_lookup.division_name is not null then
        division_lookup.division_name
      when nullif(a.division_id, '') is not null then
        'Division ' || a.division_id
      else
        'Unknown Division'
    end as division_name,
    a.file_count,
    a.total_volume
  from aggregated a
  left join division_lookup on division_lookup.division_id = a.division_id
  order by a.file_count desc, a.total_volume desc, division_name asc
  limit 20;
$$;

grant execute on function public.get_division_april_summary(date) to anon;
grant execute on function public.get_division_april_summary(date) to authenticated;
grant execute on function public.get_division_april_summary(date) to service_role;
