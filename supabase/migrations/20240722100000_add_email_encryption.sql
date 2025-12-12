-- supabase/migrations/20240722100000_add_email_encryption.sql

-- 1. Create a table to store encrypted emails
CREATE TABLE IF NOT EXISTS encrypted_emails (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_email TEXT NOT NULL
);

-- 2. Create a function to handle the encryption
CREATE OR REPLACE FUNCTION handle_new_user_email_encryption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- For demonstration, this uses a simple (and not secure) encryption method.
    -- For production, you should use pgsodium with a securely managed key.
    -- This example uses a placeholder key. REPLACE 'your-super-secret-key' with a real, securely stored key.
    INSERT INTO public.encrypted_emails (user_id, encrypted_email)
    VALUES (NEW.id, pgp_sym_encrypt(NEW.email, 'your-super-secret-key'))
    ON CONFLICT (user_id) DO UPDATE
    SET encrypted_email = pgp_sym_encrypt(NEW.email, 'your-super-secret-key');

    RETURN NEW;
END;
$$;

-- 3. Create a trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_new_user_created_encrypt_email ON auth.users;
CREATE TRIGGER on_new_user_created_encrypt_email
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_email_encryption();
