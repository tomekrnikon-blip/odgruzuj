import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

export function SecuritySection() {
  const [isEncrypting, setIsEncrypting] = useState(false);

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
        toast.success(`Zaszyfrowano ${data.encrypted || 0} emaili (${data.failed || 0} błędów)`);
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
        {/* Encrypt Existing Emails */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Szyfrowanie adresów email</p>
              <p className="text-xs text-muted-foreground">
                Zaszyfruj wszystkie niezaszyfrowane adresy email w bazie
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
