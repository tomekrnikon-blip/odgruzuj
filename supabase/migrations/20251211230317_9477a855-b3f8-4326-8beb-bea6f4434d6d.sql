-- Update encryption functions to read key from Vault secrets instead of session settings

-- Update encrypt_email to use Vault
CREATE OR REPLACE FUNCTION public.encrypt_email(plain_email text)
RETURNS text
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

-- Update decrypt_email to use Vault
CREATE OR REPLACE FUNCTION public.decrypt_email(encrypted_email text)
RETURNS text
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
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_email;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_email, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN encrypted_email;
  END;
END;
$$;

-- Update encrypt_push_data to use Vault
CREATE OR REPLACE FUNCTION public.encrypt_push_data(plain_text text)
RETURNS text
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
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
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

-- Update decrypt_push_data to use Vault
CREATE OR REPLACE FUNCTION public.decrypt_push_data(encrypted_text text)
RETURNS text
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
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_text;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN encrypted_text;
  END;
END;
$$;

-- Update encrypt_profile_email trigger function to use Vault
CREATE OR REPLACE FUNCTION public.encrypt_profile_email()
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
    -- Check if email looks like it needs encryption (not base64 encoded pgp data)
    IF NEW.email IS NOT NULL AND NOT NEW.email LIKE 'wy4%' THEN
      NEW.email := public.encrypt_email(NEW.email);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update encrypt_push_subscription_keys trigger function to use Vault  
CREATE OR REPLACE FUNCTION public.encrypt_push_subscription_keys()
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
    -- Check if auth looks like it needs encryption
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