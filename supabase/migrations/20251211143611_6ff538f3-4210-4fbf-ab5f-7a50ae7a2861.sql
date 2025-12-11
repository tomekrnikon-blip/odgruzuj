-- Remove the security definer view (security risk)
DROP VIEW IF EXISTS public.push_subscriptions_safe;

-- Instead, we'll rely on the existing RLS policy
-- The client code should be updated to not query auth/p256dh columns
-- For admin operations, use the get_push_subscriptions_decrypted() function