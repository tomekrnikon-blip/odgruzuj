-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can only view their assigned notifications" ON public.notifications;

-- Create the corrected policy with proper JOIN condition
CREATE POLICY "Users can only view their assigned notifications"
ON public.notifications
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR EXISTS (
    SELECT 1
    FROM user_notifications un
    WHERE un.notification_id = notifications.id 
      AND un.user_id = auth.uid()
  )
);