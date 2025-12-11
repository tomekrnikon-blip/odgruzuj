-- Add policy to deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add policy to deny anonymous access to support_messages table
CREATE POLICY "Deny anonymous access to support_messages"
ON public.support_messages
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix get_push_subscriptions_decrypted to require admin authorization
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_decrypted()
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
SET search_path = public
AS $$
BEGIN
  -- Require admin role - CRITICAL security check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required to access push subscriptions';
  END IF;
  
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.endpoint,
    public.decrypt_push_data(ps.auth) as auth,
    public.decrypt_push_data(ps.p256dh) as p256dh,
    ps.is_active,
    ps.notification_time
  FROM public.push_subscriptions ps;
END;
$$;