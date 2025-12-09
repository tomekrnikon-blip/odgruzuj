-- FIX REMAINING SECURITY ISSUES

-- 1. Drop overly permissive policies and keep only user-specific ones
DROP POLICY IF EXISTS "Require authentication to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Require authentication for support messages" ON public.support_messages;

-- 2. Fix user_notifications INSERT policy - only allow system (via trigger) or admins
DROP POLICY IF EXISTS "System can insert user notifications" ON public.user_notifications;

CREATE POLICY "Only admins can insert user notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Require authentication for notifications viewing
DROP POLICY IF EXISTS "Everyone can view notifications" ON public.notifications;

CREATE POLICY "Authenticated users can view notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Require authentication for categories viewing
DROP POLICY IF EXISTS "Everyone can view active categories" ON public.categories;

CREATE POLICY "Authenticated users can view active categories"
ON public.categories
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);