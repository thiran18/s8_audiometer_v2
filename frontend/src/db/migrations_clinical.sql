-- Add calibration offsets to profiles
alter table profiles add column calibration_offsets jsonb default '{}'::jsonb;

-- Add report history to screenings for audit trails
alter table screenings add column report_history jsonb default '[]'::jsonb;
