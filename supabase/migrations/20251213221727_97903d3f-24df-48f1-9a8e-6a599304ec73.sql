-- Add RESTRICTIVE policies that explicitly block anonymous access
-- These policies MUST pass (in addition to permissive policies) for access to be granted

-- Profiles - contains emails and subscription data
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Support messages - contains user emails and messages  
CREATE POLICY "Block anonymous access to support_messages"
ON public.support_messages
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Push subscriptions - contains sensitive push credentials
CREATE POLICY "Block anonymous access to push_subscriptions"
ON public.push_subscriptions
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- User flashcards - user-specific content
CREATE POLICY "Block anonymous access to user_flashcards"
ON public.user_flashcards
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Completed tasks - user activity data
CREATE POLICY "Block anonymous access to completed_tasks"
ON public.completed_tasks
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- User progress - gamification data
CREATE POLICY "Block anonymous access to user_progress"
ON public.user_progress
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- User notifications - private notifications
CREATE POLICY "Block anonymous access to user_notifications"
ON public.user_notifications
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Shopping list - private user data
CREATE POLICY "Block anonymous access to shopping_list"
ON public.shopping_list
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);