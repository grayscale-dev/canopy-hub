create or replace function public.get_canopy_production_last_12_months(
  p_reference_date date default current_date
)
returns table (
  month_key text,
  label text,
  funded_count integer,
  funded_volume numeric
)
language sql
stable
as $$
  with month_window as (
    select generate_series(
      date_trunc('month', p_reference_date)::date - interval '11 months',
      date_trunc('month', p_reference_date)::date,
      interval '1 month'
    )::date as month_start
  ),
  aggregated as (
    select
      date_trunc('month', funded_date)::date as month_start,
      count(*)::integer as funded_count,
      coalesce(sum(coalesce(loan_amount, 0)), 0)::numeric as funded_volume
    from public.production_data
    where funded_date is not null
      and funded_date >= (date_trunc('month', p_reference_date)::date - interval '11 months')
      and funded_date < (date_trunc('month', p_reference_date)::date + interval '1 month')
    group by 1
  )
  select
    to_char(month_window.month_start, 'YYYY-MM') as month_key,
    to_char(month_window.month_start, 'Mon YYYY') as label,
    coalesce(aggregated.funded_count, 0)::integer as funded_count,
    coalesce(aggregated.funded_volume, 0)::numeric as funded_volume
  from month_window
  left join aggregated using (month_start)
  order by month_window.month_start asc;
$$;

grant execute on function public.get_canopy_production_last_12_months(date) to anon;
grant execute on function public.get_canopy_production_last_12_months(date) to authenticated;
grant execute on function public.get_canopy_production_last_12_months(date) to service_role;
