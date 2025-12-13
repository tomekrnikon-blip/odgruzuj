-- Create shopping list table for logged-in users
CREATE TABLE public.shopping_list (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_bought boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- Users can only see their own items
CREATE POLICY "Users can view their own shopping items"
ON public.shopping_list
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own items
CREATE POLICY "Users can insert their own shopping items"
ON public.shopping_list
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own items
CREATE POLICY "Users can update their own shopping items"
ON public.shopping_list
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "Users can delete their own shopping items"
ON public.shopping_list
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_shopping_list_updated_at
BEFORE UPDATE ON public.shopping_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();