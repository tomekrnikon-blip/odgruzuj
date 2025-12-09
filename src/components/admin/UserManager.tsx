import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Crown, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
  subscription_expires_at: string | null;
  created_at: string;
}

export function UserManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({
        title: 'Sukces',
        description: 'Status użytkownika został zaktualizowany',
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

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pro</Badge>;
      case 'expired':
        return <Badge variant="destructive">Wygasło</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Anulowane</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Users className="h-5 w-5" />
          Zarządzanie użytkownikami
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po emailu lub nazwie..."
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
            {filteredUsers?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {user.display_name || user.email}
                    </p>
                    {getStatusBadge(user.subscription_status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dołączył: {format(new Date(user.created_at), 'dd MMM yyyy', { locale: pl })}
                    {user.subscription_status === 'active' && user.subscription_expires_at && (
                      <> • Pro do: {format(new Date(user.subscription_expires_at), 'dd MMM yyyy', { locale: pl })}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {user.subscription_status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ userId: user.user_id, newStatus: 'free' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Usuń Pro
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ userId: user.user_id, newStatus: 'active' })}
                      disabled={updateStatusMutation.isPending}
                      className="gap-1"
                    >
                      <Crown className="h-3 w-3" />
                      Nadaj Pro
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}