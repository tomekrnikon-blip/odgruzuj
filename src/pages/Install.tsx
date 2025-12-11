import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, Smartphone, Share, MoreVertical, Plus, Check, Apple, Chrome, ArrowDown, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import logo from "@/assets/logo.jpg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallConsents {
  acceptedPrivacy: boolean;
  acceptedTerms: boolean;
  acceptedAt: string | null;
}

const defaultConsents: InstallConsents = {
  acceptedPrivacy: false,
  acceptedTerms: false,
  acceptedAt: null,
};

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [consents, setConsents] = useLocalStorage<InstallConsents>("odgruzuj_install_consents", defaultConsents);

  const allConsentsAccepted = consents.acceptedPrivacy && consents.acceptedTerms;

  const handlePrivacyChange = (checked: boolean) => {
    setConsents(prev => ({
      ...prev,
      acceptedPrivacy: checked,
      acceptedAt: checked && prev.acceptedTerms ? new Date().toISOString() : prev.acceptedAt,
    }));
  };

  const handleTermsChange = (checked: boolean) => {
    setConsents(prev => ({
      ...prev,
      acceptedTerms: checked,
      acceptedAt: prev.acceptedPrivacy && checked ? new Date().toISOString() : prev.acceptedAt,
    }));
  };

  useEffect(() => {
    // Check if already installed
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };
    checkStandalone();

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error installing:", error);
    }
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img src={logo} alt="odgruzuj.pl" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-center gap-2 text-primary mb-4">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Aplikacja zainstalowana!</h1>
          <p className="text-muted-foreground mb-6">
            Używasz już aplikacji odgruzuj.pl w trybie pełnoekranowym.
          </p>
          <Button onClick={() => window.location.href = "/"} size="lg" className="gap-2">
            Przejdź do aplikacji
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img src={logo} alt="odgruzuj.pl" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Zainstaluj odgruzuj.pl</h1>
          <p className="text-muted-foreground">
            Dodaj aplikację do ekranu głównego i korzystaj z niej jak z natywnej aplikacji
          </p>
        </div>

        {/* Consent Section */}
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Wymagane zgody
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={consents.acceptedPrivacy}
                onCheckedChange={(checked) => handlePrivacyChange(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="privacy" className="text-sm cursor-pointer">
                Akceptuję{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline font-medium">
                  Politykę Prywatności
                </Link>{" "}
                oraz wyrażam zgodę na przetwarzanie danych osobowych zgodnie z RODO.
              </label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={consents.acceptedTerms}
                onCheckedChange={(checked) => handleTermsChange(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                Akceptuję{" "}
                <Link to="/terms" className="text-primary hover:underline font-medium">
                  Regulamin użytkowania
                </Link>{" "}
                aplikacji odgruzuj.pl.
              </label>
            </div>
            {!allConsentsAccepted && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Zaakceptuj powyższe zgody, aby kontynuować instalację
              </p>
            )}
            {consents.acceptedAt && (
              <p className="text-xs text-muted-foreground">
                ✓ Zgody zaakceptowane: {new Date(consents.acceptedAt).toLocaleDateString('pl-PL')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Install Button for Android/Chrome */}
        {deferredPrompt && (
          <Card className={cn(
            "mb-6 transition-all",
            allConsentsAccepted ? "border-primary/50 bg-primary/5" : "border-muted bg-muted/30 opacity-60"
          )}>
            <CardContent className="p-6">
              <Button 
                onClick={handleInstallClick} 
                size="lg" 
                className="w-full gap-2 text-lg h-14"
                disabled={!allConsentsAccepted}
              >
                <Download className="h-5 w-5" />
                Zainstaluj teraz
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                {allConsentsAccepted 
                  ? "Instalacja jest szybka i nie wymaga sklepu z aplikacjami"
                  : "Zaakceptuj zgody powyżej, aby zainstalować aplikację"
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card className={cn(
            "mb-6 transition-all",
            !allConsentsAccepted && "opacity-60"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Apple className="h-5 w-5" />
                Instrukcja dla iPhone/iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!allConsentsAccepted && (
                <p className="text-sm text-destructive font-medium">
                  Zaakceptuj wymagane zgody powyżej, aby kontynuować instalację.
                </p>
              )}
              <div className={cn("space-y-4", !allConsentsAccepted && "pointer-events-none")}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Kliknij ikonę Udostępnij</p>
                    <p className="text-sm text-muted-foreground">
                      Na dole ekranu (Safari) kliknij ikonę <Share className="inline h-4 w-4" />
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Przewiń i wybierz "Dodaj do ekranu początkowego"</p>
                    <p className="text-sm text-muted-foreground">
                      Ikona <Plus className="inline h-4 w-4" /> pojawi się na liście opcji
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Potwierdź instalację</p>
                    <p className="text-sm text-muted-foreground">
                      Kliknij "Dodaj" w prawym górnym rogu
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback) */}
        {isAndroid && !deferredPrompt && (
          <Card className={cn(
            "mb-6 transition-all",
            !allConsentsAccepted && "opacity-60"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Chrome className="h-5 w-5" />
                Instrukcja dla Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!allConsentsAccepted && (
                <p className="text-sm text-destructive font-medium">
                  Zaakceptuj wymagane zgody powyżej, aby kontynuować instalację.
                </p>
              )}
              <div className={cn("space-y-4", !allConsentsAccepted && "pointer-events-none")}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Kliknij menu przeglądarki</p>
                    <p className="text-sm text-muted-foreground">
                      Kliknij ikonę <MoreVertical className="inline h-4 w-4" /> w prawym górnym rogu
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Wybierz "Zainstaluj aplikację" lub "Dodaj do ekranu głównego"</p>
                    <p className="text-sm text-muted-foreground">
                      Opcja może się różnić w zależności od przeglądarki
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Potwierdź instalację</p>
                    <p className="text-sm text-muted-foreground">
                      Ikona aplikacji pojawi się na ekranie głównym
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Chrome className="h-5 w-5" />
                Instrukcja instalacji
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Otwórz tę stronę na telefonie, aby zobaczyć opcje instalacji mobilnej.
              </p>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">W przeglądarce Chrome</p>
                  <p className="text-sm text-muted-foreground">
                    Kliknij ikonę instalacji w pasku adresu lub menu przeglądarki
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dlaczego warto zainstalować?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Pełnoekranowy tryb</p>
                  <p className="text-sm text-muted-foreground">Bez paska przeglądarki</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Tryb offline</p>
                  <p className="text-sm text-muted-foreground">Działa bez internetu</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ArrowDown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Szybki dostęp</p>
                  <p className="text-sm text-muted-foreground">Ikona na ekranie głównym</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Nie wymaga App Store ani Google Play</p>
          <p className="mt-1">Instalacja zajmuje sekundę!</p>
        </div>
      </div>
    </div>
  );
}