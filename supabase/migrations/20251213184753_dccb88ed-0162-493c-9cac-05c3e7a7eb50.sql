-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their completed tasks" ON public.completed_tasks;

-- Create new UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Users can update their completed tasks" 
ON public.completed_tasks 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);