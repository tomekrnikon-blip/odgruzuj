# Odgruzuj v1.0.0 — Release Notes

Pierwsze pełne wydanie aplikacji **Odgruzuj** gotowe do publikacji w **Google Play** oraz **App Store**.

## ✨ Nowości
- Aplikacja natywna (Capacitor) dla Android i iOS — bundlowana z `dist/` (bez zależności od serwera dev).
- Moduł fiszek z limitem darmowym (2/dzień) i automatycznym resetem o 23:00 (pg_cron).
- Subskrypcje **PRO** przez Stripe Checkout (karta + ręczne przedłużenia BLIK-iem).
- Panel administracyjny: zarządzanie użytkownikami, rolami (admin/moderator/pro), reset limitów, wyszukiwarka.
- Push notifications: Web Push + FCM (Android) + APNs (iOS) sterowane przez `send-scheduled-notifications`.
- Reset hasła z obsługą MFA/OTP, bezpieczna ścieżka PKCE.

## 🔒 Bezpieczeństwo
- Wszystkie tabele `public.*` z RLS + jawnymi GRANT.
- Role użytkowników w osobnej tabeli `user_roles` + funkcja `has_role()` SECURITY DEFINER.
- Szyfrowanie kluczy push (AES-256) i maskowanie emaili w panelu admina.
- Restrykcyjne polityki dla `stripe_config`, `push_subscriptions`, `support_messages`, `user_roles`.
- Walidacja Zod w funkcjach edge wystawionych publicznie.

## 🛠 Techniczne
- Wyłączony `server.url` w `capacitor.config.ts` — wymóg sklepów.
- Wdrożone 20 funkcji edge (Supabase).
- Komentarze JSDoc w kluczowych hookach i funkcjach edge.
- Dokumentacja: `README.md`, `DATABASE_SCHEMA.md`, `TECHNICAL_DOCUMENTATION.md`, `STORE_PUBLICATION.md`.

## 📦 Załączniki
- `odgruzuj-graphics.zip` — komplet ikon, splashy i screenów do listingu w sklepach.
- `odgruzuj-docs.zip` — pełna dokumentacja techniczna + schemat bazy.
