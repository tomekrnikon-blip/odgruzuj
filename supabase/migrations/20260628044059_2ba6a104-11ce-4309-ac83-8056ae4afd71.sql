
-- stripe_config: restrict SELECT to super admin only
DROP POLICY IF EXISTS "admin_only_select" ON public.stripe_config;
CREATE POLICY "Super admin only select stripe_config"
ON public.stripe_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.user_number = 1
  )
);

-- support_messages: remove no-op PERMISSIVE false SELECT policy
DROP POLICY IF EXISTS "Admins must use secure function for support messages" ON public.support_messages;

-- user_roles: restrictive INSERT/UPDATE/DELETE to admins or service_role only
CREATE POLICY "Restrict role writes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR auth.role() = 'service_role'
);

CREATE POLICY "Restrict role updates to admins"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR auth.role() = 'service_role'
);

CREATE POLICY "Restrict role deletes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR auth.role() = 'service_role'
);

-- push_subscriptions: allow users to manage their own rows (SELECT stays blocked)
CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);
