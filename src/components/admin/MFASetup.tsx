import { useState } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export function MFASetup() {
  const { isEnrolled, isLoading, qrCode, secret, enrollMFA, verifyEnrollment, unenrollMFA } = useMFA();
  const [code, setCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    const success = await enrollMFA();
    if (success) {
      setShowSetup(true);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Kod musi mieć 6 cyfr');
      return;
    }

    const success = await verifyEnrollment(code);
    if (success) {
      setShowSetup(false);
      setCode('');
    }
  };

  const handleCopySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success('Skopiowano klucz');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisable = async () => {
    await unenrollMFA();
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Show QR code setup
  if (showSetup && qrCode) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Konfiguracja 2FA
          </CardTitle>
          <CardDescription>
            Zeskanuj kod QR w aplikacji uwierzytelniającej (np. Google Authenticator, Authy)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <img 
              src={qrCode} 
              alt="QR Code for 2FA" 
              className="w-48 h-48 rounded-lg border border-border"
            />
          </div>
          
          {secret && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Lub wprowadź klucz ręcznie:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopySecret}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Wprowadź 6-cyfrowy kod z aplikacji:
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono text-center text-lg tracking-widest"
              />
              <Button onClick={handleVerify} disabled={code.length !== 6 || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Potwierdź'}
              </Button>
            </div>
          </div>

          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setShowSetup(false)}
          >
            Anuluj
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show current status
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isEnrolled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          Weryfikacja dwuskładnikowa (2FA)
        </CardTitle>
        <CardDescription>
          {isEnrolled 
            ? 'Twoje konto jest chronione weryfikacją dwuskładnikową'
            : 'Dodaj dodatkową warstwę bezpieczeństwa do swojego konta administracyjnego'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEnrolled ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Włączone</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Wyłącz 2FA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Wyłączyć weryfikację dwuskładnikową?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Wyłączenie 2FA zmniejszy bezpieczeństwo Twojego konta administracyjnego. 
                    Będziesz mógł logować się tylko za pomocą hasła.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisable} className="bg-destructive text-destructive-foreground">
                    Wyłącz 2FA
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <Button onClick={handleStartSetup} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Włącz 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
