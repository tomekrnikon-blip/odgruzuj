import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Loader2, 
  RefreshCw, 
  Check, 
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StripePrice {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  type: string;
  nickname: string | null;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  metadata: Record<string, string>;
  prices: StripePrice[];
}

interface StripeConfig {
  id: string;
  key: string;
  value: string;
}

export function StripeProductsManager() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  // Fetch products from Stripe
  const { data: stripeData, isLoading: isLoadingProducts, refetch, isFetching } = useQuery({
    queryKey: ['stripe-products'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-products');
      if (error) throw error;
      return data as { products: StripeProduct[] };
    },
  });

  // Fetch current config
  const { data: configs } = useQuery({
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

  // Mutation to update config
  const updateConfigMutation = useMutation({
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
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const getCurrentPriceId = (key: string) => {
    return configs?.find(c => c.key === key)?.value || '';
  };

  const handleSelectPrice = async (priceId: string, type: 'monthly' | 'yearly', price: StripePrice) => {
    const configKey = type === 'monthly' ? 'price_monthly' : 'price_yearly';
    const displayKey = type === 'monthly' ? 'monthly_price_display' : 'yearly_price_display';
    
    // Update price ID
    await updateConfigMutation.mutateAsync({ key: configKey, value: priceId });
    
    // Update display price
    if (price.unit_amount) {
      const displayPrice = (price.unit_amount / 100).toFixed(2).replace('.', ',') + ' zł';
      await updateConfigMutation.mutateAsync({ key: displayKey, value: displayPrice });
    }
  };

  const formatPrice = (price: StripePrice) => {
    if (!price.unit_amount) return 'Darmowy';
    const amount = (price.unit_amount / 100).toFixed(2);
    const currency = price.currency.toUpperCase();
    return `${amount} ${currency}`;
  };

  const getRecurringLabel = (price: StripePrice) => {
    if (!price.recurring) return 'Jednorazowa';
    const interval = price.recurring.interval;
    const count = price.recurring.interval_count;
    
    if (interval === 'month') {
      return count === 1 ? 'miesięcznie' : `co ${count} miesiące`;
    }
    if (interval === 'year') {
      return count === 1 ? 'rocznie' : `co ${count} lata`;
    }
    return `${interval}/${count}`;
  };

  const isSelectedPrice = (priceId: string) => {
    return getCurrentPriceId('price_monthly') === priceId || 
           getCurrentPriceId('price_yearly') === priceId;
  };

  const getPriceType = (price: StripePrice): 'monthly' | 'yearly' | 'other' => {
    if (!price.recurring) return 'other';
    if (price.recurring.interval === 'month' && price.recurring.interval_count === 1) {
      return 'monthly';
    }
    if (price.recurring.interval === 'year' && price.recurring.interval_count === 1) {
      return 'yearly';
    }
    return 'other';
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle>Produkty Stripe</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CardDescription>
            Wybierz produkty i ceny z Twojego konta Stripe
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Refresh Button */}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Odśwież
              </Button>
            </div>

            {/* Current Selection */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Aktualnie wybrane:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  Miesięczny: {getCurrentPriceId('price_monthly') || 'Nie ustawiono'}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Zap className="w-3 h-3" />
                  Roczny: {getCurrentPriceId('price_yearly') || 'Nie ustawiono'}
                </Badge>
              </div>
            </div>

            {/* Products List */}
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : stripeData?.products?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Brak produktów w Stripe</p>
                <p className="text-sm">Dodaj produkty w panelu Stripe Dashboard</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stripeData?.products?.map((product) => (
                  <div 
                    key={product.id} 
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono mt-1">{product.id}</p>
                      </div>
                      {product.images[0] && (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                    </div>

                    {/* Prices */}
                    {product.prices.length > 0 ? (
                      <div className="grid gap-2">
                        {product.prices.map((price) => {
                          const priceType = getPriceType(price);
                          const isSelected = isSelectedPrice(price.id);
                          
                          return (
                            <div 
                              key={price.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isSelected && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{formatPrice(price)}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {getRecurringLabel(price)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono">{price.id}</p>
                                  {price.nickname && (
                                    <p className="text-xs text-muted-foreground">{price.nickname}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {priceType === 'monthly' && (
                                  <Button
                                    size="sm"
                                    variant={getCurrentPriceId('price_monthly') === price.id ? "default" : "outline"}
                                    onClick={() => handleSelectPrice(price.id, 'monthly', price)}
                                    disabled={updateConfigMutation.isPending}
                                  >
                                    {updateConfigMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>Jako miesięczny</>
                                    )}
                                  </Button>
                                )}
                                {priceType === 'yearly' && (
                                  <Button
                                    size="sm"
                                    variant={getCurrentPriceId('price_yearly') === price.id ? "default" : "outline"}
                                    onClick={() => handleSelectPrice(price.id, 'yearly', price)}
                                    disabled={updateConfigMutation.isPending}
                                  >
                                    {updateConfigMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>Jako roczny</>
                                    )}
                                  </Button>
                                )}
                                {priceType === 'other' && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSelectPrice(price.id, 'monthly', price)}
                                      disabled={updateConfigMutation.isPending}
                                    >
                                      Mies.
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSelectPrice(price.id, 'yearly', price)}
                                      disabled={updateConfigMutation.isPending}
                                    >
                                      Roczny
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Brak cen dla tego produktu
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
