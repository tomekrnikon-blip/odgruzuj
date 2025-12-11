-- Create a service-level function to decrypt push subscriptions (no auth.uid() check)
-- This is used by the scheduled notification cron job
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_decrypted_service()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  endpoint text, 
  auth text, 
  p256dh text, 
  is_active boolean, 
  notification_time time without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function is for service-level calls only (from edge functions with service role)
  -- No auth check because it's called by cron job with service role key
  
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.endpoint,
    public.decrypt_push_data(ps.auth) as auth,
    public.decrypt_push_data(ps.p256dh) as p256dh,
    ps.is_active,
    ps.notification_time
  FROM public.push_subscriptions ps
  WHERE ps.is_active = true;
END;
$$;

-- Revoke public access - only service role should call this
REVOKE ALL ON FUNCTION public.get_push_subscriptions_decrypted_service() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_push_subscriptions_decrypted_service() FROM anon;
REVOKE ALL ON FUNCTION public.get_push_subscriptions_decrypted_service() FROM authenticated;