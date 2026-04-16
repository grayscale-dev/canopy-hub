create index if not exists idx_employees_user_recent
  on public.employees(user_id, last_synced_at desc);

create or replace function public.get_employee_directory_rows()
returns table (
  user_id text,
  user_name text,
  user_email text,
  default_role text,
  raw_payload jsonb,
  context_division_id text,
  context_division_name text,
  context_branch_id text,
  context_branch_name text
)
language sql
stable
as $$
  with employees_latest as (
    select distinct on (nullif(btrim(e.user_id), ''))
      nullif(btrim(e.user_id), '') as user_id,
      nullif(btrim(e.user_name), '') as user_name,
      nullif(btrim(e.user_email), '') as user_email,
      nullif(btrim(e.default_role), '') as default_role,
      e.raw_payload
    from public.employees e
    where nullif(btrim(e.user_id), '') is not null
    order by
      nullif(btrim(e.user_id), ''),
      e.last_synced_at desc nulls last,
      e.external_row_key desc
  ),
  role_context as (
    select
      role_user_id as user_id,
      nullif(btrim(p.division_id), '') as division_id,
      nullif(btrim(p.branch_id), '') as branch_id,
      coalesce(p.funded_date::timestamptz, p.closed_date::timestamptz, p.last_synced_at) as context_ts,
      p.last_synced_at,
      p.external_row_key
    from public.production_data p
    cross join lateral unnest(
      array[
        nullif(btrim(p.loan_officer_id), ''),
        nullif(btrim(p.processor_id), ''),
        nullif(btrim(p.underwriter_id), ''),
        nullif(btrim(p.closer_id), ''),
        nullif(btrim(p.funder_id), '')
      ]
    ) as role_user_id
    where role_user_id is not null
  ),
  latest_context as (
    select distinct on (rc.user_id)
      rc.user_id,
      rc.division_id,
      rc.branch_id
    from role_context rc
    order by
      rc.user_id,
      rc.context_ts desc nulls last,
      rc.last_synced_at desc nulls last,
      rc.external_row_key desc
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
  )
  select
    e.user_id,
    coalesce(e.user_name, 'Employee ' || e.user_id) as user_name,
    e.user_email,
    e.default_role,
    e.raw_payload,
    lc.division_id as context_division_id,
    dl.division_name as context_division_name,
    lc.branch_id as context_branch_id,
    bl.branch_name as context_branch_name
  from employees_latest e
  left join latest_context lc
    on lc.user_id = e.user_id
  left join division_lookup dl
    on dl.division_id = lc.division_id
  left join branch_lookup bl
    on bl.branch_id = lc.branch_id
  order by coalesce(e.user_name, e.user_id) asc;
$$;

grant execute on function public.get_employee_directory_rows() to anon;
grant execute on function public.get_employee_directory_rows() to authenticated;
grant execute on function public.get_employee_directory_rows() to service_role;
