create or replace function public.get_corporate_turn_times_rows()
returns table (
  section_type text,
  section_label text,
  section_sort_order integer,
  status text,
  status_order integer,
  files_in_progress numeric,
  workdays_for_files_in_progress numeric,
  workdays_to_complete_for_previous_week numeric,
  workdays_to_complete_for_previous_month numeric
)
language sql
stable
as $$
  with ranked as (
    select
      c.external_row_key,
      nullif(btrim(c.production_status_type), '') as production_status_type,
      nullif(btrim(c.production_status), '') as production_status,
      coalesce(c.production_status_order, 999) as production_status_order,
      coalesce(c.files_in_progress, 0)::numeric as files_in_progress,
      coalesce(c.workdays_for_files_in_progress, 0)::numeric as workdays_for_files_in_progress,
      coalesce(c.workdays_to_complete_for_previous_week, 0)::numeric as workdays_to_complete_for_previous_week,
      coalesce(c.workdays_to_complete_for_previous_month, 0)::numeric as workdays_to_complete_for_previous_month,
      coalesce(c.workdays_for_lo_loa_statuses, 0)::numeric as workdays_for_lo_loa_statuses,
      c.raw_payload,
      c.last_synced_at,
      row_number() over (
        partition by nullif(btrim(c.production_status), '')
        order by c.last_synced_at desc nulls last, c.external_row_key desc
      ) as row_rank
    from public.corporate_turn_times c
    where nullif(btrim(c.production_status), '') is not null
  ),
  latest as (
    select *
    from ranked
    where row_rank = 1
  ),
  prepared as (
    select
      coalesce(latest.production_status_type, 'Other') as section_type,
      case coalesce(latest.production_status_type, 'Other')
        when 'Processing' then 'Corporate Processing Metrics'
        when 'Underwriting' then 'Corporate Underwriting Metrics'
        when 'Closing' then 'Corporate Closing Metrics'
        else coalesce(latest.production_status_type, 'Other')
      end as section_label,
      case coalesce(latest.production_status_type, 'Other')
        when 'Processing' then 1
        when 'Underwriting' then 2
        when 'Closing' then 3
        else 99
      end as section_sort_order,
      coalesce(latest.production_status, 'Unknown') as status,
      latest.production_status_order as status_order,
      latest.files_in_progress,
      latest.workdays_for_files_in_progress,
      latest.workdays_to_complete_for_previous_week as base_previous_week,
      latest.workdays_to_complete_for_previous_month as base_previous_month,
      latest.workdays_for_lo_loa_statuses as base_lo_loa,
      (
        nullif(
          regexp_replace(
            coalesce(latest.raw_payload -> 'Workdays to Complete for Previous Month' ->> 'qNum', ''),
            '[^0-9.-]',
            '',
            'g'
          ),
          ''
        )
      )::numeric as raw_previous_month,
      (
        nullif(
          regexp_replace(
            coalesce(latest.raw_payload -> 'Workdays for LO/LOA Statuses' ->> 'qNum', ''),
            '[^0-9.-]',
            '',
            'g'
          ),
          ''
        )
      )::numeric as raw_lo_loa,
      latest.workdays_to_complete_for_previous_week >= 1000 as has_shifted_columns
    from latest
  )
  select
    prepared.section_type,
    prepared.section_label,
    prepared.section_sort_order,
    prepared.status,
    prepared.status_order,
    prepared.files_in_progress,
    prepared.workdays_for_files_in_progress,
    case
      when prepared.has_shifted_columns then coalesce(prepared.raw_previous_month, prepared.base_previous_month)
      else prepared.base_previous_week
    end as workdays_to_complete_for_previous_week,
    case
      when prepared.has_shifted_columns then coalesce(prepared.raw_lo_loa, prepared.base_lo_loa)
      else prepared.base_previous_month
    end as workdays_to_complete_for_previous_month
  from prepared
  order by prepared.section_sort_order asc, prepared.status_order asc, prepared.status asc;
$$;

grant execute on function public.get_corporate_turn_times_rows() to anon;
grant execute on function public.get_corporate_turn_times_rows() to authenticated;
grant execute on function public.get_corporate_turn_times_rows() to service_role;

create or replace function public.get_corporate_turn_times_kpis()
returns table (
  workdays_for_lo_loa_statuses numeric,
  processing_rushes_last_7_days numeric,
  underwriting_rushes_last_7_days numeric,
  closing_funding_rushes_last_7_days numeric
)
language sql
stable
as $$
  with ranked as (
    select
      c.external_row_key,
      nullif(btrim(c.production_status_type), '') as production_status_type,
      nullif(btrim(c.production_status), '') as production_status,
      coalesce(c.production_status_order, 999) as production_status_order,
      coalesce(c.workdays_to_complete_for_previous_week, 0)::numeric as workdays_to_complete_for_previous_week,
      coalesce(c.workdays_for_lo_loa_statuses, 0)::numeric as workdays_for_lo_loa_statuses,
      coalesce(c.processing_rushes_last_7_days, 0)::numeric as processing_rushes_last_7_days,
      coalesce(c.underwriting_rushes_last_7_days, 0)::numeric as underwriting_rushes_last_7_days,
      coalesce(c.closing_funding_rushes_last_7_days, 0)::numeric as closing_funding_rushes_last_7_days,
      c.raw_payload,
      c.last_synced_at,
      row_number() over (
        partition by nullif(btrim(c.production_status), '')
        order by c.last_synced_at desc nulls last, c.external_row_key desc
      ) as row_rank
    from public.corporate_turn_times c
    where nullif(btrim(c.production_status), '') is not null
  ),
  latest as (
    select *
    from ranked
    where row_rank = 1
  ),
  normalized as (
    select
      coalesce(latest.production_status_type, 'Other') as section_type,
      case coalesce(latest.production_status_type, 'Other')
        when 'Processing' then 1
        when 'Underwriting' then 2
        when 'Closing' then 3
        else 99
      end as section_sort_order,
      coalesce(latest.production_status, 'Unknown') as status,
      latest.production_status_order as status_order,
      case
        when latest.workdays_to_complete_for_previous_week >= 1000 then
          coalesce(
            (
              nullif(
                regexp_replace(
                  coalesce(latest.raw_payload -> 'Processing Rushes (Last 7 Days)' ->> 'qNum', ''),
                  '[^0-9.-]',
                  '',
                  'g'
                ),
                ''
              )
            )::numeric,
            latest.processing_rushes_last_7_days
          )
        else latest.workdays_for_lo_loa_statuses
      end as normalized_workdays_for_lo_loa_statuses,
      case
        when latest.workdays_to_complete_for_previous_week >= 1000 then
          coalesce(
            (
              nullif(
                regexp_replace(
                  coalesce(latest.raw_payload -> 'Underwriting Rushes (Last 7 Days)' ->> 'qNum', ''),
                  '[^0-9.-]',
                  '',
                  'g'
                ),
                ''
              )
            )::numeric,
            latest.underwriting_rushes_last_7_days
          )
        else latest.processing_rushes_last_7_days
      end as normalized_processing_rushes_last_7_days,
      case
        when latest.workdays_to_complete_for_previous_week >= 1000 then
          coalesce(
            (
              nullif(
                regexp_replace(
                  coalesce(latest.raw_payload -> 'Closing/Funding Rushes (Last 7 Days)' ->> 'qNum', ''),
                  '[^0-9.-]',
                  '',
                  'g'
                ),
                ''
              )
            )::numeric,
            latest.closing_funding_rushes_last_7_days
          )
        else latest.underwriting_rushes_last_7_days
      end as normalized_underwriting_rushes_last_7_days,
      case
        when latest.workdays_to_complete_for_previous_week >= 1000 then
          coalesce(
            (
              nullif(
                regexp_replace(
                  coalesce(latest.raw_payload -> 'Data Last Imported from Nano' ->> 'qNum', ''),
                  '[^0-9.-]',
                  '',
                  'g'
                ),
                ''
              )
            )::numeric,
            latest.closing_funding_rushes_last_7_days
          )
        else latest.closing_funding_rushes_last_7_days
      end as normalized_closing_funding_rushes_last_7_days
    from latest
  ),
  source as (
    select *
    from normalized
    order by
      case when normalized.status = 'Processing' then 0 else 1 end,
      normalized.section_sort_order asc,
      normalized.status_order asc,
      normalized.status asc
    limit 1
  )
  select
    coalesce(source.normalized_workdays_for_lo_loa_statuses, 0)::numeric,
    coalesce(source.normalized_processing_rushes_last_7_days, 0)::numeric,
    coalesce(source.normalized_underwriting_rushes_last_7_days, 0)::numeric,
    coalesce(source.normalized_closing_funding_rushes_last_7_days, 0)::numeric
  from source;
$$;

grant execute on function public.get_corporate_turn_times_kpis() to anon;
grant execute on function public.get_corporate_turn_times_kpis() to authenticated;
grant execute on function public.get_corporate_turn_times_kpis() to service_role;
