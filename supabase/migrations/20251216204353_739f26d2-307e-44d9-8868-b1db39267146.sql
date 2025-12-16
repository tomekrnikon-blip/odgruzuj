-- Drop the current policy that allows all authenticated users
DROP POLICY IF EXISTS "Authenticated users can read stripe config" ON public.stripe_config;

-- Create new policy that restricts SELECT to admin only
CREATE POLICY "admin_only_select" ON public.stripe_config 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));