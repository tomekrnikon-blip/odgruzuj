import { useState, useEffect } from "react";
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

type Step = "password" | "mfa-verify";

export function ChangePasswordSection() {
  const { updatePassword, user } = useAuth();
  const { isEnrolled, verifyMFA, refreshStatus } = useMFA();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<Step>("password");

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleStartPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      toast({
        title: "Błąd walidacji",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Błąd",
        description: "Nie można pobrać adresu email użytkownika.",
        variant: "destructive",
      });
      return;
    }

    // If MFA is enrolled, require MFA verification first
    if (isEnrolled) {
      setStep("mfa-verify");
      return;
    }

    // No MFA - proceed directly to password change
    await changePassword();
  };

  const handleMFAVerify = async () => {
    if (mfaCode.length !== 6) {
      toast({
        title: "Błąd",
        description: "Wprowadź 6-cyfrowy kod z aplikacji.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const success = await verifyMFA(mfaCode);
    
    if (!success) {
      toast({
        title: "Błąd",
        description: "Nieprawidłowy kod MFA. Spróbuj ponownie.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "MFA zweryfikowane",
      description: "Zmieniam hasło...",
    });

    // After MFA verification, change password
    await changePassword();
    setIsLoading(false);
  };

  const changePassword = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        console.error("Password update error:", error);
        toast({
          title: "Błąd",
          description: error.message || "Nie udało się zmienić hasła. Spróbuj ponownie.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Sukces",
        description: "Hasło zostało zmienione.",
      });
      
      // Reset all state
      setPassword("");
      setConfirmPassword("");
      setMfaCode("");
      setStep("password");
    } catch (err) {
      console.error("Password update exception:", err);
      toast({
        title: "Błąd",
        description: "Wystąpił nieoczekiwany błąd podczas zmiany hasła.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleCancel = () => {
    setStep("password");
    setMfaCode("");
  };

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-heading font-semibold">Zmień hasło</h2>
      </div>
      
      {step === "mfa-verify" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Masz włączone 2FA. Wprowadź kod z aplikacji uwierzytelniającej.</span>
          </div>
          <div className="space-y-2">
            <Label>Kod 2FA</Label>
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
              onClick={handleMFAVerify}
              disabled={isLoading || mfaCode.length !== 6}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Zmieniam hasło...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Zweryfikuj i zmień hasło
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleStartPasswordChange} className="space-y-4">
          {isEnrolled && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
              <span>2FA jest włączone - będzie wymagana weryfikacja.</span>
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
                Zmieniam hasło...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                {isEnrolled ? "Kontynuuj z 2FA" : "Zmień hasło"}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
