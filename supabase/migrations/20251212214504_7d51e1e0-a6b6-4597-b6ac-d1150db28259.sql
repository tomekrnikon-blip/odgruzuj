-- Funkcja do deszyfrowania z podanym kluczem
CREATE OR REPLACE FUNCTION public.decrypt_with_custom_key(encrypted_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_text IS NULL OR encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_text;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Funkcja do szyfrowania z podanym kluczem
CREATE OR REPLACE FUNCTION public.encrypt_with_custom_key(plain_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF plain_text IS NULL OR encryption_key IS NULL OR encryption_key = '' THEN
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