import { useAdminAuth } from '@/hooks/useAdminAuth';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { FlashcardManager } from '@/components/admin/FlashcardManager';
import { NotificationManager } from '@/components/admin/NotificationManager';
import { UserManager } from '@/components/admin/UserManager';
import { SupportMessagesManager } from '@/components/admin/SupportMessagesManager';
import { ShieldAlert, Loader2, ShieldCheck, Users, Crown, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, isSuperAdmin, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Błąd podczas wylogowywania');
    } else {
      toast.success('Wylogowano pomyślnie');
      navigate('/auth');
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersResult, proResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active')
      ]);
      
      return {
        totalUsers: usersResult.count ?? 0,
        proUsers: proResult.count ?? 0
      };
    },
    enabled: isAdmin
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20 px-4">
        <div className="card-elevated p-8 text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Brak dostępu</h1>
          <p className="text-muted-foreground">
            Ta strona jest dostępna tylko dla administratorów. Zaloguj się na konto z uprawnieniami administratora.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-nav">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <h1 className="font-heading text-xl sm:text-3xl font-bold text-foreground">
                Panel Administratora
              </h1>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2 self-start sm:self-auto"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Wyloguj</span>
            </Button>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isSuperAdmin 
              ? 'Zarządzaj kategoriami, fiszkami, użytkownikami i powiadomieniami'
              : 'Zarządzaj kategoriami i fiszkami (tryb moderatora)'
            }
          </p>
        </header>

        {/* Stats Section - only for super admin */}
        {isSuperAdmin && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-primary/10 flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Zarejestrowani</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : stats?.totalUsers ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-yellow-500/10 flex-shrink-0">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Pakiety Pro</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : stats?.proUsers ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* Support Messages Section - only for super admin */}
        {isSuperAdmin && <SupportMessagesManager />}

        {/* Users Section - only for super admin */}
        {isSuperAdmin && <UserManager />}

        {/* Notifications Section - only for super admin */}
        {isSuperAdmin && <NotificationManager />}

        {/* Categories Section */}
        <CategoryManager />

        {/* Flashcards Section */}
        <FlashcardManager />
      </div>
    </div>
  );
}
