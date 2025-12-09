import { useAdminAuth } from '@/hooks/useAdminAuth';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { FlashcardManager } from '@/components/admin/FlashcardManager';
import { ShieldAlert, Loader2, ShieldCheck } from 'lucide-react';

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();

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
            Zarządzaj kategoriami i fiszkami aplikacji
          </p>
        </header>

        {/* Categories Section */}
        <CategoryManager />

        {/* Flashcards Section */}
        <FlashcardManager />
      </div>
    </div>
  );
}
