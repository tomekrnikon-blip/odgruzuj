import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserId(null);
          return;
        }

        setUserId(user.id);

        // Check if user has admin role using the has_role function
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          return;
        }

        setIsAdmin(data === true);

        // Check if user is super admin (user_number = 1)
        if (data === true) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_number')
            .eq('user_id', user.id)
            .maybeSingle();
          
          setIsSuperAdmin(profileData?.user_number === 1);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('Error in admin auth check:', error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, isSuperAdmin, isLoading, userId };
}
