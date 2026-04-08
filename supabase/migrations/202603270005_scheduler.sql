-- 005_scheduler.sql
-- Recommended: store secrets in Vault using names below:
--   supabase_project_url
--   internal_function_bearer_token

do $mig$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'qlik_dispatch_daily_0600_denver';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'qlik_dispatch_daily_0600_denver',
    '0 12,13 * * *',
    $job$
      select
        case
          when extract(hour from (now() at time zone 'America/Denver')) = 6
          then net.http_post(
            url := (select decrypted_secret || '/functions/v1/qlik-dispatch-daily'
                    from vault.decrypted_secrets
                    where name = 'supabase_project_url'),
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (
                select decrypted_secret
                from vault.decrypted_secrets
                where name = 'internal_function_bearer_token'
              )
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 120000
          )
          else null
        end;
    $job$
  );
end;
$mig$;
