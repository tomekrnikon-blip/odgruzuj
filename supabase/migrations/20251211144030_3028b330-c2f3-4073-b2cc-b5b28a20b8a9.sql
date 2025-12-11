-- Clean up redundant profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only select their own profile" ON public.profiles;

-- Create single clear SELECT policy for profiles
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Create restrictive ALL policy for anonymous denial
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- For push_subscriptions: add a SELECT policy that explicitly blocks client reads
-- Only server-side functions (SECURITY DEFINER) can access the data
CREATE POLICY "Block client SELECT on push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (false);  -- Always deny SELECT via RLS, force use of server functions