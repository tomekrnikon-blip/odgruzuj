-- Add length constraints to notifications table to prevent spam/abuse
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_message_length CHECK (char_length(message) >= 1 AND char_length(message) <= 2000);