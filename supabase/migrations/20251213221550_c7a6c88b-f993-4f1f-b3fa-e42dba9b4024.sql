-- Remove overly permissive policy from support_messages
DROP POLICY IF EXISTS "Deny anonymous access to support_messages" ON public.support_messages;