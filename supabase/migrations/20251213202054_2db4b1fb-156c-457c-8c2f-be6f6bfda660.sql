-- Add INSERT policy for push_subscriptions via RPC function
-- The save_and_encrypt_subscription function runs with SECURITY DEFINER
-- but we need to allow the initial connection

-- First, let's check current policies and fix them
DROP POLICY IF EXISTS "Users can insert own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscription" ON public.push_subscriptions;

-- Create INSERT policy - users can only insert their own subscriptions
CREATE POLICY "Users can insert own push subscription"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy - users can only update their own subscriptions
CREATE POLICY "Users can update own push subscription"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy - users can only delete their own subscriptions
CREATE POLICY "Users can delete own push subscription"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);