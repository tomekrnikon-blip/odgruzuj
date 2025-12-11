-- Modify handle_new_user to NOT assign user_number on creation
-- User number will be assigned only after email confirmation

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new function that creates profile WITHOUT user_number (null initially)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  -- Create profile with NULL user_number initially
  -- Number will be assigned when email is confirmed
  INSERT INTO public.profiles (user_id, email, user_number)
  VALUES (NEW.id, NEW.email, NULL);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to assign user_number when email is confirmed
CREATE OR REPLACE FUNCTION public.assign_user_number_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  -- Only assign number if email was just confirmed (email_confirmed_at changed from null to not null)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET user_number = nextval('public.user_number_seq')
    WHERE user_id = NEW.id AND user_number IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.assign_user_number_on_confirm();

-- Modify get_admin_profiles to only return confirmed users (those with user_number assigned)
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  user_number integer,
  subscription_status subscription_status,
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    public.mask_email(
      CASE 
        WHEN p.email LIKE 'wy4%' THEN public.decrypt_email(p.email)
        ELSE p.email
      END
    ) as email,
    p.user_number,
    p.subscription_status,
    p.subscription_expires_at,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND p.user_number IS NOT NULL  -- Only return confirmed users with assigned numbers
$$;

-- Make user_number nullable in profiles table (if not already)
ALTER TABLE public.profiles ALTER COLUMN user_number DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_number DROP DEFAULT;