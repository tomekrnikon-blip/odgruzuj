-- Drop the problematic policy that allows admins direct SELECT access
DROP POLICY IF EXISTS "Admins can view all profiles via function only" ON public.profiles;

-- Now admins can ONLY access profiles through get_admin_profiles() function
-- which returns masked emails via SECURITY DEFINER
-- Users can still view their own profile via "Users can ONLY view their own profile" policy