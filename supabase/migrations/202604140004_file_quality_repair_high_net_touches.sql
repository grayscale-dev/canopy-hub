-- Repair remaining file_quality_data rows where net_touches still contains processor IDs.
-- These rows are identifiable by impossible net touch values (absolute value > 20).

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
  net_touches is not null
  and abs(net_touches) > 20;
