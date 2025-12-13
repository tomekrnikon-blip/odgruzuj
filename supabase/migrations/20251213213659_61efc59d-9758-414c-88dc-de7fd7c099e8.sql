-- Revoke execute permission from public and anon roles to prevent unauthorized access
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Grant to service_role for edge functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- Ensure user_roles table has RLS enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to recreate them properly
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only service role can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create restrictive RLS policies for user_roles table
-- Users can only view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Block direct INSERT/UPDATE/DELETE from authenticated users
-- Only service role (backend/edge functions) can modify roles
CREATE POLICY "Block direct role modifications"
ON public.user_roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Service role has full access (for admin operations via edge functions)
CREATE POLICY "Service role full access"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);