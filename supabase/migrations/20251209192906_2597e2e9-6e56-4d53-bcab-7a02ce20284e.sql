-- Drop existing policies on user_flashcards
DROP POLICY IF EXISTS "Premium users can delete their flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Premium users can insert their flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Premium users can update their flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Premium users can view their flashcards" ON public.user_flashcards;

-- Create new admin-only policies for user_flashcards
CREATE POLICY "Admins can manage all user flashcards"
ON public.user_flashcards
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Users can only view their own flashcards (read-only)
CREATE POLICY "Users can view their own flashcards"
ON public.user_flashcards
FOR SELECT
USING (auth.uid() = user_id);