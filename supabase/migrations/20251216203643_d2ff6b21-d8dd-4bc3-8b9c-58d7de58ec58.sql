-- Grant execute permission on has_role to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Also grant to anon for public RLS checks (some policies might need this)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;