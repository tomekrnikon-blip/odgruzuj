-- Create function to hash IP addresses using SHA-256
CREATE OR REPLACE FUNCTION public.hash_ip_address(ip_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ip_address IS NULL OR ip_address = '' THEN
    RETURN NULL;
  END IF;
  
  -- Hash IP with SHA-256 and return first 16 chars for readability
  RETURN substring(encode(digest(ip_address, 'sha256'), 'hex') from 1 for 16);
END;
$$;

-- Update log_admin_activity to accept and hash IP address
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_admin_user_id uuid,
  p_action_type text,
  p_target_table text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT public.has_role(p_admin_user_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admins can log activity';
  END IF;
  
  INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_table, target_id, details, ip_address)
  VALUES (
    p_admin_user_id, 
    p_action_type, 
    p_target_table, 
    p_target_id, 
    p_details, 
    public.hash_ip_address(p_ip_address)  -- Hash the IP before storing
  );
END;
$$;