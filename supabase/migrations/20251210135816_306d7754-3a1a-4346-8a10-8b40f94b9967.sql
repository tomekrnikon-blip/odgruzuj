-- Add validation constraints for better security

-- Validate push subscription endpoint is a valid HTTPS URL
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_endpoint_https_check 
CHECK (endpoint ~ '^https://');

-- Validate push subscription keys have minimum length (p256dh should be ~87 chars, auth ~22 chars)
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_p256dh_length_check 
CHECK (length(p256dh) >= 20 AND length(p256dh) <= 200);

ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_auth_length_check 
CHECK (length(auth) >= 10 AND length(auth) <= 100);

-- Add message length constraint for support messages
ALTER TABLE public.support_messages
ADD CONSTRAINT support_messages_message_length_check 
CHECK (length(message) > 0 AND length(message) <= 2000);

-- Validate email format in support messages
ALTER TABLE public.support_messages
ADD CONSTRAINT support_messages_email_format_check 
CHECK (user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validate email format in profiles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_format_check 
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add display_name length constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_display_name_length_check 
CHECK (display_name IS NULL OR (length(display_name) >= 1 AND length(display_name) <= 100));