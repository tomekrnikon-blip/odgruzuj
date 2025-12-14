import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Key, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function SecuritySection() {
  const queryClient = useQueryClient();
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Check if vault key is configured
  const { data: vaultKeyExists, isLoading: checkingVault } = useQuery({
    queryKey: ['vault-key-status'],
    queryFn: async () => {
      // We can't directly check vault from client, so we'll try to call the edge function
      // and see if it reports the key as already configured
      return false; // Default to false, will be updated by setupVaultKey
    }
  });

  const setupVaultKeyMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Brak sesji');

      const response = await supabase.functions.invoke('setup-vault-key', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Błąd konfiguracji');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Klucz szyfrowania skonfigurowany w Vault');
        queryClient.invalidateQueries({ queryKey: ['vault-key-status'] });
      } else {
        toast.error(data.error || 'Nie udało się skonfigurować klucza');
      }
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    }
  });

  const encryptExistingEmailsMutation = useMutation({
    mutationFn: async () => {
      setIsEncrypting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Brak sesji');

      const response = await supabase.functions.invoke('encrypt-all-emails', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Błąd szyfrowania');
      }

      return response.data;
    },
    onSuccess: (data) => {
      setIsEncrypting(false);
      if (data.success) {
        toast.success(`Zaszyfrowano ${data.encrypted || 0} emaili`);
      } else {
        toast.error(data.error || 'Nie udało się zaszyfrować emaili');
      }
    },
    onError: (error) => {
      setIsEncrypting(false);
      toast.error(`Błąd: ${error.message}`);
    }
  });

  return (
    <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-amber-500" />
          Bezpieczeństwo i szyfrowanie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vault Key Setup */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Klucz szyfrowania w Vault</p>
              <p className="text-xs text-muted-foreground">
                Wymagany do szyfrowania emaili w bazie danych
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setupVaultKeyMutation.mutate()}
            disabled={setupVaultKeyMutation.isPending}
          >
            {setupVaultKeyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Lock className="h-4 w-4 mr-1" />
                Konfiguruj
              </>
            )}
          </Button>
        </div>

        {/* Encrypt Existing Emails */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Szyfrowanie istniejących emaili</p>
              <p className="text-xs text-muted-foreground">
                Zaszyfruj wszystkie niezaszyfrowane adresy email
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => encryptExistingEmailsMutation.mutate()}
            disabled={isEncrypting || encryptExistingEmailsMutation.isPending}
          >
            {isEncrypting || encryptExistingEmailsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Zaszyfruj
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tylko super admin może wykonywać operacje bezpieczeństwa
        </p>
      </CardContent>
    </Card>
  );
}
