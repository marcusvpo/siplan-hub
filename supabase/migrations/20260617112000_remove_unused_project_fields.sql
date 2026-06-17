-- Remove unused project columns: start_date_planned, end_date_planned, next_follow_up_date
ALTER TABLE public.projects 
  DROP COLUMN IF EXISTS start_date_planned,
  DROP COLUMN IF EXISTS end_date_planned,
  DROP COLUMN IF EXISTS next_follow_up_date;
