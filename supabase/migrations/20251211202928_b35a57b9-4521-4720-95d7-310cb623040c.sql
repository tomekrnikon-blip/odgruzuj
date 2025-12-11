
-- Re-create the distribute_notification trigger that sends notifications to all users
CREATE OR REPLACE FUNCTION public.distribute_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, notification_id)
  SELECT p.user_id, NEW.id
  FROM public.profiles p;
  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS distribute_notification_trigger ON public.notifications;
CREATE TRIGGER distribute_notification_trigger
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.distribute_notification();
