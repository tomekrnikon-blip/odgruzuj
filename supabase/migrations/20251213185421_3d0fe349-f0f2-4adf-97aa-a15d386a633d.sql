-- Remove redundant ALL policy that duplicates individual SELECT/INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Authenticated users can only access own profile" ON public.profiles;