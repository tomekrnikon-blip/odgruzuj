-- supabase/migrations/20240722140000_add_platform_to_subscriptions.sql

-- Add a platform column to distinguish between web, android, and ios tokens
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add a unique constraint to prevent duplicate tokens for the same user and platform
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT unique_user_platform_endpoint UNIQUE (user_id, platform, endpoint);
