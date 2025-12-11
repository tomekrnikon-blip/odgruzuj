-- Create trigger function to automatically encrypt push subscription keys on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_push_subscription_keys()
RETURNS TRIGGER
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
    -- Check if auth looks like it needs encryption (not base64 encoded pgp data)
    IF NEW.auth IS NOT NULL AND NOT NEW.auth LIKE 'wy4%' THEN
      NEW.auth := public.encrypt_push_data(NEW.auth);
    END IF;
    
    -- Check if p256dh looks like it needs encryption
    IF NEW.p256dh IS NOT NULL AND NOT NEW.p256dh LIKE 'wy4%' THEN
      NEW.p256dh := public.encrypt_push_data(NEW.p256dh);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for push_subscriptions
DROP TRIGGER IF EXISTS encrypt_push_keys_trigger ON public.push_subscriptions;
CREATE TRIGGER encrypt_push_keys_trigger
  BEFORE INSERT OR UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_push_subscription_keys();

-- Create function to encrypt email addresses
CREATE OR REPLACE FUNCTION public.encrypt_email(plain_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := current_setting('app.push_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN plain_email;
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      plain_email,
      encryption_key,
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- Create function to decrypt email addresses (only for authorized use)
CREATE OR REPLACE FUNCTION public.decrypt_email(encrypted_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := current_setting('app.push_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_email;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_email, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    -- If decryption fails, return original (might not be encrypted)
    RETURN encrypted_email;
  END;
END;
$$;

-- Create secure function to get user email for admin operations (like sending support replies)
CREATE OR REPLACE FUNCTION public.get_user_email_for_admin(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Only allow admins to call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  SELECT 
    CASE 
      WHEN email LIKE 'wy4%' THEN public.decrypt_email(email)
      ELSE email
    END INTO user_email
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  RETURN user_email;
END;
$$;

-- Update get_admin_profiles to work with potentially encrypted emails
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  subscription_status subscription_status,
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    public.mask_email(
      CASE 
        WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
        ELSE p.email
      END
    ) as email,
    p.subscription_status,
    p.subscription_expires_at,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
$$;