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

        // Check if user has admin role (super admin)
        const { data: hasAdminRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        // Check if user has moderator role
        const { data: hasModeratorRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'moderator'
        });

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
