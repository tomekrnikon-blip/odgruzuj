import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StripePrices {
  monthlyPrice: string;
  yearlyPrice: string;
  isLoading: boolean;
}

export function useStripePrices() {
  const [prices, setPrices] = useState<StripePrices>({
    monthlyPrice: '9,90 zł',
    yearlyPrice: '49,90 zł',
    isLoading: true,
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-stripe-prices');

        if (error) {
          console.error('Error fetching stripe prices:', error);
          setPrices(prev => ({ ...prev, isLoading: false }));
          return;
        }

        setPrices({
          monthlyPrice: data?.monthlyPrice || '9,90 zł',
          yearlyPrice: data?.yearlyPrice || '49,90 zł',
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching stripe prices:', error);
        setPrices(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchPrices();
  }, []);

  // Calculate monthly equivalent for yearly plan
  const yearlyMonthlyEquivalent = (() => {
    const yearlyNum = parseFloat(prices.yearlyPrice.replace(',', '.').replace(/[^\d.]/g, ''));
    if (isNaN(yearlyNum)) return '4,16 zł';
    const monthly = yearlyNum / 12;
    return monthly.toFixed(2).replace('.', ',') + ' zł';
  })();

  // Calculate discount percentage
  const discountPercentage = (() => {
    const monthlyNum = parseFloat(prices.monthlyPrice.replace(',', '.').replace(/[^\d.]/g, ''));
    const yearlyNum = parseFloat(prices.yearlyPrice.replace(',', '.').replace(/[^\d.]/g, ''));
    if (isNaN(monthlyNum) || isNaN(yearlyNum)) return 58;
    const yearlyMonthly = monthlyNum * 12;
    const discount = Math.round((1 - yearlyNum / yearlyMonthly) * 100);
    return discount;
  })();

  return {
    ...prices,
    yearlyMonthlyEquivalent,
    discountPercentage,
  };
}
