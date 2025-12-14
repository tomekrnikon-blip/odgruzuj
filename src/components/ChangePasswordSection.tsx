import { useState } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMFA } from "@/hooks/useMFA";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Hasło musi mieć co najmniej 6 znaków" }),
  confirmPassword: z.string().min(6, { message: "Hasło musi mieć co najmniej 6 znaków" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"],
});

export function ChangePasswordSection() {
  const { updatePassword } = useAuth();
  const { isEnrolled, isVerified, verifyMFA, isLoading: mfaLoading } = useMFA();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [showMfaInput, setShowMfaInput] = useState(false);

  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6) {
      toast({
        title: "Błąd",
        description: "Wprowadź 6-cyfrowy kod z aplikacji",
        variant: "destructive",
      });
      return;
    }

    const success = await verifyMFA(mfaCode);
    if (success) {
      setShowMfaInput(false);
      setMfaCode("");
      toast({
        title: "Sukces",
        description: "Weryfikacja MFA pomyślna. Możesz teraz zmienić hasło.",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If MFA is enrolled but not verified for this session, require verification first
    if (isEnrolled && !isVerified) {
      setShowMfaInput(true);
      toast({
        title: "Wymagana weryfikacja",
        description: "Wprowadź kod z aplikacji uwierzytelniającej, aby zmienić hasło.",
      });
      return;
    }
    
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      toast({
        title: "Błąd walidacji",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('AAL2')) {
        setShowMfaInput(true);
        toast({
          title: "Wymagana weryfikacja",
          description: "Wprowadź kod z aplikacji uwierzytelniającej, aby zmienić hasło.",
        });
        return;
      }
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić hasła. Spróbuj ponownie.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sukces",
      description: "Hasło zostało zmienione.",
    });
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-heading font-semibold">Zmień hasło</h2>
      </div>
      
      {showMfaInput && isEnrolled && !isVerified ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Masz włączone 2FA. Wprowadź kod, aby kontynuować.</span>
          </div>
          <div className="space-y-2">
            <Label>Kod z aplikacji uwierzytelniającej</Label>
            <InputOTP
              value={mfaCode}
              onChange={setMfaCode}
              maxLength={6}
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleVerifyMFA}
              disabled={mfaLoading || mfaCode.length !== 6}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {mfaLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Weryfikacja...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Zweryfikuj
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMfaInput(false);
                setMfaCode("");
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleChangePassword} className="space-y-4">
          {isEnrolled && isVerified && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
              <span>Sesja zweryfikowana przez 2FA</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 6 znaków"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Powtórz hasło"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Zmienianie...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Zmień hasło
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
