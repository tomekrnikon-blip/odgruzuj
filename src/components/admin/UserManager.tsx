import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Crown, AlertCircle, ShieldCheck, User, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Definicje typów dla użytkowników
type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  user_number: number | null;
  role: 'admin' | 'moderator' | 'user';
  subscription_status: 'active' | 'free' | 'cancelled' | 'expired' | null;
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

// Helper function to get role icon and styling
const getRoleDisplay = (role: 'admin' | 'moderator' | 'user') => {
  switch (role) {
    case 'admin':
      return {
        icon: <ShieldCheck className="h-4 w-4" />,
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
        label: 'Admin',
      };
    case 'moderator':
      return {
        icon: <Shield className="h-4 w-4" />,
        className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        label: 'Moderator',
      };
    default:
      return {
        icon: <User className="h-4 w-4" />,
        className: 'bg-muted text-muted-foreground border-border',
        label: 'User',
      };
  }
};

export function UserManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter users based on search query
  const filteredUsers = users?.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query) ||
      user.user_number?.toString().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (isError) {
    return <div className="text-destructive p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 mb-2"/>Nie udało się załadować użytkowników. Sprawdź konsolę funkcji Edge.</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mt-8">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield /> Zarządzanie Użytkownikami
                <Badge variant="secondary" className="ml-2">{users?.length ?? 0}</Badge>
              </span>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po email, nazwie lub numerze..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {filteredUsers?.length === 0 && searchQuery && (
              <p className="text-center text-muted-foreground py-4">
                Nie znaleziono użytkowników dla "{searchQuery}"
              </p>
            )}
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {filteredUsers?.map((user) => {
                  const roleDisplay = getRoleDisplay(user.role);
                  const isPro = user.subscription_status === 'active';
                  
                  return (
                    <div 
                      key={user.id} 
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border transition-colors ${
                        isPro 
                          ? 'bg-amber-500/5 border-amber-500/30' 
                          : user.role === 'moderator'
                          ? 'bg-blue-500/5 border-blue-500/30'
                          : user.role === 'admin'
                          ? 'bg-red-500/5 border-red-500/30'
                          : 'bg-card-elevated border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3 sm:mb-0">
                        <div className="relative">
                          <Avatar className={isPro ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background' : ''}>
                            <AvatarFallback className={isPro ? 'bg-amber-500/20 text-amber-600' : ''}>
                              {user.email?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {isPro && (
                            <Crown className="absolute -top-1 -right-1 h-4 w-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {user.display_name || `Użytkownik #${user.user_number}`}
                            </p>
                            <Badge variant="outline" className={`text-xs ${roleDisplay.className}`}>
                              {roleDisplay.icon}
                              <span className="ml-1">{roleDisplay.label}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {isPro && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Crown className="h-3 w-3 text-amber-500" />
                              <p className="text-xs text-amber-500 font-medium">
                                PRO {user.subscription_expires_at ? `do: ${new Date(user.subscription_expires_at).toLocaleDateString()}` : '(bez limitu)'}
                              </p>
                            </div>
                          )}
                          {!isPro && user.subscription_status === 'free' && (
                            <p className="text-xs text-muted-foreground">Plan darmowy (limit 2 zadania/dzień)</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={roleMutation.isPending}
                        >
                          <SelectTrigger className="w-full sm:w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <span className="flex items-center gap-2">
                                <User className="h-4 w-4" /> User
                              </span>
                            </SelectItem>
                            <SelectItem value="moderator">
                              <span className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-500" /> Moderator
                              </span>
                            </SelectItem>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-red-500" /> Admin
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {isPro ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokePro(user.id)}
                            disabled={proMutation.isPending}
                            className="gap-1"
                          >
                            <Crown className="h-4 w-4" />
                            Odbierz
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleGivePro(user.id)}
                            disabled={proMutation.isPending}
                            className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                          >
                            <Crown className="h-4 w-4" />
                            Nadaj Pro
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
