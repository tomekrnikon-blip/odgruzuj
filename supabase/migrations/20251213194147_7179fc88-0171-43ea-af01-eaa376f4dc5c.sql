-- Add WITH CHECK to profiles UPDATE policy for users
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add WITH CHECK to user_flashcards UPDATE policy
DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.user_flashcards;
CREATE POLICY "Users can update their own flashcards" 
ON public.user_flashcards 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add WITH CHECK to user_notifications UPDATE policy
DROP POLICY IF EXISTS "Users can update their notifications" ON public.user_notifications;
CREATE POLICY "Users can update their notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add WITH CHECK to user_progress UPDATE policy
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
CREATE POLICY "Users can update their own progress" 
ON public.user_progress 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);