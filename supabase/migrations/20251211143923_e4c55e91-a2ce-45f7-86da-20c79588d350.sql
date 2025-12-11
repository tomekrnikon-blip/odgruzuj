-- Add explicit SELECT policy for profiles that restricts to own profile
CREATE POLICY "Users can only select their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- For push_subscriptions, we intentionally have NO SELECT policy
-- This means no one can read the sensitive data via direct queries
-- Admin uses get_push_subscriptions_decrypted() function instead
-- Add a comment to document this design decision
COMMENT ON TABLE public.push_subscriptions IS 'No SELECT policy by design - sensitive keys should only be accessed via get_push_subscriptions_decrypted() function by admins';