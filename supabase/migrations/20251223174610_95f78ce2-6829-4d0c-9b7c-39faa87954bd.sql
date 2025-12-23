-- Create secure function for deleting push subscriptions
CREATE OR REPLACE FUNCTION public.delete_user_push_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user must be authenticated';
  END IF;
  
  DELETE FROM public.push_subscriptions 
  WHERE user_id = auth.uid();
END;
$$;

-- Create secure function for updating notification time
CREATE OR REPLACE FUNCTION public.update_notification_time(p_time time)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user must be authenticated';
  END IF;
  
  UPDATE public.push_subscriptions 
  SET notification_time = p_time, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Remove all client-side access policies and keep only server-side access
-- First drop all existing policies
DROP POLICY IF EXISTS "Block anonymous access to push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Block client SELECT on push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions safely" ON public.push_subscriptions;

-- Create single restrictive policy that blocks ALL client access
-- All operations should go through SECURITY DEFINER functions
CREATE POLICY "Block all client access to push_subscriptions"
ON public.push_subscriptions
FOR ALL
USING (false)
WITH CHECK (false);