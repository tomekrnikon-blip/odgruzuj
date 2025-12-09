-- Create support messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages
CREATE POLICY "Users can send support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own messages
CREATE POLICY "Users can view their own messages"
ON public.support_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.support_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages"
ON public.support_messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.support_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));