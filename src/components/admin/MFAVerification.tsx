import { useState } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MFAVerificationProps {
  onVerified: () => void;
}

export function MFAVerification({ onVerified }: MFAVerificationProps) {
  const { verifyMFA, isLoading } = useMFA();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Kod musi mieć 6 cyfr');
      return;
    }

    const success = await verifyMFA(code);
    if (success) {
      onVerified();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center pb-20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Weryfikacja dwuskładnikowa</CardTitle>
          <CardDescription>
            Wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej, aby uzyskać dostęp do panelu administracyjnego
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              className="font-mono text-center text-2xl tracking-[0.5em] h-14"
              autoFocus
            />
          </div>
          
          <Button 
            onClick={handleVerify} 
            disabled={code.length !== 6 || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Weryfikacja...
              </>
            ) : (
              'Potwierdź'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Kod jest generowany przez aplikację taką jak Google Authenticator lub Authy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
