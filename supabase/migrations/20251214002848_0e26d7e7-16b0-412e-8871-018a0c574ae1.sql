
-- 1. Drop existing RLS policies on profiles to recreate them more strictly
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate with stricter conditions
CREATE POLICY "Users can ONLY view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles via function only"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Drop and recreate support_messages policies to be more restrictive
DROP POLICY IF EXISTS "Users can view their own messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;

-- Users can ONLY see their own messages - strict user_id matching
CREATE POLICY "Users can ONLY view their own support messages"
ON public.support_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Admins access support messages ONLY through the secure function
-- Block direct admin SELECT - force use of get_support_messages_for_admin()
CREATE POLICY "Admins must use secure function for support messages"
ON public.support_messages
FOR SELECT
USING (false); -- Admins use get_support_messages_for_admin() function instead

-- 3. Create trigger to encrypt user_email in support_messages
CREATE OR REPLACE FUNCTION public.encrypt_support_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'PUSH_ENCRYPTION_KEY'
  LIMIT 1;
  
  -- Only encrypt if key is available and data looks unencrypted
  IF encryption_key IS NOT NULL AND encryption_key != '' THEN
    IF NEW.user_email IS NOT NULL AND NOT NEW.user_email LIKE 'wy4%' THEN
      NEW.user_email := public.encrypt_email(NEW.user_email);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic email encryption on support messages
DROP TRIGGER IF EXISTS encrypt_support_message_email_trigger ON public.support_messages;
CREATE TRIGGER encrypt_support_message_email_trigger
BEFORE INSERT OR UPDATE ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_support_message_email();

-- 4. Update get_support_messages_for_admin to handle encrypted emails properly
CREATE OR REPLACE FUNCTION public.get_support_messages_for_admin()
RETURNS TABLE(id uuid, user_id uuid, user_email text, message text, is_read boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Decrypt email if encrypted, then mask it for admin view
    public.mask_email(
      CASE 
        WHEN sm.user_email LIKE 'wy4%' THEN public.decrypt_email(sm.user_email)
        ELSE sm.user_email
      END
    ) as user_email,
    sm.message,
    sm.is_read,
    sm.created_at
  FROM public.support_messages sm
  ORDER BY sm.created_at DESC;
END;
$$;

-- 5. Create function for admin to get full email when needed for reply
CREATE OR REPLACE FUNCTION public.get_support_message_email_for_reply(p_message_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Get and decrypt email
  SELECT 
    CASE 
      WHEN sm.user_email LIKE 'wy4%' THEN public.decrypt_email(sm.user_email)
      ELSE sm.user_email
    END INTO full_email
  FROM public.support_messages sm
  WHERE sm.id = p_message_id;
  
  RETURN full_email;
END;
$$;

-- Revoke execute from public/anon
REVOKE EXECUTE ON FUNCTION public.get_support_messages_for_admin() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_support_message_email_for_reply(uuid) FROM public, anon;

-- Grant only to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.get_support_messages_for_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_support_message_email_for_reply(uuid) TO authenticated, service_role;

-- 6. Encrypt existing unencrypted emails in support_messages
DO $$
DECLARE
  rec RECORD;
  encrypted_email text;
BEGIN
  FOR rec IN 
    SELECT id, user_email 
    FROM public.support_messages 
    WHERE user_email IS NOT NULL 
    AND user_email NOT LIKE 'wy4%'
  LOOP
    encrypted_email := public.encrypt_email(rec.user_email);
    UPDATE public.support_messages 
    SET user_email = encrypted_email 
    WHERE id = rec.id;
  END LOOP;
END $$;
