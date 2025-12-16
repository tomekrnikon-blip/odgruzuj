-- Create table for Stripe configuration (price IDs only - NOT secret keys for security)
CREATE TABLE public.stripe_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.stripe_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage stripe config
CREATE POLICY "Super admins can manage stripe config"
  ON public.stripe_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.user_number = 1
    )
  );

-- Everyone can read stripe config (price IDs are public)
CREATE POLICY "Anyone can read stripe config"
  ON public.stripe_config
  FOR SELECT
  USING (true);

-- Insert default price IDs
INSERT INTO public.stripe_config (key, value, description) VALUES
  ('price_monthly', 'price_1ScWPE9EWMAAADcflIpPIPRS', 'Stripe Price ID dla planu miesięcznego (9.90 PLN)'),
  ('price_yearly', 'price_1ScWRg9EWMAAADcfHNoeUUK7', 'Stripe Price ID dla planu rocznego (49.90 PLN)'),
  ('monthly_price_display', '9.90', 'Cena wyświetlana dla planu miesięcznego'),
  ('yearly_price_display', '49.90', 'Cena wyświetlana dla planu rocznego');

-- Update timestamp trigger
CREATE TRIGGER update_stripe_config_updated_at
  BEFORE UPDATE ON public.stripe_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();