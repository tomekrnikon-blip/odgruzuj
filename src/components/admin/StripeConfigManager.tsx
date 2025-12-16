import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Save, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StripeConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function StripeConfigManager() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ['stripe-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_config')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as StripeConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('stripe_config')
        .update({ value, updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-config'] });
      toast.success('Konfiguracja zaktualizowana');
      setEditedValues({});
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    const value = editedValues[key];
    if (value !== undefined) {
      updateMutation.mutate({ key, value });
    }
  };

  const getValue = (key: string) => {
    return editedValues[key] ?? configs?.find(c => c.key === key)?.value ?? '';
  };

  const hasChanges = (key: string) => {
    const original = configs?.find(c => c.key === key)?.value;
    return editedValues[key] !== undefined && editedValues[key] !== original;
  };

  const configLabels: Record<string, { label: string; placeholder: string }> = {
    price_monthly: { label: 'Price ID (miesięczny)', placeholder: 'price_...' },
    price_yearly: { label: 'Price ID (roczny)', placeholder: 'price_...' },
    monthly_price_display: { label: 'Cena wyświetlana (miesięczna)', placeholder: '9.90' },
    yearly_price_display: { label: 'Cena wyświetlana (roczna)', placeholder: '49.90' },
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <CardTitle>Konfiguracja Stripe</CardTitle>
        </div>
        <CardDescription>
          Zarządzaj cenami subskrypcji i identyfikatorami Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Bezpieczeństwo:</strong> Klucz tajny Stripe (STRIPE_SECRET_KEY) jest bezpiecznie 
            przechowywany w sekretach Supabase i nie może być zmieniony z tego panelu. 
            Poniżej znajdują się tylko publiczne identyfikatory cen.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Identyfikatory cen Stripe
          </h3>
          
          {['price_monthly', 'price_yearly'].map((key) => {
            const config = configs?.find(c => c.key === key);
            const labels = configLabels[key];
            
            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{labels?.label || key}</Label>
                <div className="flex gap-2">
                  <Input
                    id={key}
                    value={getValue(key)}
                    onChange={(e) => handleValueChange(key, e.target.value)}
                    placeholder={labels?.placeholder}
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={() => handleSave(key)}
                    disabled={!hasChanges(key) || updateMutation.isPending}
                    size="icon"
                    variant={hasChanges(key) ? "default" : "outline"}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {config?.description && (
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 pt-4 border-t">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Ceny wyświetlane w aplikacji (PLN)
          </h3>
          
          {['monthly_price_display', 'yearly_price_display'].map((key) => {
            const config = configs?.find(c => c.key === key);
            const labels = configLabels[key];
            
            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{labels?.label || key}</Label>
                <div className="flex gap-2">
                  <Input
                    id={key}
                    value={getValue(key)}
                    onChange={(e) => handleValueChange(key, e.target.value)}
                    placeholder={labels?.placeholder}
                    type="text"
                  />
                  <Button
                    onClick={() => handleSave(key)}
                    disabled={!hasChanges(key) || updateMutation.isPending}
                    size="icon"
                    variant={hasChanges(key) ? "default" : "outline"}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {config?.description && (
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <Button variant="outline" asChild className="w-full">
            <a 
              href="https://dashboard.stripe.com/products" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Otwórz Stripe Dashboard
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Aby zmienić rzeczywiste ceny, edytuj je w panelu Stripe i zaktualizuj Price ID powyżej
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
