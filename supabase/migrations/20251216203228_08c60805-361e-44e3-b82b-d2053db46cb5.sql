-- Drop the overly permissive policy that allows anyone to read
DROP POLICY IF EXISTS "Anyone can read stripe config" ON public.stripe_config;

-- Create new policy that requires authentication for reading
CREATE POLICY "Authenticated users can read stripe config" 
ON public.stripe_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);