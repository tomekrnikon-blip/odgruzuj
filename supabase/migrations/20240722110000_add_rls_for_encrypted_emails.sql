-- supabase/migrations/20240722110000_add_rls_for_encrypted_emails.sql

-- 1. Enable RLS on the encrypted_emails table
ALTER TABLE public.encrypted_emails ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that denies all access by default
-- (Implicitly done by enabling RLS)

-- 3. Create a policy that allows admins to access the data
CREATE POLICY "Admins can access encrypted emails"
ON public.encrypted_emails
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
