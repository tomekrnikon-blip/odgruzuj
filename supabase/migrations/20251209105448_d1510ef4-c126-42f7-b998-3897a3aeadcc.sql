-- Create categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '📦',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view active categories
CREATE POLICY "Everyone can view active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, icon, display_order) VALUES
  ('Ubrania i Moda', '👕', 1),
  ('Książki i Czasopisma', '📚', 2),
  ('Papiery i Dokumenty', '📄', 3),
  ('Kuchnia i Jedzenie', '🍳', 4),
  ('Łazienka i Higiena', '🛁', 5);