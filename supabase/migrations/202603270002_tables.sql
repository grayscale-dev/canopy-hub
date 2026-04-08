-- 002_tables.sql

create table if not exists public.qlik_source_configs (
  id uuid primary key default gen_random_uuid(),
  sync_key text not null unique,
  hub_page text not null,
  hub_visualization text not null,
  hub_visualization_description text,
  qlik_app_id text not null,
  qlik_sheet_id text,
  qlik_object_id text not null,
  qlik_object_description text,
  domain_name text not null,
  target_table_name text,
  primary_key_strategy text not null default 'hash',
  is_enabled boolean not null default true,
  schedule_cron text not null default '0 6 * * *',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_qlik_source_configs_updated_at on public.qlik_source_configs;
create trigger trg_qlik_source_configs_updated_at
before update on public.qlik_source_configs
for each row
execute function public.set_updated_at();

create table if not exists public.qlik_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_config_id uuid not null references public.qlik_source_configs(id) on delete cascade,
  sync_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('running','success','failed','partial')),
  layout_captured boolean not null default false,
  data_captured boolean not null default false,
  row_count int,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  skipped_count int not null default 0,
  error_message text,
  request_metadata jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.qlik_raw_payloads (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.qlik_sync_runs(id) on delete cascade,
  source_config_id uuid not null references public.qlik_source_configs(id) on delete cascade,
  sync_key text not null,
  payload_type text not null check (payload_type in ('layout','data','combined','error','metadata_summary')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.qlik_row_ingest_log (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.qlik_sync_runs(id) on delete cascade,
  source_config_id uuid not null references public.qlik_source_configs(id) on delete cascade,
  sync_key text not null,
  target_table_name text,
  external_row_key text not null,
  source_record_hash text not null,
  action text not null check (action in ('inserted','updated','unchanged','failed')),
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.production_data (
  external_row_key text primary key,
  loan_number text,
  branch_id text,
  borrower text,
  prospect_date date,
  application_date date,
  pre_processing_date date,
  submitted_for_ir_date date,
  processing_date date,
  submitted_for_uw_date date,
  initial_conditions_submitted_date date,
  initial_conditions_cleared_date date,
  underwritten_date date,
  clear_to_close_date date,
  final_conditions_submitted_date date,
  final_conditions_cleared_date date,
  released_to_closer_date date,
  closed_date date,
  funded_date date,
  last_status text,
  last_status_date date,
  loan_officer_id text,
  loan_officer_assistant_id text,
  processor_id text,
  underwriter_id text,
  closer_id text,
  funder_id text,
  interest_rate numeric,
  locked_date date,
  lock_expiration_date date,
  estimated_closing_date date,
  loan_amount numeric,
  loan_type text,
  investor text,
  investor_loan_number text,
  amortization_type text,
  loan_purpose text,
  is_cash_out boolean,
  lien_position text,
  address text,
  city text,
  state text,
  zip_code text,
  property_type text,
  business_channel text,
  occupancy text,
  loan_term integer,
  processing_org_id text,
  pa_org_id text,
  underwriting_org_id text,
  division_id text,
  is_under_construction boolean,
  first_cd_completed_date date,
  classification text,
  loan_product text,
  business_days_in_current_status numeric,
  business_days_since_pre_processing numeric,
  business_days_to_closing numeric,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.divisions (
  external_row_key text primary key,
  division_id text,
  division_name text,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.branches (
  external_row_key text primary key,
  branch_id text,
  accounting_code text,
  branch_name text,
  branch_address text,
  branch_city text,
  branch_state text,
  branch_zip text,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.employees (
  external_row_key text primary key,
  user_id text,
  user_name text,
  user_email text,
  default_role text,
  user_is_active boolean,
  associated_processing_orgs text[],
  associated_underwriting_orgs text[],
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.corporate_turn_times (
  external_row_key text primary key,
  production_status_order integer,
  production_status text,
  production_status_type text,
  files_in_progress numeric,
  workdays_for_files_in_progress numeric,
  workdays_to_complete_for_previous_month numeric,
  workdays_for_lo_loa_statuses numeric,
  processing_rushes_last_7_days numeric,
  underwriting_rushes_last_7_days numeric,
  closing_funding_rushes_last_7_days numeric,
  data_last_imported_from_nano timestamptz,
  workdays_to_complete_for_previous_week numeric,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.file_quality_data (
  external_row_key text primary key,
  loan_number text,
  expected_touches numeric,
  branch_id text,
  division_id text,
  loan_officer_id text,
  processor_id text,
  touch_count numeric,
  net_touches numeric,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.specialist_points_old (
  external_row_key text primary key,
  app_id text,
  pa_org_id text,
  record_id text,
  event text,
  event_date date,
  user_id text,
  points numeric,
  month_date date,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);

create table if not exists public.specialist_points_new (
  external_row_key text primary key,
  app_id text,
  pa_org_id text,
  record_id text,
  event text,
  event_date date,
  user_id text,
  points numeric,
  month_date date,
  raw_payload jsonb not null,
  source_record_hash text not null,
  last_synced_at timestamptz not null default now()
);
