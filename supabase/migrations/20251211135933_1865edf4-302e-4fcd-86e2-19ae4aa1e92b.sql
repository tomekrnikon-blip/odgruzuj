-- Drop the misleading policy that suggests admin access but actually restricts to own profile
DROP POLICY IF EXISTS "Admins can view all profiles via view only" ON public.profiles;

-- The existing "Users can view their own profile" policy already correctly restricts access
-- Admins should use get_admin_profiles() function which masks emails