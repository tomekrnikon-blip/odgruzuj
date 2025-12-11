import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  user_number: number;
  subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
  subscription_expires_at: string | null;
  created_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, user_number, subscription_status, subscription_expires_at, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  return {
    profile,
    userNumber: profile?.user_number ?? null,
    isLoading,
    error,
  };
}
