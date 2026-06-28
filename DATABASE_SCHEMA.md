# 📊 Dokumentacja bazy danych — Odgruzuj.pl

> Baza PostgreSQL hostowana w Lovable Cloud (Supabase).
> Pełny dump SQL: [`/mnt/documents/odgruzuj-docs/database_schema.sql`](./database_schema.sql)

---

## Spis tabel

| Tabela | Krótki opis |
|---|---|
| `profiles` | Rozszerzone dane konta użytkownika (numer, email zaszyfrowany, status subskrypcji) |
| `user_roles` | Role aplikacyjne (`admin`, `moderator`, `user`) — **nigdy nie w `profiles`!** |
| `user_progress` | Postęp dzienny, licznik fiszek, data ostatniego resetu limitu |
| `global_flashcards` | Globalna biblioteka fiszek (zarządzana przez admina) |
| `user_flashcards` | Fiszki własne użytkownika |
| `completed_tasks` | Historia ukończonych fiszek (timestamp, kategoria) |
| `categories` | Kategorie fiszek (z polami premium/free) |
| `shopping_list` | Lista zakupów użytkownika |
| `notifications` | Powiadomienia tworzone przez admina |
| `user_notifications` | Powiązanie powiadomień z konkretnymi użytkownikami |
| `push_subscriptions` | Endpoint Web Push / FCM / APNs (klucze szyfrowane AES-256 w pgcrypto) |
| `support_messages` | Wiadomości z formularza wsparcia |
| `stripe_config` | Konfiguracja Stripe (Price ID, etykiety) — dostęp tylko super-admin |
| `admin_activity_logs` | Audyt akcji administratorów (z hashowanym IP) |

---

## Typy ENUM

- **`app_role`**: `admin` | `moderator` | `user`
- **`subscription_status`**: `free` | `active` | `cancelled` | `expired`

---

## Kluczowe tabele — szczegóły

### `profiles`
Każdy zarejestrowany użytkownik dostaje rekord po potwierdzeniu e-maila (trigger `assign_user_number_on_confirm`).
- `user_id` → `auth.users.id`
- `user_number` — numeryczny porządkowy (1 = super-admin)
- `email` — szyfrowany pgcrypto (`wy4...`) lub Web Crypto (`enc_...`)
- `display_name`, `subscription_status`, `subscription_expires_at`

### `user_roles`
Tabela rozdzielona od profilu, aby zapobiec eskalacji uprawnień.
- RLS: SELECT ograniczony do `auth.uid() = user_id`
- RESTRICTIVE INSERT/UPDATE/DELETE: tylko `has_role(auth.uid(),'admin')` lub `service_role`

### `user_progress`
- `daily_count` — fiszki ukończone dziś (dla limitu darmowego 2/dzień)
- `daily_limit_reset_at` — czas ostatniego resetu (cron 21:00 UTC + ręczny przycisk admina)
- `total_count`, `streak_days`

### `push_subscriptions`
- `endpoint`, `p256dh`, `auth` — klucze Web Push, **zaszyfrowane** triggerem `encrypt_push_subscription_keys`
- `platform` (`web` / `android` / `ios`)
- RLS: SELECT zablokowany na poziomie klienta; klient pisze tylko własne wpisy
- Odczyt wyłącznie przez SECURITY DEFINER (`get_push_subscriptions_decrypted_service`)

### `stripe_config`
- klucze: `price_monthly_id`, `price_yearly_id`, `display_price_monthly`, `display_price_yearly`
- SELECT: tylko super-admin (`user_number = 1`)
- Edge functions używają `service_role` (omijają RLS)

---

## Funkcje bazodanowe (kluczowe)

| Funkcja | Cel |
|---|---|
| `has_role(user, role)` | Bezpieczne sprawdzanie roli (STABLE SECURITY DEFINER) — używana w politykach RLS |
| `is_premium(user)` | Czy użytkownik ma aktywną subskrypcję |
| `encrypt_email / decrypt_email` | pgcrypto AES-256 dla pól `profiles.email` |
| `encrypt_push_data / decrypt_push_data` | Szyfrowanie kluczy Web Push z `vault.secrets` |
| `mask_email(email)` | Maskowanie e-maila dla widoku admina (`abcd****@dom.pl`) |
| `get_admin_profiles()` | Zwraca listę użytkowników z zamaskowanymi e-mailami (dla zwykłego admina) |
| `get_masked_email_for_user(uuid)` | Super-admin → pełny e-mail (z auditem); zwykły admin → zamaskowany |
| `get_push_subscriptions_decrypted_service()` | Wywoływana z `service_role` przez cron wysyłki |
| `save_and_encrypt_subscription(...)` | Bezpieczny INSERT/UPDATE push subskrypcji |
| `delete_user_push_subscription()` | RPC do anulowania subskrypcji push |
| `update_notification_time(time)` | Zmiana godziny powiadomienia |
| `reset_all_daily_limits()` | Reset dziennych liczników (uruchamiane przez cron + przycisk admina) |
| `log_admin_activity(...)` | Audyt akcji administratorów (hashuje IP) |
| `log_sensitive_data_access(...)` | Audyt dostępu do wrażliwych danych |
| `protect_admin_role()` | Trigger — uniemożliwia odebranie roli admina super-administratorowi |
| `handle_new_user()` | Trigger AFTER INSERT na `auth.users` — tworzy `profiles`, `user_roles`, `user_progress` |
| `assign_user_number_on_confirm()` | Trigger — nadaje `user_number` po potwierdzeniu e-maila |
| `distribute_notification()` | Trigger — rozsyła powiadomienia do `user_notifications` |
| `cleanup_unconfirmed_users_logic()` | Cron — kasuje niepotwierdzone konta > 24h |

---

## Wzorzec RLS w projekcie

1. **Wszystkie** tabele mają włączone RLS.
2. Polityki użytkownika zakresują dostęp do `auth.uid() = user_id`.
3. Polityki administratora używają **funkcji** `has_role()` zamiast porównań — chroni przed rekursją w politykach.
4. Tabele wrażliwe (`push_subscriptions`, `stripe_config`, `support_messages`) używają polityki `USING (false)` oraz dostępu wyłącznie przez funkcje `SECURITY DEFINER`.
5. Każda tabela publiczna ma jawne `GRANT` (Supabase nie nadaje domyślnych).

---

## Cron joby (`pg_cron`)

| Czas (UTC) | Akcja |
|---|---|
| `0 21 * * *` | `reset_all_daily_limits()` — reset dziennego limitu fiszek (23:00 PL latem) |
| `0 9 * * *` | Edge: `send-subscription-reminders` (10:00 PL) |
| `0 6 * * *` | Edge: `send-scheduled-notifications` (push do użytkowników) |
| `0 3 * * *` | `cleanup_unconfirmed_users_logic()` |

---

## Audyt bezpieczeństwa (zrealizowane)

- ✅ Szyfrowanie e-maili w `profiles` (pgcrypto + Web Crypto migracja)
- ✅ Szyfrowanie kluczy Web Push w `push_subscriptions`
- ✅ Walidacja Zod w edge functions (`send-push-notification`)
- ✅ Autoryzacja admina w `import-flashcards`
- ✅ RESTRICTIVE INSERT/UPDATE/DELETE na `user_roles` (przeciw self-escalation)
- ✅ SELECT na `stripe_config` ograniczony do super-admina
- ✅ Hashowanie IP w logach audytu (`hash_ip_address`)
- ✅ Logowanie dostępu do wrażliwych danych (`log_sensitive_data_access`)
