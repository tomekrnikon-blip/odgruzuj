import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  subscribed: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
  source: 'database' | 'stripe' | null; // Indicates where subscription comes from
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscriptionEnd: null,
    isLoading: true,
    source: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setStatus({ subscribed: false, subscriptionEnd: null, isLoading: false, source: null });
      return;
    }

    try {
      // First, check subscription status directly from database (admin-granted)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // If user has active subscription in database (admin-granted), use that
      if (profileData?.subscription_status === 'active') {
        const isExpired = profileData.subscription_expires_at 
          ? new Date(profileData.subscription_expires_at) < new Date() 
          : false;

        if (!isExpired) {
          setStatus({
            subscribed: true,
            subscriptionEnd: profileData.subscription_expires_at,
            isLoading: false,
            source: 'database',
          });
          return;
        }
      }

      // Otherwise, check Stripe for payment-based subscription
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking Stripe subscription:', error);
        // Fall back to database status
        setStatus({
          subscribed: profileData?.subscription_status === 'active',
          subscriptionEnd: profileData?.subscription_expires_at || null,
          isLoading: false,
          source: profileData?.subscription_status === 'active' ? 'database' : null,
        });
        return;
      }

      setStatus({
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
        source: data.subscribed ? 'stripe' : null,
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

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
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
    openCustomerPortal,
  };
}
