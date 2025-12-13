-- Update RLS policies for categories to allow moderators
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins and moderators can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Update RLS policies for global_flashcards to allow moderators
DROP POLICY IF EXISTS "Admins can manage global flashcards" ON public.global_flashcards;
CREATE POLICY "Admins and moderators can manage global flashcards" 
ON public.global_flashcards 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));