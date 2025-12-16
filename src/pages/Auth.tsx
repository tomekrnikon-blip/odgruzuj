import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Nieprawidłowy adres email" }),
  password: z.string().min(6, { message: "Hasło musi mieć co najmniej 6 znaków" }),
});

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Nieprawidłowy adres email" }),
});

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Hasło musi mieć co najmniej 6 znaków" }),
  confirmPassword: z.string().min(6, { message: "Hasło musi mieć co najmniej 6 znaków" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, signIn, signUp, resetPassword, updatePassword, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const allConsentsAccepted = acceptedPrivacy && acceptedTerms;

  // Password reset entrypoint:
  // - supports classic hash tokens (type=recovery&access_token=...)
  // - supports PKCE code flow (?code=...)
  // - also respects explicit /auth?mode=reset
  useEffect(() => {
    const mode = searchParams.get('mode');
    const code = searchParams.get('code');

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    const enterReset = async () => {
      // 1) PKCE code flow
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error('Link do resetowania hasła wygasł lub jest nieprawidłowy');
          return;
        }
        setShowResetPassword(true);
        return;
      }

      // 2) Hash token flow
      if (type === 'recovery' && accessToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          toast.error('Link do resetowania hasła wygasł lub jest nieprawidłowy');
          return;
        }

        setShowResetPassword(true);
        return;
      }

      // 3) Manual reset mode (UI only)
      if (mode === 'reset' || isPasswordRecovery) {
        setShowResetPassword(true);
      }
    };

    enterReset().catch(() => {
      toast.error('Wystąpił błąd podczas otwierania resetu hasła');
    });
  }, [searchParams, isPasswordRecovery]);

  useEffect(() => {
    // Don't redirect if user is in password reset mode
    if (showResetPassword) return;
    
    if (user && !authLoading) {
      // Encrypt user's email after login/signup
      supabase.functions.invoke('encrypt-user-email').catch(console.error);
      navigate('/');
    }
  }, [user, authLoading, navigate, showResetPassword]);

  const validateForm = () => {
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Nieprawidłowy email lub hasło');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Potwierdź swój adres email przed zalogowaniem');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('Zalogowano pomyślnie!');
    navigate('/');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allConsentsAccepted) {
      toast.error('Musisz zaakceptować politykę prywatności, RODO oraz regulamin');
      return;
    }
    
    // Validate password confirmation
    const passwordResult = passwordSchema.safeParse({ password, confirmPassword });
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email.trim(), password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Ten adres email jest już zarejestrowany');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('Sprawdź swoją skrzynkę email i potwierdź rejestrację klikając w link.');
    setActiveTab('login');
    setPassword('');
    setConfirmPassword('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    const { error } = await resetPassword(email.trim());
    setIsLoading(false);

    if (error) {
      toast.error('Nie udało się wysłać emaila z linkiem do resetowania hasła');
      return;
    }

    toast.success('Sprawdź swoją skrzynkę email. Wysłaliśmy link do resetowania hasła.');
    setShowForgotPassword(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if MFA is required (AAL level)
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedMFA = factors?.totp.some(f => f.status === 'verified');
      
      console.log('[RESET-PASSWORD] AAL check:', { 
        currentLevel: aalData?.currentLevel, 
        nextLevel: aalData?.nextLevel,
        hasVerifiedMFA 
      });

      // If user has MFA enrolled but not at AAL2, need to verify MFA first
      if (hasVerifiedMFA && aalData?.currentLevel !== 'aal2') {
        setMfaRequired(true);
        setIsLoading(false);
        toast.info('Wprowadź kod z aplikacji uwierzytelniającej');
        return;
      }

      const { error } = await updatePassword(password);
      
      if (error) {
        console.error('[RESET-PASSWORD] Error:', error);
        if (error.message.includes('AAL2') || error.message.includes('MFA')) {
          setMfaRequired(true);
          toast.info('Wymagana weryfikacja 2FA');
        } else if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast.error('Link do resetowania hasła wygasł. Wyślij nowy link.');
        } else {
          toast.error('Nie udało się zmienić hasła. Spróbuj wysłać nowy link.');
        }
        return;
      }

      toast.success('Hasło zostało zmienione!');
      setShowResetPassword(false);
      setMfaRequired(false);
      setMfaCode('');
      clearPasswordRecovery();
      setPassword('');
      setConfirmPassword('');
      navigate('/');
    } catch (err) {
      console.error('[RESET-PASSWORD] Exception:', err);
      toast.error('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mfaCode.length !== 6) {
      toast.error('Wprowadź 6-cyfrowy kod');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp.find(f => f.status === 'verified');
      
      if (!totpFactor) {
        toast.error('Brak skonfigurowanego 2FA');
        setIsLoading(false);
        return;
      }

      // Create challenge and verify
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        toast.error('Błąd weryfikacji: ' + challengeError.message);
        setIsLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast.error('Nieprawidłowy kod 2FA');
        setIsLoading(false);
        return;
      }

      // Now we have AAL2, can change password
      const { error } = await updatePassword(password);
      
      if (error) {
        console.error('[RESET-PASSWORD-MFA] Error:', error);
        toast.error('Nie udało się zmienić hasła: ' + error.message);
        return;
      }

      toast.success('Hasło zostało zmienione!');
      setShowResetPassword(false);
      setMfaRequired(false);
      setMfaCode('');
      clearPasswordRecovery();
      setPassword('');
      setConfirmPassword('');
      navigate('/');
    } catch (err) {
      console.error('[RESET-PASSWORD-MFA] Exception:', err);
      toast.error('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <img 
            src={logo} 
            alt="odgruzuj.pl logo" 
            className="w-32 h-32 mx-auto rounded-2xl shadow-lg"
          />
          <p className="text-muted-foreground">
            Twój codzienny motywator do porządkowania
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Witaj!</CardTitle>
            <CardDescription className="text-center">
              Zaloguj się lub utwórz nowe konto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Logowanie</TabsTrigger>
                <TabsTrigger value="register">Rejestracja</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                {showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Powrót do logowania
                    </button>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="twoj@email.pl"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Wyślemy Ci email z linkiem do resetowania hasła.
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wysyłanie...
                        </>
                      ) : (
                        'Wyślij link'
                      )}
                    </Button>
                  </form>
                ) : showResetPassword ? (
                  mfaRequired ? (
                    <form onSubmit={handleMFAVerifyAndResetPassword} className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                        <p className="text-sm font-medium">Weryfikacja dwuetapowa</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Masz włączone 2FA. Wprowadź kod z aplikacji uwierzytelniającej, aby zmienić hasło.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="mfa-code">Kod 2FA</Label>
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={mfaCode}
                            onChange={(value) => setMfaCode(value)}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading || mfaCode.length !== 6}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Weryfikacja...
                          </>
                        ) : (
                          'Zweryfikuj i zmień hasło'
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaRequired(false);
                          setMfaCode('');
                        }}
                        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Wróć do formularza hasła
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Wprowadź nowe hasło dla swojego konta.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nowe hasło</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="new-password"
                            type="password"
                            placeholder="Min. 6 znaków"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">Potwierdź nowe hasło</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirm-new-password"
                            type="password"
                            placeholder="Powtórz hasło"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Zmienianie hasła...
                          </>
                        ) : (
                          'Zmień hasło'
                        )}
                      </Button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="twoj@email.pl"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Hasło</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Zapomniałem hasła
                    </button>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logowanie...
                        </>
                      ) : (
                        'Zaloguj się'
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="twoj@email.pl"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Hasło</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Min. 6 znaków"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Potwierdź hasło</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="Powtórz hasło"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3 py-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="accept-privacy"
                        checked={acceptedPrivacy}
                        onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="accept-privacy"
                        className="text-sm text-muted-foreground leading-tight cursor-pointer"
                      >
                        Akceptuję{' '}
                        <Link
                          to="/privacy-policy"
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          Politykę Prywatności i RODO
                        </Link>
                        {' '}oraz wyrażam zgodę na przetwarzanie moich danych osobowych.
                      </label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="accept-terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="accept-terms"
                        className="text-sm text-muted-foreground leading-tight cursor-pointer"
                      >
                        Akceptuję{' '}
                        <Link
                          to="/terms"
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          Regulamin
                        </Link>
                        {' '}użytkowania aplikacji.
                      </label>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !allConsentsAccepted}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Tworzenie konta...
                      </>
                    ) : (
                      'Utwórz konto'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
