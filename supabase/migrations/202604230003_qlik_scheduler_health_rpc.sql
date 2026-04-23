create or replace function public.get_qlik_scheduler_health()
returns table (
  cron_job_id bigint,
  cron_job_schedule text,
  cron_job_configured boolean,
  has_secret_supabase_url boolean,
  has_secret_project_url boolean,
  has_secret_internal_upper boolean,
  has_secret_internal_lower boolean,
  has_secret_service_role boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  with cron_job as (
    select
      j.jobid,
      j.schedule,
      j.command
    from cron.job j
    where j.jobname = 'qlik_dispatch_daily_0600_denver'
    order by j.jobid desc
    limit 1
  )
  select
    c.jobid as cron_job_id,
    c.schedule as cron_job_schedule,
    (c.command ilike '%qlik-dispatch-daily%') as cron_job_configured,
    exists(select 1 from vault.decrypted_secrets where name = 'SUPABASE_URL') as has_secret_supabase_url,
    exists(select 1 from vault.decrypted_secrets where name = 'supabase_project_url') as has_secret_project_url,
    exists(select 1 from vault.decrypted_secrets where name = 'INTERNAL_FUNCTION_BEARER_TOKEN') as has_secret_internal_upper,
    exists(select 1 from vault.decrypted_secrets where name = 'internal_function_bearer_token') as has_secret_internal_lower,
    exists(select 1 from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY') as has_secret_service_role
  from cron_job c;
$$;

grant execute on function public.get_qlik_scheduler_health() to authenticated;
grant execute on function public.get_qlik_scheduler_health() to service_role;
