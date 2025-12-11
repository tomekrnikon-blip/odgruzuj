-- Create a function to mask email addresses
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
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

-- Create a secure view for admins with masked emails
CREATE OR REPLACE VIEW public.admin_profiles_view AS
SELECT 
  id,
  user_id,
  display_name,
  public.mask_email(email) as email,
  subscription_status,
  subscription_expires_at,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.admin_profiles_view TO authenticated;

-- Drop the existing admin select policy on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy that only allows admins to view profiles through their own user_id
-- Admins must use the admin_profiles_view for viewing all users
CREATE POLICY "Admins can view all profiles via view only"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Note: The "Users can view their own profile" policy already exists and handles user self-access