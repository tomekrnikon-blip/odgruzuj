# 🧹 Odgruzuj.pl — Dokumentacja techniczna

Aplikacja PWA + Capacitor (Android/iOS) do walki z bałaganem przez fiszki-zadania.
Stack: **React 18 + Vite + TypeScript + Tailwind + Lovable Cloud (Supabase)**.

## 📚 Dokumenty

| Plik | Co zawiera |
|---|---|
| [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | Opis tabel, RLS, funkcji bazodanowych |
| [`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md) | Pełna mapa projektu i stack |
| [`ICONS_AND_SPLASH_SETUP.md`](./ICONS_AND_SPLASH_SETUP.md) | Instrukcja ikon + splash dla Android/iOS |

## 🏗️ Architektura — jak to działa

```
┌────────────────────────────────────────────────────────────┐
│  Klient (React)                                            │
│   ├─ useAuth          → Supabase Auth (sesja, recovery)    │
│   ├─ useSubscription  → status PRO (DB + Stripe)           │
│   ├─ useFlashcardsFromDB → fiszki + limit dzienny          │
│   ├─ useAdminAuth     → sprawdzanie roli (has_role)        │
│   └─ usePushNotifications → Web Push / FCM / APNs          │
└──────────────┬─────────────────────────────────────────────┘
               │ HTTPS + JWT
               ▼
┌────────────────────────────────────────────────────────────┐
│  Lovable Cloud (Supabase)                                  │
│   ├─ PostgreSQL — 14 tabel, ~30 funkcji SECURITY DEFINER  │
│   ├─ Row Level Security na WSZYSTKICH tabelach            │
│   ├─ Edge Functions (Deno) — 20 funkcji serwerowych       │
│   └─ pg_cron — codzienne joby (reset limitów, push)       │
└──────────────┬─────────────────────────────────────────────┘
               │
               ├─→ Stripe (subskrypcje + BLIK/P24)
               ├─→ Resend (e-maile transakcyjne)
               ├─→ FCM (push Android/iOS via Firebase)
               └─→ Web Push (PWA)
```

## 🔑 Kluczowe przepływy

### 1. Logowanie i sesja
- `useAuth` subskrybuje `onAuthStateChange` → reszta aplikacji widzi zmianę natychmiast.
- Sesja autoodnawia się — token zapisany w localStorage przez klienta Supabase.
- Reset hasła: link z e-maila → `/auth?mode=reset` → `PASSWORD_RECOVERY` → nowe hasło.

### 2. Subskrypcja PRO — dwa źródła prawdy
- **DB** (`profiles.subscription_status='active'`): nadana ręcznie / BLIK
- **Stripe** (`check-subscription`): cykliczna kartą
- Front sprawdza DB najpierw, potem Stripe (BLIK nie ma recurring).

### 3. Limit dzienny dla `free`
- 2 fiszki/dzień → `user_progress.daily_count`.
- Reset: cron 21:00 UTC + przycisk "Reset limitu" w panelu admina.
- Synchronizacja: localStorage ↔ `daily_limit_reset_at` (nowszy wygrywa).

### 4. Powiadomienia push
- Klient rejestruje subskrypcję przez RPC `save_and_encrypt_subscription`.
- Klucze (p256dh, auth) szyfrowane pgcrypto z `vault.secrets`.
- Cron wywołuje `send-scheduled-notifications` → wybiera użytkowników o godzinie X.
- Wspiera Web Push (PWA), FCM (Android), APNs (iOS via FCM).

### 5. Bezpieczeństwo
- E-maile w `profiles` szyfrowane (pgcrypto `wy4...` lub Web Crypto `enc_...`).
- Role w osobnej tabeli `user_roles` z RESTRICTIVE policies (anti self-escalation).
- `stripe_config` widoczna tylko dla super-admina.
- `push_subscriptions` z `USING(false)` na SELECT — czytane tylko przez SECURITY DEFINER.
- Walidacja Zod w edge functions.

## 🚀 Deploy

Lovable automatycznie synchronizuje kod do GitHuba w czasie rzeczywistym i deployuje edge functions natychmiast po zmianie.

Mobile (Capacitor):
```bash
git pull
npm install
npx cap sync
npx cap run android    # lub ios
```
