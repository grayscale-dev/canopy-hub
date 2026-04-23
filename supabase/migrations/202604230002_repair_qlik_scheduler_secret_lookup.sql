-- Repair scheduler secret lookup so cron can dispatch daily syncs reliably.
-- Supports both legacy lowercase Vault names and current uppercase secret names.
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
      with secrets as (
        select
          coalesce(
            (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL' limit 1),
            (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_project_url' limit 1)
          ) as project_url,
          coalesce(
            (select decrypted_secret from vault.decrypted_secrets where name = 'INTERNAL_FUNCTION_BEARER_TOKEN' limit 1),
            (select decrypted_secret from vault.decrypted_secrets where name = 'internal_function_bearer_token' limit 1),
            (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY' limit 1)
          ) as bearer_token
      )
      select
        case
          when extract(hour from (now() at time zone 'America/Denver')) = 6
               and project_url is not null
               and bearer_token is not null
          then net.http_post(
            url := project_url || '/functions/v1/qlik-dispatch-daily',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || bearer_token
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 120000
          )
          else null
        end
      from secrets;
    $job$
  );
end;
$mig$;
