-- Ensure scheduler can resolve a project URL from Vault.
do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name in ('SUPABASE_URL', 'supabase_project_url')
  ) then
    perform vault.create_secret(
      'https://rvwmxbuycfbmntxkovmn.supabase.co',
      'supabase_project_url',
      'Supabase project URL used by qlik dispatch scheduler'
    );
  end if;
end;
$$;
