import { useAdminAuth } from '@/hooks/useAdminAuth';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { FlashcardManager } from '@/components/admin/FlashcardManager';
import { NotificationManager } from '@/components/admin/NotificationManager';
import { UserManager } from '@/components/admin/UserManager';
import { SupportMessagesManager } from '@/components/admin/SupportMessagesManager';
import { ShieldAlert, Loader2, ShieldCheck, Users, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();

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
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Panel Administratora
            </h1>
          </div>
          <p className="text-muted-foreground">
            Zarządzaj kategoriami, fiszkami i powiadomieniami
          </p>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zarejestrowani</p>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? '...' : stats?.totalUsers ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pakiety Pro</p>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? '...' : stats?.proUsers ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Messages Section */}
        <SupportMessagesManager />

        {/* Users Section */}
        <UserManager />

        {/* Notifications Section */}
        <NotificationManager />

        {/* Categories Section */}
        <CategoryManager />

        {/* Flashcards Section */}
        <FlashcardManager />
      </div>
    </div>
  );
}
