-- 003_indexes.sql

create index if not exists idx_qlik_source_configs_sync_key
  on public.qlik_source_configs(sync_key);

create index if not exists idx_qlik_source_configs_is_enabled
  on public.qlik_source_configs(is_enabled);

create index if not exists idx_qlik_sync_runs_source_started
  on public.qlik_sync_runs(source_config_id, started_at desc);

create index if not exists idx_qlik_raw_payloads_run_id
  on public.qlik_raw_payloads(run_id);

create index if not exists idx_qlik_raw_payloads_source_created
  on public.qlik_raw_payloads(source_config_id, created_at desc);

create index if not exists idx_production_data_loan_number
  on public.production_data(loan_number);

create index if not exists idx_production_data_funded_date
  on public.production_data(funded_date);

create index if not exists idx_production_data_branch_id
  on public.production_data(branch_id);

create index if not exists idx_production_data_division_id
  on public.production_data(division_id);

create index if not exists idx_production_data_loan_officer_id
  on public.production_data(loan_officer_id);

create index if not exists idx_production_data_processor_id
  on public.production_data(processor_id);

create index if not exists idx_production_data_underwriter_id
  on public.production_data(underwriter_id);

create index if not exists idx_file_quality_data_loan_number
  on public.file_quality_data(loan_number);

create index if not exists idx_file_quality_data_branch_id
  on public.file_quality_data(branch_id);

create index if not exists idx_file_quality_data_division_id
  on public.file_quality_data(division_id);

create index if not exists idx_specialist_points_old_user_event
  on public.specialist_points_old(user_id, event_date);

create index if not exists idx_specialist_points_new_user_event
  on public.specialist_points_new(user_id, event_date);
