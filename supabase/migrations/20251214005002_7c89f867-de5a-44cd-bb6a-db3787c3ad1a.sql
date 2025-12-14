
-- Drop the email format check constraint that blocks encrypted emails
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_format_check;

-- Add a new constraint that allows both regular emails and encrypted emails (starting with 'wy4')
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_format_check 
CHECK (
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  OR email LIKE 'wy4%'
  OR email LIKE 'enc_%'
);
