create or replace function public.invoke_qlik_dispatch_now()
returns bigint
language sql
security definer
set search_path = public, extensions
as $$
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
  select coalesce(
    (
      select net.http_post(
        url := project_url || '/functions/v1/qlik-dispatch-daily',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || bearer_token
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      )
      from secrets
      where project_url is not null
        and bearer_token is not null
    ),
    0::bigint
  );
$$;

grant execute on function public.invoke_qlik_dispatch_now() to service_role;
