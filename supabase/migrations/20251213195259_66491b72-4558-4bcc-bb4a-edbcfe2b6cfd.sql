-- Remove duplicate trigger - keep only one
DROP TRIGGER IF EXISTS distribute_notification_trigger ON public.notifications;

-- Update distribute_notification function to use ON CONFLICT for safety
CREATE OR REPLACE FUNCTION public.distribute_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, notification_id)
  SELECT p.user_id, NEW.id
  FROM public.profiles p
  WHERE p.user_number IS NOT NULL  -- Only confirmed users
  ON CONFLICT (user_id, notification_id) DO NOTHING;  -- Prevent duplicate errors
  RETURN NEW;
END;
$$;