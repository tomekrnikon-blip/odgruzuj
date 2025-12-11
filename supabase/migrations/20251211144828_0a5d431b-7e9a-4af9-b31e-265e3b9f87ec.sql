-- Drop and recreate get_admin_profiles with user_number
DROP FUNCTION IF EXISTS public.get_admin_profiles();

CREATE FUNCTION public.get_admin_profiles()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  user_number integer,
  subscription_status subscription_status,
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
    public.mask_email(
      CASE 
        WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
        ELSE p.email
      END
    ) as email,
    p.user_number,
    p.subscription_status,
    p.subscription_expires_at,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
$$;