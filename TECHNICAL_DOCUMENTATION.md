# Dokumentacja Techniczna - Odgruzuj

## Spis treści
1. [Przegląd projektu](#przegląd-projektu)
2. [Stack technologiczny](#stack-technologiczny)
3. [Struktura projektu](#struktura-projektu)
4. [Architektura aplikacji](#architektura-aplikacji)
5. [Baza danych](#baza-danych)
6. [Funkcje Edge](#funkcje-edge)
7. [Autentykacja i autoryzacja](#autentykacja-i-autoryzacja)
8. [Konfiguracja mobilna](#konfiguracja-mobilna)
9. [Zmienne środowiskowe](#zmienne-środowiskowe)

---

## Przegląd projektu

**Nazwa aplikacji:** Odgruzuj  
**Typ:** Progressive Web App (PWA) + Native Mobile (Capacitor)  
**Przeznaczenie:** Aplikacja do zarządzania zadaniami z systemem gamifikacji

---

## Stack technologiczny

### Frontend
| Technologia | Wersja | Opis |
|-------------|--------|------|
| React | 18.3.1 | Biblioteka UI |
| TypeScript | - | Typowanie statyczne |
| Vite | - | Build tool i dev server |
| Tailwind CSS | - | Framework CSS |
| shadcn/ui | - | Komponenty UI |
| React Router | 6.30.1 | Routing |
| TanStack Query | 5.83.0 | Zarządzanie stanem serwera |
| Recharts | 2.15.4 | Wykresy i wizualizacje |
| Lucide React | 0.462.0 | Ikony |

### Backend (Lovable Cloud / Supabase)
| Technologia | Opis |
|-------------|------|
| PostgreSQL | Baza danych |
| Supabase Auth | Autentykacja użytkowników |
| Edge Functions | Funkcje serverless (Deno) |
| Row Level Security | Bezpieczeństwo na poziomie wierszy |

### Mobile
| Technologia | Wersja | Opis |
|-------------|--------|------|
| Capacitor | 8.0.0 | Framework cross-platform |
| @capacitor/android | 8.0.0 | Plugin Android |
| @capacitor/ios | 8.0.0 | Plugin iOS |
| @capacitor/push-notifications | 8.0.0 | Powiadomienia push |

### Integracje zewnętrzne
| Serwis | Opis |
|--------|------|
| Stripe | Płatności i subskrypcje |
| Web Push API | Powiadomienia przeglądarki |
| Resend | Wysyłka e-maili |

---

## Struktura projektu

```
odgruzuj/
├── android/                    # Projekt Android (Capacitor)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/pl/odgruzuj/app/
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── build.gradle
│   └── settings.gradle
│
├── public/                     # Zasoby statyczne
│   ├── favicon.jpg
│   ├── icon-*.png              # Ikony PWA
│   ├── screenshot-*.png        # Screenshoty dla sklepów
│   ├── sw-push.js              # Service Worker dla push
│   └── robots.txt
│
├── src/
│   ├── assets/                 # Zasoby aplikacji
│   │   └── logo.jpg
│   │
│   ├── components/             # Komponenty React
│   │   ├── ui/                 # Komponenty shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (40+ komponentów)
│   │   │
│   │   ├── admin/              # Komponenty panelu admina
│   │   │   ├── CategoryManager.tsx
│   │   │   ├── FlashcardManager.tsx
│   │   │   ├── MFASetup.tsx
│   │   │   ├── MFAVerification.tsx
│   │   │   ├── NotificationManager.tsx
│   │   │   ├── StripeConfigManager.tsx
│   │   │   ├── SupportMessagesManager.tsx
│   │   │   └── UserManager.tsx
│   │   │
│   │   ├── AddTaskModal.tsx    # Modal dodawania zadań
│   │   ├── BadgeDisplay.tsx    # Wyświetlanie odznak
│   │   ├── FlashCard.tsx       # Karta zadania
│   │   ├── Navigation.tsx      # Nawigacja główna
│   │   ├── NotificationBell.tsx# Dzwonek powiadomień
│   │   ├── PullToRefresh.tsx   # Pull-to-refresh
│   │   ├── ReminderClock.tsx   # Zegar przypomnienia
│   │   ├── ShoppingList.tsx    # Lista zakupów
│   │   ├── SplashScreen.tsx    # Ekran ładowania
│   │   ├── StatsCard.tsx       # Karta statystyk
│   │   ├── ThemeProvider.tsx   # Provider motywu
│   │   └── Timer.tsx           # Komponent timera
│   │
│   ├── data/                   # Dane statyczne
│   │   ├── flashcards.ts       # Definicje fiszek
│   │   └── flashcards-import.json
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useAdminAuth.ts     # Autoryzacja admina
│   │   ├── useAuth.ts          # Autentykacja
│   │   ├── useCategories.ts    # Zarządzanie kategoriami
│   │   ├── useFlashcards.ts    # Obsługa fiszek
│   │   ├── useFlashcardsFromDB.ts
│   │   ├── useGameification.ts # System gamifikacji
│   │   ├── useGlobalFlashcards.ts
│   │   ├── useLocalStorage.ts  # Lokalne przechowywanie
│   │   ├── useMFA.ts           # Uwierzytelnianie 2FA
│   │   ├── useNotifications.ts # Powiadomienia
│   │   ├── usePushNotifications.ts
│   │   ├── useStripePrices.ts  # Ceny Stripe
│   │   ├── useSubscription.ts  # Subskrypcje
│   │   ├── useTimer.ts         # Obsługa timera
│   │   ├── useUserProfile.ts   # Profil użytkownika
│   │   └── use-mobile.tsx      # Wykrywanie urządzenia
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Klient Supabase (auto-gen)
│   │       └── types.ts        # Typy DB (auto-gen)
│   │
│   ├── lib/
│   │   ├── auth/
│   │   │   └── 2fa.ts          # Logika 2FA
│   │   └── utils.ts            # Narzędzia pomocnicze
│   │
│   ├── pages/                  # Strony aplikacji
│   │   ├── Admin.tsx           # Panel administratora
│   │   ├── Auth.tsx            # Logowanie/Rejestracja
│   │   ├── Dashboard.tsx       # Strona główna
│   │   ├── History.tsx         # Historia zadań
│   │   ├── Index.tsx           # Landing page
│   │   ├── Install.tsx         # Instrukcja instalacji
│   │   ├── MyTasks.tsx         # Moje zadania
│   │   ├── NotFound.tsx        # Strona 404
│   │   ├── PrivacyPolicy.tsx   # Polityka prywatności
│   │   ├── Settings.tsx        # Ustawienia
│   │   ├── Stats.tsx           # Statystyki
│   │   └── Terms.tsx           # Regulamin
│   │
│   ├── App.tsx                 # Główny komponent
│   ├── App.css                 # Style globalne
│   ├── index.css               # Zmienne CSS / Tailwind
│   ├── main.tsx                # Entry point
│   └── vite-env.d.ts           # Typy Vite
│
├── supabase/
│   ├── config.toml             # Konfiguracja Supabase
│   ├── migrations/             # Migracje bazy danych
│   └── functions/              # Edge Functions
│       ├── check-subscription/
│       ├── cleanup-unconfirmed-users/
│       ├── create-checkout/
│       ├── customer-portal/
│       ├── encrypt-all-emails/
│       ├── encrypt-user-email/
│       ├── get-stripe-prices/
│       ├── get-vapid-key/
│       ├── import-flashcards/
│       ├── rotate-encryption-key/
│       ├── send-push-notification/
│       ├── send-scheduled-notifications/
│       └── setup-vault-key/
│
├── capacitor.config.ts         # Konfiguracja Capacitor
├── index.html                  # HTML entry point
├── tailwind.config.ts          # Konfiguracja Tailwind
├── vite.config.ts              # Konfiguracja Vite
├── tsconfig.json               # Konfiguracja TypeScript
└── package.json                # Zależności NPM
```

---

## Architektura aplikacji

### Przepływ danych

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │  Pages  │───▶│  Components  │───▶│  Custom Hooks   │    │
│  └─────────┘    └──────────────┘    └────────┬────────┘    │
│                                               │              │
│  ┌─────────────────────────────────────────────┐            │
│  │              TanStack Query                  │            │
│  │         (cache, mutations, queries)          │            │
│  └─────────────────────┬───────────────────────┘            │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT                           │
│         (supabase-js SDK - auto-generated)                  │
└─────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   PostgreSQL    │  │  Edge Functions │                   │
│  │   + RLS         │  │  (Deno Runtime) │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Supabase      │  │     Vault       │                   │
│  │   Auth          │  │   (Secrets)     │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Routing

| Ścieżka | Komponent | Dostęp |
|---------|-----------|--------|
| `/` | Index | Publiczny |
| `/auth` | Auth | Publiczny |
| `/dashboard` | Dashboard | Chroniony |
| `/history` | History | Chroniony |
| `/stats` | Stats | Chroniony |
| `/settings` | Settings | Chroniony |
| `/my-tasks` | MyTasks | Chroniony |
| `/admin` | Admin | Admin only |
| `/install` | Install | Publiczny |
| `/privacy-policy` | PrivacyPolicy | Publiczny |
| `/terms` | Terms | Publiczny |

---

## Baza danych

### Tabele

| Tabela | Opis |
|--------|------|
| `profiles` | Profile użytkowników |
| `user_roles` | Role użytkowników (admin, user, moderator) |
| `user_progress` | Postęp i gamifikacja |
| `global_flashcards` | Globalne zadania (fiszki) |
| `user_flashcards` | Własne zadania użytkowników |
| `completed_tasks` | Historia ukończonych zadań |
| `categories` | Kategorie zadań |
| `notifications` | Powiadomienia |
| `user_notifications` | Powiadomienia użytkowników |
| `push_subscriptions` | Subskrypcje push (zaszyfrowane) |
| `shopping_list` | Lista zakupów |
| `support_messages` | Wiadomości do supportu |
| `stripe_config` | Konfiguracja Stripe |
| `admin_activity_logs` | Logi aktywności admina |

### Kluczowe funkcje bazy danych

| Funkcja | Opis |
|---------|------|
| `has_role(user_id, role)` | Sprawdza rolę użytkownika |
| `is_premium(user_id)` | Sprawdza status premium |
| `encrypt_email()` / `decrypt_email()` | Szyfrowanie e-maili |
| `encrypt_push_data()` / `decrypt_push_data()` | Szyfrowanie danych push |
| `mask_email()` | Maskowanie e-maili |
| `get_admin_profiles()` | Pobiera profile dla admina |
| `distribute_notification()` | Rozsyła powiadomienia |

### Bezpieczeństwo (RLS)

Wszystkie tabele mają włączone Row Level Security (RLS) z politykami:
- Użytkownicy mogą CRUD tylko swoje dane
- Administratorzy mają rozszerzone uprawnienia
- Anonimowy dostęp jest zablokowany
- Dane wrażliwe są szyfrowane (PGP)

---

## Funkcje Edge

| Funkcja | Opis |
|---------|------|
| `check-subscription` | Sprawdza status subskrypcji |
| `create-checkout` | Tworzy sesję Stripe Checkout |
| `customer-portal` | Portal klienta Stripe |
| `get-stripe-prices` | Pobiera ceny produktów |
| `send-push-notification` | Wysyła powiadomienia push |
| `send-scheduled-notifications` | Zaplanowane powiadomienia (CRON) |
| `cleanup-unconfirmed-users` | Usuwa niepotwierdzonych użytkowników |
| `get-vapid-key` | Zwraca klucz VAPID |
| `setup-vault-key` | Konfiguruje klucz szyfrowania |
| `rotate-encryption-key` | Rotacja klucza szyfrowania |
| `encrypt-all-emails` | Szyfruje wszystkie e-maile |
| `import-flashcards` | Importuje fiszki |

---

## Autentykacja i autoryzacja

### Metody logowania
- Email + hasło
- Auto-confirm dla emaili (środowisko dev)

### Role użytkowników
| Rola | Uprawnienia |
|------|-------------|
| `user` | Podstawowy dostęp |
| `moderator` | Zarządzanie fiszkami i kategoriami |
| `admin` | Pełny dostęp + panel admina |

### Zabezpieczenia
- MFA (2FA) dla administratorów
- Szyfrowanie e-maili w bazie (PGP)
- Szyfrowanie danych push
- Hashowanie IP w logach
- Rate limiting na Edge Functions

---

## Konfiguracja mobilna

### Capacitor Config
```typescript
// capacitor.config.ts
{
  appId: 'app.lovable.XXXX',
  appName: 'odgruzuj',
  webDir: 'dist',
  server: {
    url: 'https://XXX.lovableproject.com', // Dev only
    cleartext: true
  }
}
```

### Android
- Min SDK: 22
- Target SDK: 34
- Permissions: Internet, Camera, Notifications

### Build produkcyjny
1. Usuń `server` z capacitor.config.ts
2. `npm run build`
3. `npx cap sync`
4. Podpisz APK/Bundle

---

## Zmienne środowiskowe

### Frontend (Vite)
| Zmienna | Opis |
|---------|------|
| `VITE_SUPABASE_URL` | URL projektu Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Klucz publiczny |
| `VITE_SUPABASE_PROJECT_ID` | ID projektu |

### Backend (Secrets)
| Secret | Opis |
|--------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Klucz service role |
| `STRIPE_SECRET_KEY` | Klucz Stripe |
| `VAPID_PUBLIC_KEY` | Klucz VAPID publiczny |
| `VAPID_PRIVATE_KEY` | Klucz VAPID prywatny |
| `PUSH_ENCRYPTION_KEY` | Klucz szyfrowania push |
| `RESEND_API_KEY` | Klucz API Resend |
| `LOVABLE_API_KEY` | Klucz Lovable AI |

---

## Uruchomienie projektu

### Lokalne środowisko
```bash
# Klonowanie
git clone <repo-url>
cd odgruzuj

# Instalacja zależności
npm install

# Uruchomienie dev server
npm run dev

# Build produkcyjny
npm run build
```

### Mobile (Android)
```bash
# Dodanie platformy
npx cap add android

# Synchronizacja
npx cap sync android

# Uruchomienie
npx cap run android
```

### Mobile (iOS)
```bash
# Dodanie platformy
npx cap add ios

# Synchronizacja
npx cap sync ios

# Otwarcie w Xcode
npx cap open ios
```

---

## Kontakt

Wygenerowano automatycznie przez Lovable AI.
