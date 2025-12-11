-- Fix the mask_email function with proper search_path
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN email IS NULL THEN NULL
      WHEN LENGTH(SPLIT_PART(email, '@', 1)) <= 4 THEN 
        REPEAT('*', LENGTH(SPLIT_PART(email, '@', 1))) || '@' || SPLIT_PART(email, '@', 2)
      ELSE 
        LEFT(SPLIT_PART(email, '@', 1), 4) || REPEAT('*', LENGTH(SPLIT_PART(email, '@', 1)) - 4) || '@' || SPLIT_PART(email, '@', 2)
    END
$$;

-- Drop the old view
DROP VIEW IF EXISTS public.admin_profiles_view;

-- Create a secure function for admins to get profiles with masked emails
-- This is more secure than a SECURITY DEFINER view
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  subscription_status subscription_status,
  subscription_expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    public.mask_email(p.email) as email,
    p.subscription_status,
    p.subscription_expires_at,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
$$;