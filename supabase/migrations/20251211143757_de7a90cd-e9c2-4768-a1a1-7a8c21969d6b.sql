-- Remove SELECT policy from push_subscriptions - clients don't need to read sensitive keys
DROP POLICY IF EXISTS "Users can view their own subscriptions metadata" ON public.push_subscriptions;

-- Create a function to check subscription status without exposing keys
CREATE OR REPLACE FUNCTION public.check_push_subscription_status(p_user_id uuid)
RETURNS TABLE(
  is_active boolean,
  notification_time time without time zone,
  has_subscription boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Users can only check their own subscription
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only check own subscription status';
  END IF;
  
  RETURN QUERY
  SELECT 
    ps.is_active,
    ps.notification_time,
    true as has_subscription
  FROM public.push_subscriptions ps
  WHERE ps.user_id = p_user_id
  LIMIT 1;
  
  -- If no rows returned, return a "no subscription" row
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::boolean, NULL::time, false;
  END IF;
END;
$$;