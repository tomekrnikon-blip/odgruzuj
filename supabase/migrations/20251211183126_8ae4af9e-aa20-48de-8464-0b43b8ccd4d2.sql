-- 1. Create admin activity logging table for monitoring
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_table text,
  target_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view activity logs"
ON public.admin_activity_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only server-side functions can insert logs (via SECURITY DEFINER)
CREATE POLICY "Block direct insert to activity logs"
ON public.admin_activity_logs
FOR INSERT
WITH CHECK (false);

-- 2. Create function to log admin activity (called from edge functions)
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_admin_user_id uuid,
  p_action_type text,
  p_target_table text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT public.has_role(p_admin_user_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admins can log activity';
  END IF;
  
  INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_table, target_id, details)
  VALUES (p_admin_user_id, p_action_type, p_target_table, p_target_id, p_details);
END;
$$;

-- 3. Create function to get support message with decrypted email (for admin only)
CREATE OR REPLACE FUNCTION public.get_support_messages_for_admin()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  message text,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    sm.id,
    sm.user_id,
    -- Get email from profiles and decrypt if encrypted
    COALESCE(
      (SELECT 
        CASE 
          WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
          ELSE p.email
        END
      FROM public.profiles p WHERE p.user_id = sm.user_id),
      sm.user_email -- fallback to stored email for old records
    ) as user_email,
    sm.message,
    sm.is_read,
    sm.created_at
  FROM public.support_messages sm
  ORDER BY sm.created_at DESC;
END;
$$;

-- 4. Add constraint for message length validation
ALTER TABLE public.support_messages 
ADD CONSTRAINT support_messages_message_length 
CHECK (char_length(message) >= 1 AND char_length(message) <= 2000);

-- 5. Add index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at 
ON public.admin_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_user_id 
ON public.admin_activity_logs(admin_user_id);