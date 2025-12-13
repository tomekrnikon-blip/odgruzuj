-- Drop the old version of log_admin_activity without p_ip_address parameter
DROP FUNCTION IF EXISTS public.log_admin_activity(uuid, text, text, uuid, jsonb);