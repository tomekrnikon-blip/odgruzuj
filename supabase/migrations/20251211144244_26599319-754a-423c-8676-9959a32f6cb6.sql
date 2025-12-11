-- Create function to prevent removal of admin role from protected user
CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_email text := 'tomekrnikon@gmail.com';
  user_email text;
BEGIN
  -- Get the email of the user whose role is being deleted
  SELECT 
    CASE 
      WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
      ELSE p.email
    END INTO user_email
  FROM public.profiles p
  WHERE p.user_id = OLD.user_id;
  
  -- Prevent deletion of admin role for protected user
  IF user_email = protected_email AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot remove admin role from protected user: %', protected_email;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger to protect admin role
DROP TRIGGER IF EXISTS protect_admin_role_trigger ON public.user_roles;
CREATE TRIGGER protect_admin_role_trigger
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_role();