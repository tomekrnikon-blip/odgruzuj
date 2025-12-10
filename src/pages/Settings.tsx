import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Check, Bell, Volume2, Vibrate, RotateCcw, Info, Sun, Moon, Monitor, Crown, Loader2, ExternalLink, Filter, BellRing, BellOff, MessageCircle, Send, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useFlashcardsFromDB, difficulties, difficultyLabels, difficultyIcons, DifficultyFilter } from "@/hooks/useFlashcardsFromDB";
import { useGameification } from "@/hooks/useGameification";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSubscription } from "@/hooks/useSubscription";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { 
    selectedCategories, 
    setSelectedCategories, 
    selectedDifficulties,
    setSelectedDifficulties,
    resetDailyProgress 
  } = useFlashcardsFromDB();
  const { resetStats } = useGameification();
  const { theme, setTheme } = useTheme();
  const { subscribed, subscriptionEnd, isLoading: subscriptionLoading, startCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    "odgruzuj_settings",
    defaultSettings
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    isLoading: pushLoading, 
    permission: pushPermission,
    subscribe: subscribePush, 
    unsubscribe: unsubscribePush,
    updateNotificationTime 
  } = usePushNotifications();

  const handleSendSupportMessage = async () => {
    if (!supportMessage.trim() || !user) return;
    
    setIsSendingMessage(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          message: supportMessage.trim()
        });
      
      if (error) throw error;
      
      setSupportMessage("");
      toast({
        title: "Wiadomość wysłana",
        description: "Administrator otrzyma Twoją wiadomość.",
      });
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać wiadomości. Spróbuj ponownie.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle upgrade success/cancel from URL params
  useEffect(() => {
    const upgradeStatus = searchParams.get('upgrade');
    if (upgradeStatus === 'success') {
      toast({
        title: "Sukces!",
        description: "Twoja subskrypcja Pro została aktywowana.",
      });
      checkSubscription();
    } else if (upgradeStatus === 'cancelled') {
      toast({
        title: "Anulowano",
        description: "Proces płatności został anulowany.",
        variant: "destructive",
      });
    }
  }, [searchParams, checkSubscription]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await startCheckout();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się rozpocząć procesu płatności.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się otworzyć portalu zarządzania subskrypcją.",
        variant: "destructive",
      });
    }
  };

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

  const toggleDifficulty = (difficulty: DifficultyFilter) => {
    if (selectedDifficulties.includes(difficulty)) {
      if (selectedDifficulties.length > 1) {
        setSelectedDifficulties(selectedDifficulties.filter((d) => d !== difficulty));
      } else {
        toast({
          title: "Musisz wybrać przynajmniej jeden poziom trudności",
          description: "Nie możesz odznaczyć wszystkich poziomów.",
        });
      }
    } else {
      setSelectedDifficulties([...selectedDifficulties, difficulty]);
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

  const themeOptions = [
    { value: "light", label: "Jasny", icon: Sun },
    { value: "dark", label: "Ciemny", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
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
        {/* Subscription */}
        <div className="card-elevated p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/20">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-semibold">Plan Pro</h2>
              <p className="text-sm text-muted-foreground">
                {subscriptionLoading ? "Sprawdzanie..." : subscribed ? "Aktywna subskrypcja" : "49,90 zł/rok"}
              </p>
            </div>
          </div>

          {subscriptionLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : subscribed ? (
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-xl p-4">
                <p className="text-sm font-medium text-primary">Status: Aktywna</p>
                {subscriptionEnd && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ważna do: {new Date(subscriptionEnd).toLocaleDateString('pl-PL')}
                  </p>
                )}
              </div>
              <button
                onClick={handleManageSubscription}
                className="w-full flex items-center justify-center gap-2 btn-secondary"
              >
                <ExternalLink className="w-4 h-4" />
                Zarządzaj subskrypcją
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Dostęp do ponad 300 fiszek</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Baza stale się powiększa!</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Wszystkie kategorie zadań</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Losowe fiszki według Twoich ustawień</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Synchronizacja między urządzeniami</span>
                </li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Przekierowanie...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Ulepsz do Pro
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Motyw</h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                  theme === value
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary border-2 border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5", theme === value ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", theme === value ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

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

        {/* Difficulty */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Poziom trudności</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Wybierz poziomy trudności fiszek
          </p>
          <div className="space-y-2">
            {difficulties.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => toggleDifficulty(difficulty)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                  selectedDifficulties.includes(difficulty)
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary border-2 border-transparent"
                )}
              >
                <span className="text-xl">{difficultyIcons[difficulty]}</span>
                <span className="flex-1 text-left font-medium">{difficultyLabels[difficulty]}</span>
                {selectedDifficulties.includes(difficulty) && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Powiadomienia Push</h2>
          
          {!pushSupported ? (
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground">
                Twoja przeglądarka nie obsługuje powiadomień push. Zainstaluj aplikację na urządzeniu mobilnym, aby otrzymywać powiadomienia.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {pushSubscribed ? (
                    <BellRing className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Powiadomienia push</p>
                    <p className="text-sm text-muted-foreground">
                      {pushSubscribed 
                        ? "Aktywne - otrzymasz codzienne przypomnienie" 
                        : pushPermission === 'denied'
                          ? "Zablokowane w przeglądarce"
                          : "Włącz, by otrzymywać przypomnienia"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (pushSubscribed) {
                      await unsubscribePush();
                    } else {
                      await subscribePush(settings.notificationTime + ':00');
                    }
                  }}
                  disabled={pushLoading || pushPermission === 'denied'}
                  className={cn(
                    "w-12 h-7 rounded-full transition-all duration-200",
                    pushSubscribed ? "bg-primary" : "bg-muted",
                    (pushLoading || pushPermission === 'denied') && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {pushLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                        pushSubscribed ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  )}
                </button>
              </div>

              {pushSubscribed && (
                <div className="pl-8">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Pora powiadomienia
                  </label>
                  <input
                    type="time"
                    value={settings.notificationTime}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        notificationTime: e.target.value,
                      }));
                      updateNotificationTime(e.target.value + ':00');
                    }}
                    className="px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              {pushPermission === 'denied' && (
                <div className="p-3 bg-destructive/10 rounded-xl">
                  <p className="text-sm text-destructive">
                    Powiadomienia są zablokowane. Zmień ustawienia w przeglądarce, aby je włączyć.
                  </p>
                </div>
              )}
            </div>
          )}
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

        {/* Contact Admin */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Kontakt z administratorem</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Masz pytanie lub sugestię? Napisz do nas!
          </p>
          <div className="space-y-3">
            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Napisz swoją wiadomość..."
              className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              disabled={isSendingMessage}
            />
            <button
              onClick={handleSendSupportMessage}
              disabled={!supportMessage.trim() || isSendingMessage}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isSendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wysyłanie...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Wyślij wiadomość
                </>
              )}
            </button>
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Dokumenty prawne</h2>
          </div>
          <Link
            to="/privacy-policy"
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="font-medium">Polityka prywatności i RODO</p>
              <p className="text-sm text-muted-foreground">
                Informacje o przetwarzaniu danych
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
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
