-- Update get_support_messages_for_admin to get email from profiles instead of support_messages
CREATE OR REPLACE FUNCTION public.get_support_messages_for_admin()
RETURNS TABLE(id uuid, user_id uuid, user_email text, message text, is_read boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require admin role - CRITICAL security check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  -- Log this sensitive access for audit
  PERFORM public.log_sensitive_data_access('support_messages');
  
  RETURN QUERY
  SELECT 
    sm.id,
    sm.user_id,
    -- Get email from profiles table instead of support_messages
    public.mask_email(
      CASE 
        WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
        ELSE p.email
      END
    ) as user_email,
    sm.message,
    sm.is_read,
    sm.created_at
  FROM public.support_messages sm
  JOIN public.profiles p ON p.user_id = sm.user_id
  ORDER BY sm.created_at DESC;
END;
$$;

-- Update get_support_message_email_for_reply to get email from profiles
CREATE OR REPLACE FUNCTION public.get_support_message_email_for_reply(p_message_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  full_email text;
  caller_user_number integer;
BEGIN
  -- Require admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  -- Only super admin can get full email for reply
  SELECT user_number INTO caller_user_number
  FROM public.profiles
  WHERE profiles.user_id = auth.uid();
  
  IF caller_user_number IS NULL OR caller_user_number != 1 THEN
    RAISE EXCEPTION 'Unauthorized: only super admin can access full email for reply';
  END IF;
  
  -- Log this sensitive access
  PERFORM public.log_sensitive_data_access('support_messages_email', p_message_id);
  
  -- Get email from profiles table via support_messages user_id
  SELECT 
    CASE 
      WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
      ELSE p.email
    END INTO full_email
  FROM public.support_messages sm
  JOIN public.profiles p ON p.user_id = sm.user_id
  WHERE sm.id = p_message_id;
  
  RETURN full_email;
END;
$$;

-- Drop the encryption trigger for support_messages since we won't store email there
DROP TRIGGER IF EXISTS encrypt_support_message_email_trigger ON public.support_messages;
DROP FUNCTION IF EXISTS public.encrypt_support_message_email();

-- Remove user_email column from support_messages
ALTER TABLE public.support_messages DROP COLUMN IF EXISTS user_email;