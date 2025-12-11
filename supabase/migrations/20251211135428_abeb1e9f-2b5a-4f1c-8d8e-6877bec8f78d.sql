-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to encrypt push subscription data
CREATE OR REPLACE FUNCTION public.encrypt_push_data(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from vault or use a default for migration
  encryption_key := current_setting('app.push_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    -- Return plain text if no key available (for migration purposes)
    RETURN plain_text;
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      plain_text,
      encryption_key,
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- Create function to decrypt push subscription data
CREATE OR REPLACE FUNCTION public.decrypt_push_data(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key
  encryption_key := current_setting('app.push_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    -- Return as-is if no key (data might not be encrypted)
    RETURN encrypted_text;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    -- If decryption fails, return original (might not be encrypted)
    RETURN encrypted_text;
  END;
END;
$$;

-- Create secure function to get push subscriptions for edge functions
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_decrypted()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  endpoint text,
  auth text,
  p256dh text,
  is_active boolean,
  notification_time time without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.endpoint,
    public.decrypt_push_data(ps.auth) as auth,
    public.decrypt_push_data(ps.p256dh) as p256dh,
    ps.is_active,
    ps.notification_time
  FROM public.push_subscriptions ps;
END;
$$;