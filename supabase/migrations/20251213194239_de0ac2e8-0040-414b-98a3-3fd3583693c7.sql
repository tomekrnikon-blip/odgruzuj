-- Create the missing save_and_encrypt_subscription function
CREATE OR REPLACE FUNCTION public.save_and_encrypt_subscription(
  p_platform text,
  p_endpoint text,
  p_p256dh_plaintext text,
  p_auth_plaintext text,
  p_notification_time time
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user must be authenticated';
  END IF;
  
  -- Insert or update subscription with encrypted sensitive data
  INSERT INTO public.push_subscriptions (
    user_id, 
    platform, 
    endpoint, 
    p256dh, 
    auth, 
    notification_time,
    is_active
  )
  VALUES (
    auth.uid(), 
    p_platform, 
    p_endpoint, 
    public.encrypt_push_data(p_p256dh_plaintext), 
    public.encrypt_push_data(p_auth_plaintext), 
    p_notification_time,
    true
  )
  ON CONFLICT (user_id, endpoint) DO UPDATE
  SET 
    p256dh = public.encrypt_push_data(p_p256dh_plaintext),
    auth = public.encrypt_push_data(p_auth_plaintext),
    notification_time = EXCLUDED.notification_time, 
    is_active = true, 
    updated_at = now();
END;
$$;

-- Add unique constraint if not exists (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_user_endpoint_unique'
  ) THEN
    ALTER TABLE public.push_subscriptions 
    ADD CONSTRAINT push_subscriptions_user_endpoint_unique 
    UNIQUE (user_id, endpoint);
  END IF;
END $$;