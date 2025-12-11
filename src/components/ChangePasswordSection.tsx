import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
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
    
    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
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
      <form onSubmit={handleChangePassword} className="space-y-4">
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
    </div>
  );
}