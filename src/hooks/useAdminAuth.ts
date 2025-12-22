import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const checkAdminStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setUserId(null);
        return;
      }

      setUserId(user.id);

      const [{ data: hasAdminRole }, { data: hasModeratorRole }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
      ]);

      const hasAccess = hasAdminRole === true || hasModeratorRole === true;
      setIsAdmin(hasAccess);

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
  }, []);

  useEffect(() => {
    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  useEffect(() => {
    // Keep admin/moderator access in sync right after role changes (no re-login required)
    if (!userId) return;

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`admin-auth-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          checkAdminStatus();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, checkAdminStatus]);

  return { isAdmin, isSuperAdmin, isLoading, userId };
}
