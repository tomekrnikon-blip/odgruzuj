-- Add target_user_id column to notifications table for direct messages
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Replace the distribute_notification trigger function to respect target_user_id
CREATE OR REPLACE FUNCTION public.distribute_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.target_user_id IS NOT NULL THEN
    -- Direct notification to specific user only
    INSERT INTO public.user_notifications (user_id, notification_id)
    VALUES (NEW.target_user_id, NEW.id)
    ON CONFLICT (user_id, notification_id) DO NOTHING;
  ELSE
    -- Broadcast to all confirmed users
    INSERT INTO public.user_notifications (user_id, notification_id)
    SELECT p.user_id, NEW.id
    FROM public.profiles p
    WHERE p.user_number IS NOT NULL
    ON CONFLICT (user_id, notification_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;