import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Crown, Loader2, Search, ChevronDown, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  user_number: number;
  subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
  subscription_expires_at: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

export function UserManager() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Use secure RPC function that returns masked emails
      const { data, error } = await supabase
        .rpc('get_admin_profiles');

      if (error) throw error;
      // Sort by user_number ascending (admin #1 first)
      return (data as Profile[])?.sort((a, b) => 
        a.user_number - b.user_number
      ) ?? [];
    }
  });

  const { data: userRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error) throw error;
      return data as UserRole[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: 'free' | 'active' }) => {
      const updates: {
        subscription_status: 'free' | 'active';
        subscription_expires_at: string | null;
      } = {
        subscription_status: newStatus,
        subscription_expires_at: null
      };

      if (newStatus === 'active') {
        // Set expiration to 1 year from now
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        updates.subscription_expires_at = expiresAt.toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      // Log admin activity
      if (currentUser?.id) {
        await supabase.rpc('log_admin_activity', {
          p_admin_user_id: currentUser.id,
          p_action_type: newStatus === 'active' ? 'grant_pro_subscription' : 'revoke_pro_subscription',
          p_target_table: 'profiles',
          p_target_id: userId,
          p_details: { new_status: newStatus }
        });
      }
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({
        title: newStatus === 'active' ? '✅ Pro nadane!' : '❌ Pro usunięte',
        description: newStatus === 'active' 
          ? 'Użytkownik ma teraz dostęp do wszystkich 580 fiszek przez rok'
          : 'Użytkownik ma teraz dostęp tylko do 63 darmowych fiszek',
      });
    },
    onError: () => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować statusu',
        variant: 'destructive',
      });
    }
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isCurrentlyAdmin }: { userId: string; isCurrentlyAdmin: boolean }) => {
      if (isCurrentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
      }

      // Log admin activity
      if (currentUser?.id) {
        await supabase.rpc('log_admin_activity', {
          p_admin_user_id: currentUser.id,
          p_action_type: isCurrentlyAdmin ? 'revoke_admin_role' : 'grant_admin_role',
          p_target_table: 'user_roles',
          p_target_id: userId,
          p_details: null
        });
      }
    },
    onSuccess: (_, { isCurrentlyAdmin }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: isCurrentlyAdmin ? '❌ Admin usunięty' : '✅ Admin nadany!',
        description: isCurrentlyAdmin 
          ? 'Użytkownik nie ma już dostępu do panelu admina'
          : 'Użytkownik ma teraz pełny dostęp do panelu administracyjnego',
      });
    },
    onError: () => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zmienić uprawnień',
        variant: 'destructive',
      });
    }
  });

  const isUserAdmin = (userId: string) => {
    return userRoles?.some(role => role.user_id === userId && role.role === 'admin') ?? false;
  };

  const filteredUsers = users?.filter(user => 
    user.user_number.toString().includes(searchQuery) ||
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-bold">
            <Crown className="h-3 w-3 mr-1" />
            PRO AKTYWNE
          </Badge>
        );
      case 'expired':
        return <Badge variant="destructive">Wygasło</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Anulowane</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Free</Badge>;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Zarządzanie użytkownikami</h3>
                <p className="text-sm text-muted-foreground">
                  {users?.length ?? 0} użytkowników
                </p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-border">
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze lub nazwie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Brak użytkowników
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredUsers?.map((user) => {
                  const userIsAdmin = isUserAdmin(user.user_id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                    >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-primary">#{user.user_number}</span>
                            <p className="font-medium text-foreground truncate">
                              {user.display_name || 'Użytkownik'}
                            </p>
                            {getStatusBadge(user.subscription_status)}
                            {userIsAdmin && (
                              <Badge className="bg-red-500/20 text-red-500 border-red-500/30 font-bold">
                                <Shield className="h-3 w-3 mr-1" />
                                ADMIN AKTYWNY
                              </Badge>
                            )}
                          </div>
                        <p className="text-xs text-muted-foreground">
                          Dołączył: {format(new Date(user.created_at), 'dd MMM yyyy', { locale: pl })}
                          {user.subscription_status === 'active' && user.subscription_expires_at && (
                            <> • Pro do: {format(new Date(user.subscription_expires_at), 'dd MMM yyyy', { locale: pl })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4 flex-wrap">
                        {userIsAdmin ? (
                          user.user_number !== 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleAdminMutation.mutate({ userId: user.user_id, isCurrentlyAdmin: true })}
                              disabled={toggleAdminMutation.isPending}
                              className="gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                            >
                              <Shield className="h-3 w-3" />
                              Usuń Admin
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAdminMutation.mutate({ userId: user.user_id, isCurrentlyAdmin: false })}
                            disabled={toggleAdminMutation.isPending}
                            className="gap-1"
                          >
                            <Shield className="h-3 w-3" />
                            Nadaj Admin
                          </Button>
                        )}
                        {user.subscription_status === 'active' ? (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ userId: user.user_id, newStatus: 'free' })}
                            disabled={updateStatusMutation.isPending}
                            className="gap-1 bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Crown className="h-3 w-3" />
                            Usuń Pro
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ userId: user.user_id, newStatus: 'active' })}
                            disabled={updateStatusMutation.isPending}
                            className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                          >
                            <Crown className="h-3 w-3" />
                            Nadaj Pro
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
