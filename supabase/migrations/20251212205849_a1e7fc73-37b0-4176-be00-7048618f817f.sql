-- Add platform column to push_subscriptions table
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

-- Add comment for clarity
COMMENT ON COLUMN public.push_subscriptions.platform IS 'Platform type: web, android, ios';