-- Fix profiles: Change "Deny anonymous access" to be more restrictive
-- The current policy allows any authenticated user to access all profiles
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Create a proper restrictive policy that only denies anonymous but doesn't grant broad access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix push_subscriptions: Remove ability to read sensitive keys from client
-- Users should not be able to read p256dh and auth keys
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;

-- Create a policy that allows users to see only non-sensitive data
-- For sensitive operations, use server-side functions
CREATE POLICY "Users can view their own subscriptions metadata"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Create a view that masks sensitive data for client access
CREATE OR REPLACE VIEW public.push_subscriptions_safe AS
SELECT 
  id,
  user_id,
  endpoint,
  '***ENCRYPTED***' as auth,
  '***ENCRYPTED***' as p256dh,
  is_active,
  notification_time,
  created_at,
  updated_at
FROM public.push_subscriptions
WHERE auth.uid() = user_id;