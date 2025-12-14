
-- Update get_push_subscriptions_decrypted to only allow super admin (user #1)
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_decrypted()
RETURNS TABLE(id uuid, user_id uuid, endpoint text, auth text, p256dh text, is_active boolean, notification_time time without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_user_number integer;
BEGIN
  -- Require admin role - CRITICAL security check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required to access push subscriptions';
  END IF;
  
  -- Additional check: only super admin (user #1) can access decrypted credentials
  SELECT user_number INTO caller_user_number
  FROM public.profiles
  WHERE profiles.user_id = auth.uid();
  
  IF caller_user_number IS NULL OR caller_user_number != 1 THEN
    RAISE EXCEPTION 'Unauthorized: only super admin can access decrypted push credentials';
  END IF;
  
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.endpoint,
    public.decrypt_push_data(ps.auth) as auth,
    public.decrypt_push_data(ps.p256dh) as p256dh,
    ps.is_active,
    ps.notification_time
  FROM public.push_subscriptions ps;
END;
$$;

-- Create audit function for tracking access to sensitive data
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(p_resource_type text, p_resource_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive data
  INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'SENSITIVE_DATA_ACCESS',
    p_resource_type,
    p_resource_id,
    jsonb_build_object('accessed_at', now(), 'resource_type', p_resource_type)
  );
END;
$$;

-- Create a more secure version that logs access
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_decrypted_with_audit()
RETURNS TABLE(id uuid, user_id uuid, endpoint text, auth text, p256dh text, is_active boolean, notification_time time without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_user_number integer;
BEGIN
  -- Require admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  -- Only super admin (user #1) can access
  SELECT user_number INTO caller_user_number
  FROM public.profiles
  WHERE profiles.user_id = auth.uid();
  
  IF caller_user_number IS NULL OR caller_user_number != 1 THEN
    RAISE EXCEPTION 'Unauthorized: only super admin can access decrypted push credentials';
  END IF;
  
  -- Log this sensitive access
  PERFORM public.log_sensitive_data_access('push_subscriptions');
  
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.endpoint,
    public.decrypt_push_data(ps.auth) as auth,
    public.decrypt_push_data(ps.p256dh) as p256dh,
    ps.is_active,
    ps.notification_time
  FROM public.push_subscriptions ps;
END;
$$;

-- Revoke execute from public/anon on sensitive functions
REVOKE EXECUTE ON FUNCTION public.get_push_subscriptions_decrypted() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_push_subscriptions_decrypted_with_audit() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_push_data(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.encrypt_push_data(text) FROM public, anon;

-- Grant only to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_decrypted() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_decrypted_with_audit() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_push_data(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_push_data(text) TO service_role;
