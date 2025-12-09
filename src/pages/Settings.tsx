import { useState } from "react";
import { Check, Bell, Volume2, Vibrate, RotateCcw, Info } from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useGameification } from "@/hooks/useGameification";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { categories, categoryIcons, Category } from "@/data/flashcards";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AppSettings {
  notificationsEnabled: boolean;
  notificationTime: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const defaultSettings: AppSettings = {
  notificationsEnabled: true,
  notificationTime: "09:00",
  soundEnabled: true,
  vibrationEnabled: true,
};

export default function Settings() {
  const { selectedCategories, setSelectedCategories, resetDailyProgress } =
    useFlashcards();
  const { resetStats } = useGameification();
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    "odgruzuj_settings",
    defaultSettings
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleCategory = (category: Category) => {
    if (selectedCategories.includes(category)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== category));
      } else {
        toast({
          title: "Musisz wybrać przynajmniej jedną kategorię",
          description: "Nie możesz odznaczyć wszystkich kategorii.",
        });
      }
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetProgress = () => {
    resetStats();
    resetDailyProgress();
    setShowResetConfirm(false);
    toast({
      title: "Postępy zresetowane",
      description: "Wszystkie dane zostały wyczyszczone.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-heading font-bold">Ustawienia</h1>
          <p className="text-sm text-muted-foreground">
            Dostosuj aplikację do siebie
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Categories */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Kategorie</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Wybierz kategorie zadań, które chcesz otrzymywać
          </p>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                  selectedCategories.includes(category)
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary border-2 border-transparent"
                )}
              >
                <span className="text-xl">{categoryIcons[category]}</span>
                <span className="flex-1 text-left font-medium">{category}</span>
                {selectedCategories.includes(category) && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Powiadomienia</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Powiadomienia</p>
                  <p className="text-sm text-muted-foreground">
                    Codzienne przypomnienie
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting("notificationsEnabled")}
                className={cn(
                  "w-12 h-7 rounded-full transition-all duration-200",
                  settings.notificationsEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                    settings.notificationsEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {settings.notificationsEnabled && (
              <div className="pl-8">
                <label className="block text-sm text-muted-foreground mb-2">
                  Pora powiadomienia
                </label>
                <input
                  type="time"
                  value={settings.notificationTime}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notificationTime: e.target.value,
                    }))
                  }
                  className="px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sound & Vibration */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Dźwięk i Wibracje</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Dźwięk</p>
                  <p className="text-sm text-muted-foreground">
                    Po zakończeniu czasu
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting("soundEnabled")}
                className={cn(
                  "w-12 h-7 rounded-full transition-all duration-200",
                  settings.soundEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                    settings.soundEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Wibracje</p>
                  <p className="text-sm text-muted-foreground">
                    Po zakończeniu czasu
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting("vibrationEnabled")}
                className={cn(
                  "w-12 h-7 rounded-full transition-all duration-200",
                  settings.vibrationEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                    settings.vibrationEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Dane</h2>
          
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Resetuj postępy</p>
                <p className="text-sm opacity-80">
                  Usuń wszystkie dane i zacznij od nowa
                </p>
              </div>
            </button>
          ) : (
            <div className="p-4 bg-destructive/10 rounded-xl">
              <p className="font-medium text-destructive mb-3">
                Czy na pewno chcesz zresetować wszystkie postępy?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Ta operacja jest nieodwracalna. Utracisz wszystkie punkty,
                odznaki i historię zadań.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleResetProgress}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-6 py-3 font-medium transition-all"
                >
                  Resetuj
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="card-flat p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">O aplikacji</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            <strong>odgruzuj.pl</strong> - aplikacja do declutteringu z
            zabawnymi fiszkami i grywalizacją.
          </p>
          <p className="text-xs text-muted-foreground">
            Wersja 1.0.0 • Made with 💚
          </p>
        </div>
      </main>
    </div>
  );
}
