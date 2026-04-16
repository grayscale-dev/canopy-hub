-- Retry the file_quality_data column-realignment repair with POSIX-compatible numeric checks.

update public.file_quality_data
set
  expected_touches = nullif(branch_id, '')::numeric,
  branch_id = loan_officer_id,
  division_id = processor_id,
  loan_officer_id = nullif(touch_count::text, ''),
  processor_id = nullif(net_touches::text, ''),
  touch_count = expected_touches,
  net_touches = nullif(division_id, '')::numeric
where
  touch_count is not null
  and touch_count > 100
  and expected_touches is not null
  and expected_touches >= 0
  and expected_touches <= 20
  and branch_id is not null
  and division_id is not null
  and loan_officer_id is not null
  and processor_id is not null
  and branch_id ~ '^-?[0-9]+(\\.[0-9]+)?$'
  and division_id ~ '^-?[0-9]+(\\.[0-9]+)?$';
