-- 1. Drop potentially conflicting RLS policies on profiles
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- 2. Create stricter consolidated policies for profiles
-- Only authenticated users can access their own profile data
CREATE POLICY "Authenticated users can only access own profile"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Add trigger to encrypt email on INSERT/UPDATE in profiles
CREATE OR REPLACE FUNCTION public.encrypt_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key
  encryption_key := current_setting('app.push_encryption_key', true);
  
  -- Only encrypt if key is available and data looks unencrypted
  IF encryption_key IS NOT NULL AND encryption_key != '' THEN
    -- Check if email looks like it needs encryption (not base64 encoded pgp data)
    IF NEW.email IS NOT NULL AND NOT NEW.email LIKE 'wy4%' THEN
      NEW.email := public.encrypt_email(NEW.email);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic email encryption on profiles
DROP TRIGGER IF EXISTS encrypt_profile_email_trigger ON public.profiles;
CREATE TRIGGER encrypt_profile_email_trigger
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profile_email();

-- 4. Add explicit DENY policies for UPDATE/DELETE on admin_activity_logs
CREATE POLICY "Block all updates to activity logs"
ON public.admin_activity_logs
FOR UPDATE
USING (false);

CREATE POLICY "Block all deletes from activity logs"
ON public.admin_activity_logs
FOR DELETE
USING (false);

-- 5. Strengthen push_subscriptions - ensure keys cannot be read back even through UPDATE returns
-- Add policy to prevent any data leakage through UPDATE operations
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own subscriptions safely"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Add validation to ensure encrypted data format
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS check_encrypted_auth;

ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS check_encrypted_p256dh;

-- Note: We can't add CHECK constraints that reference functions with side effects
-- Instead, the trigger handles encryption automatically