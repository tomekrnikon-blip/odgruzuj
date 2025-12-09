-- FIX CRITICAL SECURITY ISSUES

-- 1. Add authentication requirement to profiles table (block anonymous access)
CREATE POLICY "Require authentication to view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. Add DELETE policy for profiles (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Add authentication requirement to push_subscriptions (block anonymous access)  
CREATE POLICY "Require authentication for push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Add authentication requirement to support_messages
CREATE POLICY "Require authentication for support messages"
ON public.support_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. Add missing user_flashcards policies for regular users
CREATE POLICY "Users can insert their own flashcards"
ON public.user_flashcards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
ON public.user_flashcards
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
ON public.user_flashcards
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Add missing completed_tasks policies
CREATE POLICY "Users can update their completed tasks"
ON public.completed_tasks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their completed tasks"
ON public.completed_tasks
FOR DELETE
USING (auth.uid() = user_id);

-- 7. Add missing user_notifications DELETE policy
CREATE POLICY "Users can delete their notifications"
ON public.user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- 8. Add missing user_progress DELETE policy
CREATE POLICY "Users can delete their progress"
ON public.user_progress
FOR DELETE
USING (auth.uid() = user_id);