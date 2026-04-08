create or replace function public.get_loan_officer_april_summary(
  p_reference_date date default current_date
)
returns table (
  loan_officer_id text,
  loan_officer_name text,
  file_count integer,
  total_volume numeric
)
language sql
stable
as $$
  with april_window as (
    select make_date(extract(year from p_reference_date)::integer, 4, 1) as start_date
  ),
  employee_lookup as (
    select distinct on (e.user_id)
      e.user_id,
      nullif(trim(e.user_name), '') as user_name
    from public.employees e
    where e.user_id is not null
    order by e.user_id, e.last_synced_at desc nulls last, e.external_row_key desc
  ),
  aggregated as (
    select
      p.loan_officer_id,
      count(*)::integer as file_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as total_volume
    from public.production_data p
    cross join april_window w
    where p.closed_date >= w.start_date
      and p.closed_date < (w.start_date + interval '1 month')
    group by p.loan_officer_id
  )
  select
    a.loan_officer_id,
    case
      when employee_lookup.user_name is not null and nullif(a.loan_officer_id, '') is not null then
        employee_lookup.user_name || ' (' || a.loan_officer_id || ')'
      when employee_lookup.user_name is not null then
        employee_lookup.user_name
      when nullif(a.loan_officer_id, '') is not null then
        'Loan Officer ' || a.loan_officer_id
      else
        'Unknown Loan Officer'
    end as loan_officer_name,
    a.file_count,
    a.total_volume
  from aggregated a
  left join employee_lookup on employee_lookup.user_id = a.loan_officer_id
  order by a.file_count desc, a.total_volume desc, loan_officer_name asc
  limit 20;
$$;

grant execute on function public.get_loan_officer_april_summary(date) to anon;
grant execute on function public.get_loan_officer_april_summary(date) to authenticated;
grant execute on function public.get_loan_officer_april_summary(date) to service_role;

create or replace function public.get_processor_april_summary(
  p_reference_date date default current_date
)
returns table (
  processor_id text,
  processor_name text,
  file_count integer,
  total_volume numeric
)
language sql
stable
as $$
  with april_window as (
    select make_date(extract(year from p_reference_date)::integer, 4, 1) as start_date
  ),
  employee_lookup as (
    select distinct on (e.user_id)
      e.user_id,
      nullif(trim(e.user_name), '') as user_name
    from public.employees e
    where e.user_id is not null
    order by e.user_id, e.last_synced_at desc nulls last, e.external_row_key desc
  ),
  aggregated as (
    select
      p.processor_id,
      count(*)::integer as file_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as total_volume
    from public.production_data p
    cross join april_window w
    where p.closed_date >= w.start_date
      and p.closed_date < (w.start_date + interval '1 month')
    group by p.processor_id
  )
  select
    a.processor_id,
    case
      when employee_lookup.user_name is not null and nullif(a.processor_id, '') is not null then
        employee_lookup.user_name || ' (' || a.processor_id || ')'
      when employee_lookup.user_name is not null then
        employee_lookup.user_name
      when nullif(a.processor_id, '') is not null then
        'Processor ' || a.processor_id
      else
        'Unknown Processor'
    end as processor_name,
    a.file_count,
    a.total_volume
  from aggregated a
  left join employee_lookup on employee_lookup.user_id = a.processor_id
  order by a.file_count desc, a.total_volume desc, processor_name asc
  limit 20;
$$;

grant execute on function public.get_processor_april_summary(date) to anon;
grant execute on function public.get_processor_april_summary(date) to authenticated;
grant execute on function public.get_processor_april_summary(date) to service_role;

create or replace function public.get_underwriter_april_summary(
  p_reference_date date default current_date
)
returns table (
  underwriter_id text,
  underwriter_name text,
  file_count integer,
  total_volume numeric
)
language sql
stable
as $$
  with april_window as (
    select make_date(extract(year from p_reference_date)::integer, 4, 1) as start_date
  ),
  employee_lookup as (
    select distinct on (e.user_id)
      e.user_id,
      nullif(trim(e.user_name), '') as user_name
    from public.employees e
    where e.user_id is not null
    order by e.user_id, e.last_synced_at desc nulls last, e.external_row_key desc
  ),
  aggregated as (
    select
      p.underwriter_id,
      count(*)::integer as file_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as total_volume
    from public.production_data p
    cross join april_window w
    where p.closed_date >= w.start_date
      and p.closed_date < (w.start_date + interval '1 month')
    group by p.underwriter_id
  )
  select
    a.underwriter_id,
    case
      when employee_lookup.user_name is not null and nullif(a.underwriter_id, '') is not null then
        employee_lookup.user_name || ' (' || a.underwriter_id || ')'
      when employee_lookup.user_name is not null then
        employee_lookup.user_name
      when nullif(a.underwriter_id, '') is not null then
        'Underwriter ' || a.underwriter_id
      else
        'Unknown Underwriter'
    end as underwriter_name,
    a.file_count,
    a.total_volume
  from aggregated a
  left join employee_lookup on employee_lookup.user_id = a.underwriter_id
  order by a.file_count desc, a.total_volume desc, underwriter_name asc
  limit 20;
$$;

grant execute on function public.get_underwriter_april_summary(date) to anon;
grant execute on function public.get_underwriter_april_summary(date) to authenticated;
grant execute on function public.get_underwriter_april_summary(date) to service_role;

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
      when nullif(a.underwriting_org_id, '') is not null then
        'Underwriting Org (' || a.underwriting_org_id || ')'
      else
        'Unknown Underwriting Org'
    end as underwriting_org_name,
    a.file_count,
    a.total_volume
  from aggregated a
  order by a.file_count desc, a.total_volume desc, underwriting_org_name asc
  limit 20;
$$;

grant execute on function public.get_underwriting_org_april_summary(date) to anon;
grant execute on function public.get_underwriting_org_april_summary(date) to authenticated;
grant execute on function public.get_underwriting_org_april_summary(date) to service_role;
