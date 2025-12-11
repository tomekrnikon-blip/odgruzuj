import { useState, useEffect } from "react";
import { Download, Smartphone, Share, MoreVertical, Plus, Check, Apple, Chrome, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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

        {/* Install Button for Android/Chrome */}
        {deferredPrompt && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="p-6">
              <Button 
                onClick={handleInstallClick} 
                size="lg" 
                className="w-full gap-2 text-lg h-14"
              >
                <Download className="h-5 w-5" />
                Zainstaluj teraz
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Instalacja jest szybka i nie wymaga sklepu z aplikacjami
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Apple className="h-5 w-5" />
                Instrukcja dla iPhone/iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback) */}
        {isAndroid && !deferredPrompt && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Chrome className="h-5 w-5" />
                Instrukcja dla Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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