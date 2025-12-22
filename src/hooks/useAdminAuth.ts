import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!isMounted) return;

        if (!user) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserId(null);
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        // Check if user has admin role (super admin)
        const { data: hasAdminRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isMounted) return;

        // Check if user has moderator role
        const { data: hasModeratorRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'moderator'
        });

        if (!isMounted) return;

        // User has access to admin panel if they are admin OR moderator
        const hasAccess = hasAdminRole === true || hasModeratorRole === true;
        setIsAdmin(hasAccess);

        // Only user #1 with admin role is super admin
        if (hasAdminRole === true) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_number')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (isMounted) {
            setIsSuperAdmin(profileData?.user_number === 1);
          }
        } else {
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('Error in admin auth check:', error);
        if (isMounted) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAdminStatus();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        setIsLoading(true);
        checkAdminStatus();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isSuperAdmin, isLoading, userId };
}
