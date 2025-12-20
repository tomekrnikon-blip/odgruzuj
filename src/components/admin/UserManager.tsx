import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Crown, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Definicje typów dla użytkowników
type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'moderator' | 'user';
  subscription_status: 'active' | 'inactive' | null;
  subscription_expires_at: string | null;
};

// Bezpieczna funkcja do wywołania po stronie serwera
const fetchUsers = async () => {
  const { data, error } = await supabase.functions.invoke('get-users');
  if (error) throw new Error(error.message);
  return data as UserProfile[];
};

const updateUserRole = async ({ userId, role }: { userId: string; role: string }) => {
  const { error } = await supabase.functions.invoke('update-user-role', {
    body: { userId, role },
  });
  if (error) throw new Error(error.message);
};

const setProStatus = async ({ userId, expiresAt }: { userId: string; expiresAt: string | null }) => {
  const { error } = await supabase.functions.invoke('set-pro-status', {
    body: { userId, expiresAt },
  });
  if (error) throw new Error(error.message);
};

export function UserManager() {
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError } = useQuery<UserProfile[]>({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });

  const roleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      toast.success('Rola użytkownika zaktualizowana!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const proMutation = useMutation({
    mutationFn: setProStatus,
    onSuccess: () => {
      toast.success('Status Pro użytkownika zaktualizowany!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleRoleChange = (userId: string, role: string) => {
    roleMutation.mutate({ userId, role });
  };

  const handleGivePro = (userId: string) => {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    proMutation.mutate({ userId, expiresAt: expiresAt.toISOString() });
  };

  const handleRevokePro = (userId: string) => {
    proMutation.mutate({ userId, expiresAt: null });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (isError) {
    return <div className="text-destructive p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 mb-2"/>Nie udało się załadować użytkowników. Sprawdź konsolę funkcji Edge.</div>;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield /> Zarządzanie Użytkownikami
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users?.map((user) => (
            <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-card-elevated rounded-lg border">
              <div className="flex items-center gap-3 mb-3 sm:mb-0">
                <Avatar>
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{user.full_name ?? 'Brak nazwy'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.subscription_status === 'active' && user.subscription_expires_at && (
                     <p className="text-xs text-yellow-500">PRO do: {new Date(user.subscription_expires_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Select
                    defaultValue={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={roleMutation.isPending}
                  >
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                {user.subscription_status === 'active' ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevokePro(user.id)}
                    disabled={proMutation.isPending}
                  >
                    Odbierz Pro
                  </Button>
                ) : (
                  <Button
                    variant="premium"
                    size="sm"
                    onClick={() => handleGivePro(user.id)}
                    disabled={proMutation.isPending}
                  >
                    <Crown className="h-4 w-4 mr-1"/> Nadaj Pro
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
