create or replace function public.get_branch_april_summary(
  p_reference_date date default current_date
)
returns table (
  branch_id text,
  branch_name text,
  file_count integer,
  total_volume numeric
)
language sql
stable
as $$
  with april_window as (
    select make_date(extract(year from p_reference_date)::integer, 4, 1) as start_date
  ),
  branch_lookup as (
    select distinct on (b.branch_id)
      b.branch_id,
      nullif(trim(b.branch_name), '') as branch_name
    from public.branches b
    where b.branch_id is not null
    order by b.branch_id, b.last_synced_at desc nulls last, b.external_row_key desc
  ),
  aggregated as (
    select
      p.branch_id,
      count(*)::integer as file_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as total_volume
    from public.production_data p
    cross join april_window w
    where p.closed_date >= w.start_date
      and p.closed_date < (w.start_date + interval '1 month')
    group by p.branch_id
  )
  select
    a.branch_id,
    case
      when branch_lookup.branch_name is not null and nullif(a.branch_id, '') is not null then
        branch_lookup.branch_name || ' (' || a.branch_id || ')'
      when branch_lookup.branch_name is not null then
        branch_lookup.branch_name
      when nullif(a.branch_id, '') is not null then
        'Branch ' || a.branch_id
      else
        'Unknown Branch'
    end as branch_name,
    a.file_count,
    a.total_volume
  from aggregated a
  left join branch_lookup on branch_lookup.branch_id = a.branch_id
  order by a.file_count desc, a.total_volume desc, branch_name asc
  limit 20;
$$;

grant execute on function public.get_branch_april_summary(date) to anon;
grant execute on function public.get_branch_april_summary(date) to authenticated;
grant execute on function public.get_branch_april_summary(date) to service_role;
