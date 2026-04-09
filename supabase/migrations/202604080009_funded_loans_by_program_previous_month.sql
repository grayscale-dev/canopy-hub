create or replace function public.get_funded_loans_by_program_previous_month(
  p_reference_date date default current_date
)
returns table (
  month_start date,
  month_label text,
  loan_program text,
  funded_count integer,
  funded_volume numeric
)
language sql
stable
as $$
  with bounds as (
    select
      (date_trunc('month', p_reference_date)::date - interval '1 month')::date as month_start,
      date_trunc('month', p_reference_date)::date as month_end
  ),
  aggregated as (
    select
      coalesce(
        nullif(btrim(p.loan_product), ''),
        nullif(btrim(p.loan_type), ''),
        'Unknown Program'
      ) as loan_program,
      count(*)::integer as funded_count,
      coalesce(sum(coalesce(p.loan_amount, 0)), 0)::numeric as funded_volume
    from public.production_data p
    cross join bounds b
    where p.funded_date is not null
      and p.funded_date >= b.month_start
      and p.funded_date < b.month_end
    group by 1
  )
  select
    b.month_start,
    to_char(b.month_start, 'FMMonth YYYY') as month_label,
    a.loan_program,
    a.funded_count,
    a.funded_volume
  from aggregated a
  cross join bounds b
  order by a.funded_count desc, a.funded_volume desc, a.loan_program asc;
$$;

grant execute on function public.get_funded_loans_by_program_previous_month(date) to anon;
grant execute on function public.get_funded_loans_by_program_previous_month(date) to authenticated;
grant execute on function public.get_funded_loans_by_program_previous_month(date) to service_role;
