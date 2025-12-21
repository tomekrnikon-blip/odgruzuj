-- Zaktualizuj funkcję get_admin_profiles aby obsługiwała oba formaty szyfrowania
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
 RETURNS TABLE(id uuid, user_id uuid, display_name text, email text, user_number integer, subscription_status subscription_status, subscription_expires_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    public.mask_email(
      CASE 
        WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
        WHEN p.email LIKE 'enc_%' THEN '***zaszyfrowany***'
        ELSE p.email
      END
    ) as email,
    p.user_number,
    p.subscription_status,
    p.subscription_expires_at,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND p.user_number IS NOT NULL
  ORDER BY p.user_number ASC
$function$;