-- Repair file_quality_data rows that were ingested with misaligned qMatrix column indices.
-- This remaps columns from the known bad pattern:
-- expected_touches <- Touch Count
-- branch_id        <- Expected Touches
-- division_id      <- Net Touches
-- loan_officer_id  <- Branch ID
-- processor_id     <- Division ID
-- touch_count      <- Loan Officer ID
-- net_touches      <- Processor ID

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
  and branch_id ~ '^-?\\d+(\\.\\d+)?$'
  and division_id ~ '^-?\\d+(\\.\\d+)?$';
