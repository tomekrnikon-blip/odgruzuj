-- Drop the blocking policy that prevents admin operations
DROP POLICY IF EXISTS "Block direct role modifications" ON public.user_roles;

-- Create a new policy that allows admins and service role to manage roles
CREATE POLICY "Only admins can modify roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));