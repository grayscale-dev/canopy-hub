create or replace function public.get_underwriting_org_april_summary(
  p_reference_date date default current_date
)
returns table (
  underwriting_org_id text,
  underwriting_org_name text,
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
      p.underwriting_org_id,
      count(*)::integer as file_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as total_volume
    from public.production_data p
    cross join april_window w
    where p.closed_date >= w.start_date
      and p.closed_date < (w.start_date + interval '1 month')
    group by p.underwriting_org_id
  )
  select
    a.underwriting_org_id,
    case
      when coalesce(branch_lookup.branch_name, division_lookup.division_name) is not null
        and nullif(a.underwriting_org_id, '') is not null then
        coalesce(branch_lookup.branch_name, division_lookup.division_name) || ' (' || a.underwriting_org_id || ')'
      when coalesce(branch_lookup.branch_name, division_lookup.division_name) is not null then
        coalesce(branch_lookup.branch_name, division_lookup.division_name)
      when nullif(a.underwriting_org_id, '') is not null then
        'Underwriting Org (' || a.underwriting_org_id || ')'
      else
        'Unknown Underwriting Org'
    end as underwriting_org_name,
    a.file_count,
    a.total_volume
  from aggregated a
  left join branch_lookup on branch_lookup.branch_id = a.underwriting_org_id
  left join division_lookup on division_lookup.division_id = a.underwriting_org_id
  order by a.file_count desc, a.total_volume desc, underwriting_org_name asc
  limit 20;
$$;

grant execute on function public.get_underwriting_org_april_summary(date) to anon;
grant execute on function public.get_underwriting_org_april_summary(date) to authenticated;
grant execute on function public.get_underwriting_org_april_summary(date) to service_role;
