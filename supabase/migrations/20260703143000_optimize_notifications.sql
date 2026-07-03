-- Migration to clean up notifications and optimize read performance

-- 1. Delete notifications older than 14 days
DELETE FROM public.notifications 
WHERE created_at < NOW() - INTERVAL '14 days';

-- 2. Create function to automatically clean up notifications older than 14 days on new inserts
CREATE OR REPLACE FUNCTION public.fn_clean_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '14 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to run the cleanup after any insert to keep the table compact
DROP TRIGGER IF EXISTS trg_clean_old_notifications ON public.notifications;
CREATE TRIGGER trg_clean_old_notifications
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_clean_old_notifications();
