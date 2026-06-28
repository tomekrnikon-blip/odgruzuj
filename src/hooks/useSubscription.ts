/**
 * ============================================================================
 * useSubscription — Stan subskrypcji PRO + integracja Stripe
 * ============================================================================
 *
 * Źródła prawdy o subskrypcji (kolejność ważności):
 *   1. `profiles.subscription_status = 'active'` + `subscription_expires_at`
 *      — używane dla subskrypcji nadanych ręcznie przez admina ORAZ dla
 *      jednorazowych płatności BLIK/P24 (przedłużanie konta).
 *   2. Edge function `check-subscription` — odpytuje Stripe API o aktywne
 *      subskrypcje cykliczne (karta).
 *
 * Dlaczego dwa źródła?
 *   BLIK/P24 nie obsługuje recurring w Stripe, więc nie tworzymy subskrypcji
 *   tylko `payment_intent`. Datę wygaśnięcia zapisujemy bezpośrednio w
 *   `profiles` (funkcja `verify-blik-payment`).
 *
 * Flow płatności:
 *   - `startCheckout('monthly'|'yearly')`  → karta cykliczna (Stripe Subscription)
 *   - `startBlikPayment(...)`              → BLIK jednorazowy (mode: 'payment')
 *   - `verifyBlikPayment(...)`             → po powrocie aktualizuje profil
 *   - `openCustomerPortal()`               → panel Stripe (anulowanie, faktury)
 *
 * Auto-refresh: co 60s sprawdzamy ponownie status (np. po sukcesie BLIK
 * w innej karcie). To prosty polling — nie używamy webhooków na froncie.
 * ============================================================================
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  /** Czy konto ma aktywny dostęp PRO (z DB lub Stripe). */
  subscribed: boolean;
  /** ISO string końca subskrypcji — wyświetlany w Settings. */
  subscriptionEnd: string | null;
  /** Spinner podczas pierwszego sprawdzania. */
  isLoading: boolean;
  /** Źródło informacji — przydatne do różnego UI (karta vs BLIK manual). */
  source: 'database' | 'stripe' | null;
  /** Dni pozostałe do końca — używane do przypomnień "odnów BLIK-iem" (7/3/1 dzień). */
  daysUntilExpiry: number | null;
}

/** Zaokrąglenie w górę — "zostało X dni" liczy się od północy. */
const calculateDaysUntilExpiry = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
};

export function useSubscription() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscriptionEnd: null,
    isLoading: true,
    source: null,
    daysUntilExpiry: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setStatus({ subscribed: false, subscriptionEnd: null, isLoading: false, source: null, daysUntilExpiry: null });
      return;
    }

    try {
      // First, check subscription status directly from database (admin-granted or BLIK)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // If user has active subscription in database (admin-granted or BLIK), use that
      if (profileData?.subscription_status === 'active') {
        const isExpired = profileData.subscription_expires_at 
          ? new Date(profileData.subscription_expires_at) < new Date() 
          : false;

        if (!isExpired) {
          const daysUntilExpiry = calculateDaysUntilExpiry(profileData.subscription_expires_at);
          setStatus({
            subscribed: true,
            subscriptionEnd: profileData.subscription_expires_at,
            isLoading: false,
            source: 'database',
            daysUntilExpiry,
          });
          return;
        }
      }

      // Otherwise, check Stripe for payment-based subscription
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking Stripe subscription:', error);
        // Fall back to database status
        const daysUntilExpiry = calculateDaysUntilExpiry(profileData?.subscription_expires_at || null);
        setStatus({
          subscribed: profileData?.subscription_status === 'active',
          subscriptionEnd: profileData?.subscription_expires_at || null,
          isLoading: false,
          source: profileData?.subscription_status === 'active' ? 'database' : null,
          daysUntilExpiry,
        });
        return;
      }

      const daysUntilExpiry = calculateDaysUntilExpiry(data.subscription_end || null);
      setStatus({
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
        source: data.subscribed ? 'stripe' : null,
        daysUntilExpiry,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, session]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh subscription status periodically
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Start regular subscription checkout (card-based recurring)
  const startCheckout = async (plan: 'monthly' | 'yearly' = 'yearly') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      throw error;
    }
  };

  // Start BLIK/P24 one-time payment (manual renewal)
  const startBlikPayment = async (plan: 'monthly' | 'yearly' = 'yearly') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-blik-payment', {
        body: { plan },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
      return data;
    } catch (error) {
      console.error('Error starting BLIK payment:', error);
      throw error;
    }
  };

  // Verify BLIK payment after redirect
  const verifyBlikPayment = async (expiresAt: string, duration?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-blik-payment', {
        body: { expiresAt, duration },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        await checkSubscription();
      }
      
      return data;
    } catch (error) {
      console.error('Error verifying BLIK payment:', error);
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        // Use location.href to avoid popup blockers
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  };

  return {
    ...status,
    checkSubscription,
    startCheckout,
    startBlikPayment,
    verifyBlikPayment,
    openCustomerPortal,
  };
}
