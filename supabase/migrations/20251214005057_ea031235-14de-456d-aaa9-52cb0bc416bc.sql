
-- Create function to update profile email bypassing trigger
CREATE OR REPLACE FUNCTION public.update_profile_email_encrypted(p_profile_id uuid, p_encrypted_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct update bypassing the encrypt trigger (email is already encrypted)
  UPDATE public.profiles
  SET email = p_encrypted_email, updated_at = now()
  WHERE id = p_profile_id;
END;
$$;

-- Grant only to service_role
REVOKE EXECUTE ON FUNCTION public.update_profile_email_encrypted(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_email_encrypted(uuid, text) TO service_role;

-- Also create a function to decrypt emails for display (using the key from env)
CREATE OR REPLACE FUNCTION public.decrypt_email_with_key(encrypted_email text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If email starts with enc_ it's encrypted with Web Crypto, return as-is (needs edge function to decrypt)
  -- If email starts with wy4 it's pgcrypto encrypted
  IF encrypted_email LIKE 'wy4%' THEN
    BEGIN
      RETURN pgp_sym_decrypt(
        decode(encrypted_email, 'base64'),
        encryption_key
      );
    EXCEPTION WHEN OTHERS THEN
      RETURN encrypted_email;
    END;
  ELSIF encrypted_email LIKE 'enc_%' THEN
    -- Web Crypto encrypted - cannot decrypt in SQL, return masked
    RETURN '***encrypted***';
  ELSE
    RETURN encrypted_email;
  END IF;
END;
$$;

-- Grant only to service_role
REVOKE EXECUTE ON FUNCTION public.decrypt_email_with_key(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_email_with_key(text, text) TO service_role;
