-- Remove overly permissive policies that allow any authenticated user to access all data
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for push_subscriptions" ON public.push_subscriptions;

-- The existing policies are sufficient:
-- profiles: "Users can view own profile only" (SELECT where auth.uid() = user_id)
-- push_subscriptions: "Block client SELECT on push subscriptions" (SELECT returns false - blocked)