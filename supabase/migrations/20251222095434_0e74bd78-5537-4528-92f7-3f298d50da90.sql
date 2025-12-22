-- Usuń zbyt permisywną politykę dla notifications
DROP POLICY IF EXISTS "Everyone can view notifications" ON public.notifications;

-- Upewnij się, że restrykcyjna polityka istnieje
DROP POLICY IF EXISTS "Users can only view their assigned notifications" ON public.notifications;
CREATE POLICY "Users can only view their assigned notifications" 
ON public.notifications 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM user_notifications un
    WHERE un.notification_id = notifications.id
    AND un.user_id = auth.uid()
  )
);

-- Dodaj indeks dla szybszego sprawdzania user_notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_lookup 
ON public.user_notifications(notification_id, user_id);

-- Utwórz funkcję do bezpiecznego pobierania emaila (zawsze maskowany dla nie-super-adminów)
CREATE OR REPLACE FUNCTION public.get_masked_email_for_user(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  caller_user_number integer;
BEGIN
  -- Użytkownik może pobrać tylko swój własny email
  IF auth.uid() = target_user_id THEN
    SELECT 
      CASE 
        WHEN email LIKE 'wy4%' THEN public.decrypt_email(email)
        ELSE email
      END INTO user_email
    FROM public.profiles
    WHERE user_id = target_user_id;
    
    RETURN user_email;
  END IF;
  
  -- Admin może pobrać zamaskowany email
  IF public.has_role(auth.uid(), 'admin') THEN
    -- Sprawdź czy to super admin (user #1)
    SELECT user_number INTO caller_user_number
    FROM public.profiles
    WHERE profiles.user_id = auth.uid();
    
    -- Super admin widzi pełny email
    IF caller_user_number = 1 THEN
      SELECT 
        CASE 
          WHEN email LIKE 'wy4%' THEN public.decrypt_email(email)
          ELSE email
        END INTO user_email
      FROM public.profiles
      WHERE user_id = target_user_id;
      
      -- Loguj dostęp do pełnego emaila
      PERFORM public.log_sensitive_data_access('profile_email', target_user_id);
      
      RETURN user_email;
    ELSE
      -- Zwykły admin widzi zamaskowany email
      SELECT public.mask_email(
        CASE 
          WHEN email LIKE 'wy4%' THEN public.decrypt_email(email)
          ELSE email
        END
      ) INTO user_email
      FROM public.profiles
      WHERE user_id = target_user_id;
      
      RETURN user_email;
    END IF;
  END IF;
  
  -- Brak uprawnień
  RETURN NULL;
END;
$$;

-- Ogranicz dostęp do funkcji
REVOKE ALL ON FUNCTION public.get_masked_email_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_masked_email_for_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_masked_email_for_user(uuid) TO authenticated;