
-- Create function to check if encryption key exists in vault
CREATE OR REPLACE FUNCTION public.check_vault_key_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'PUSH_ENCRYPTION_KEY'
  );
END;
$$;

-- Create function to setup encryption key in vault (super admin only via edge function)
CREATE OR REPLACE FUNCTION public.setup_encryption_key_in_vault(p_key_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is called from edge function with service role
  -- Insert or update the key in vault
  INSERT INTO vault.secrets (name, secret)
  VALUES ('PUSH_ENCRYPTION_KEY', p_key_value)
  ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
END;
$$;

-- Revoke public access
REVOKE EXECUTE ON FUNCTION public.check_vault_key_exists() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.setup_encryption_key_in_vault(text) FROM public, anon;

-- Grant only to service_role (edge functions)
GRANT EXECUTE ON FUNCTION public.check_vault_key_exists() TO service_role;
GRANT EXECUTE ON FUNCTION public.setup_encryption_key_in_vault(text) TO service_role;
