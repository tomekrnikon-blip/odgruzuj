-- supabase/migrations/20240722130000_secure_cleanup_cron_job.sql

-- 1. Unschedule the old, insecure cron job if it exists
SELECT cron.unschedule('cleanup-unconfirmed-users-hourly');

-- 2. Create a new, secure cron job
-- This version calls the function internally and securely authenticates using the service_role key.
SELECT cron.schedule(
  'cleanup-unconfirmed-users-hourly',
  '0 * * * * ', -- Run every hour
  $$
    SELECT net.http_post(
      url:= 'https://skadrakhzwdmxlmbgent.supabase.co/functions/v1/cleanup-unconfirmed-users',
      headers:= jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_key', true)
      ),
      body:= '{}'::jsonb
    )
  $$
);
