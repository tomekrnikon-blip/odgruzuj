-- Drop the overly permissive SELECT policy on notifications
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;

-- Create a restrictive policy - users can only see notifications that are linked to them via user_notifications
CREATE POLICY "Users can only view their assigned notifications"
ON public.notifications
FOR SELECT
USING (
  -- Admins can see all notifications
  public.has_role(auth.uid(), 'admin')
  OR
  -- Regular users can only see notifications assigned to them via user_notifications
  EXISTS (
    SELECT 1 FROM public.user_notifications un
    WHERE un.notification_id = id
    AND un.user_id = auth.uid()
  )
);