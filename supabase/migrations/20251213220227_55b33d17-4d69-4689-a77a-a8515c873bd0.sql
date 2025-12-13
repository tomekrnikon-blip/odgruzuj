-- Add authentication requirement policy for profiles table
CREATE POLICY "Require authentication for profiles" 
ON public.profiles 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add authentication requirement policy for push_subscriptions table  
CREATE POLICY "Require authentication for push_subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() IS NOT NULL);