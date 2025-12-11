-- Add user_number column to profiles
ALTER TABLE public.profiles
ADD COLUMN user_number SERIAL;

-- Create sequence for user numbers if not exists
CREATE SEQUENCE IF NOT EXISTS public.user_number_seq START WITH 1;

-- Update existing users with sequential numbers (admin first)
WITH numbered_users AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN email = 'tomekrnikon@gmail.com' OR 
             (email LIKE 'wy4%' AND public.decrypt_email(email) = 'tomekrnikon@gmail.com') 
        THEN 0 ELSE 1 END,
        created_at
    ) as new_number
  FROM public.profiles
)
UPDATE public.profiles p
SET user_number = nu.new_number
FROM numbered_users nu
WHERE p.id = nu.id;

-- Set sequence to next available number
SELECT setval('public.user_number_seq', COALESCE((SELECT MAX(user_number) FROM public.profiles), 0) + 1);

-- Create function to assign user number on new profile
CREATE OR REPLACE FUNCTION public.assign_user_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_number := nextval('public.user_number_seq');
  RETURN NEW;
END;
$$;

-- Create trigger for new users
DROP TRIGGER IF EXISTS assign_user_number_trigger ON public.profiles;
CREATE TRIGGER assign_user_number_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.user_number IS NULL)
EXECUTE FUNCTION public.assign_user_number();