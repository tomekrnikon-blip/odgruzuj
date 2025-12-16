-- Add column to track when daily limit was last reset by admin
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS daily_limit_reset_at timestamp with time zone DEFAULT now();

-- Create function to reset daily limits for all users (for cron job)
CREATE OR REPLACE FUNCTION public.reset_all_daily_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_progress 
  SET daily_limit_reset_at = now(), updated_at = now();
END;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.reset_all_daily_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_all_daily_limits() FROM anon;
REVOKE ALL ON FUNCTION public.reset_all_daily_limits() FROM authenticated;