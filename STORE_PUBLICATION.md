# Publikacja Odgruzuj w Google Play i App Store

Kompletny przewodnik od `git pull` do wysyłki review. Wykonuje się **lokalnie** — Lovable sandbox nie buduje APK/IPA.

---

## 0. Wymagania wstępne

| Platforma | Wymóg |
|---|---|
| Android | Android Studio (najnowszy), JDK 17, konto Google Play Console (25 USD jednorazowo) |
| iOS | macOS + Xcode 15+, konto Apple Developer (99 USD/rok), CocoaPods (`sudo gem install cocoapods`) |
| Wspólne | Node 18+, `npm`, repozytorium sklonowane z GitHub |

---

## 1. Synchronizacja kodu i konfiguracja produkcyjna

```bash
git pull
npm install
# Upewnij się, że capacitor.config.ts NIE ma odkomentowanego `server.url` (jest już wyłączone w repo).
npm run build          # buduje dist/
npx cap sync           # kopiuje dist/ + pluginy do android/ i ios/
```

> ⚠️ Jeśli kiedykolwiek włączysz `server.url` do hot-reloadu — **zakomentuj go** przed `npx cap sync` do release. Inaczej Google/Apple odrzucą binarkę.

---

## 2. Android — Google Play

### 2.1. Wersjonowanie
W `android/app/build.gradle` przy każdym uploadzie zwiększaj:
```gradle
versionCode 2          // liczba całkowita, +1 za każdym razem
versionName "1.0.1"    // semver widoczny dla użytkownika
```

### 2.2. Keystore (jednorazowo, **zachowaj na zawsze!**)
```bash
keytool -genkey -v -keystore ~/odgruzuj-release.keystore \
  -alias odgruzuj -keyalg RSA -keysize 2048 -validity 10000
```
Zapisz: ścieżkę, hasło keystore, alias (`odgruzuj`), hasło aliasu. **Utrata = brak możliwości aktualizacji aplikacji w Play.**

### 2.3. Podpisywanie — `android/key.properties`
```
storePassword=...
keyPassword=...
keyAlias=odgruzuj
storeFile=/Users/ty/odgruzuj-release.keystore
```
W `android/app/build.gradle` (jeśli jeszcze nie ma) dodaj `signingConfigs.release` czytający z `key.properties` i przypisz w `buildTypes.release`.

### 2.4. Build AAB
```bash
npx cap open android
# W Android Studio: Build → Generate Signed Bundle/APK → Android App Bundle → release
# Wynik: android/app/release/app-release.aab
```
Lub z CLI:
```bash
cd android && ./gradlew bundleRelease
```

### 2.5. Google Play Console
1. Załóż aplikację → nazwa: **Odgruzuj**, język domyślny: polski.
2. **App content**: Privacy Policy URL (wymagane), Data Safety, target audience (18+ lub odpowiedni), reklamy: brak, treści użytkownika: tak (notatki/fiszki).
3. **Store listing**:
   - Krótki opis (≤80 znaków), pełny opis (≤4000).
   - Ikona 512×512 (`icon-512.png`).
   - Feature graphic 1024×500 (do dorobienia, brak w paczce — wygeneruj banner).
   - Screeny telefonu: 2–8 sztuk (użyj `screenshot-phone-1/2/3.png`).
4. **Production → Create new release** → upload `app-release.aab` → notatki = treść `RELEASE_NOTES.md` → Review → Roll out.

---

## 3. iOS — App Store

### 3.1. Wersjonowanie
W Xcode (target App): zwiększ `Version` (CFBundleShortVersionString) i `Build` (CFBundleVersion).

### 3.2. Otwórz projekt
```bash
npx cap sync ios
npx cap open ios
```

### 3.3. Signing & Capabilities
1. Wybierz **Team** (Apple Developer).
2. Bundle ID: `pl.odgruzuj.app` — utwórz w App Store Connect → Certificates, Identifiers & Profiles.
3. Włącz **Push Notifications** (capability) — wymagane, bo używamy APNs.
4. Background Modes → Remote notifications.

### 3.4. Archive + Upload
1. Schemat: **Any iOS Device (arm64)**.
2. Product → **Archive**.
3. W Organizer: **Distribute App → App Store Connect → Upload**.

### 3.5. App Store Connect
1. Utwórz aplikację: nazwa **Odgruzuj**, język podstawowy: polski, Bundle ID `pl.odgruzuj.app`, SKU dowolne.
2. **App Information**: kategoria (Education / Productivity), Privacy Policy URL.
3. **App Privacy**: wskaż dane zbierane (email, identyfikator użytkownika, tokeny push) i ich cel.
4. **Pricing**: free + In-App Purchase? ❗ Stripe = sprzedaż **cyfrowych subskrypcji poza systemem Apple** może łamać guideline 3.1.1. Patrz sekcja 5.
5. **App Review Information**: dane testowego konta (email + hasło konta `free` do testów), notatki dla recenzenta.
6. **Version**: screenshoty 6.7″ i 6.5″ (wygeneruj z `screenshot-phone-*.png` w odpowiednich rozmiarach), opis, słowa kluczowe (≤100 znaków), what's new (`RELEASE_NOTES.md`).
7. **Submit for Review**.

---

## 4. Wymagane materiały do listingu (już w `odgruzuj-graphics.zip`)

| Element | Plik | Sklep |
|---|---|---|
| Ikona 1024×1024 (bez alpha) | `icon-1024.png` | App Store |
| Ikona 512×512 | `icon-512.png` | Google Play |
| Screeny telefonu | `screenshot-phone-1/2/3.png` | oba |
| PWA / web | `icon-192.png`, `apple-touch-icon.png`, `favicon.*` | — |

**Do dorobienia ręcznie:**
- Google Play **feature graphic** 1024×500 px.
- App Store screeny w **dokładnych** rozmiarach 6.7″ (1290×2796) i 6.5″ (1242×2688) — przeskaluj/przyciemnij obecne lub zrób nowe w symulatorze.
- Polityka prywatności pod publicznym URL (np. `https://odgruzuj.pl/privacy`).

---

## 5. ⚠️ Kompatybilność płatności Stripe ze sklepami

- **Google Play**: subskrypcje cyfrowe konsumowane wewnątrz aplikacji muszą iść przez Google Play Billing (Policy on Payments). Stripe Checkout dla treści/subskrypcji = potencjalne odrzucenie. Opcje:
  1. Wyłączyć przyciski zakupu w buildzie mobile (sprzedaż tylko web/PWA) i poinformować użytkowników, że PRO kupują na stronie.
  2. Zintegrować Google Play Billing dla buildu Android (oddzielny SKU) — duża zmiana.
- **App Store**: identycznie — Guideline 3.1.1 wymaga IAP dla treści w aplikacji. **Reader app exception** możliwy, jeśli logujesz tylko istniejące konto kupione poza aplikacją i nie pokazujesz przycisków zakupu.

**Rekomendacja przed pierwszym submitem:** wyłączyć w buildzie mobilnym przyciski "Kup PRO" / "BLIK", zostawić tylko ekran logowania i informację: *"Subskrypcję PRO aktywujesz na odgruzuj.pl"*. To najprostsza droga do akceptacji.

---

## 6. Checklist pre-submit

- [ ] `capacitor.config.ts` — `server.url` zakomentowany
- [ ] `npm run build && npx cap sync` wykonane na czystym repo
- [ ] `versionCode` / `Build number` zwiększone
- [ ] Keystore Android zbackupowany (3 kopie offline)
- [ ] Polityka prywatności opublikowana pod publicznym URL
- [ ] Konto testowe (`free`) przygotowane dla recenzenta
- [ ] Push notifications: w `Info.plist` opis użycia (`NSUserNotificationsUsageDescription` — opcjonalnie), w Android `POST_NOTIFICATIONS` w manifeście
- [ ] Stripe: zdecydowane podejście (sekcja 5)
- [ ] Screeny i ikony w wymaganych rozmiarach

---

## 7. Pliki referencyjne w repo
- `capacitor.config.ts` — konfiguracja natywna
- `android/`, `ios/` — projekty natywne (commitowane)
- `ICONS_AND_SPLASH_SETUP.md` — generowanie ikon w Android Studio / Xcode
- `TECHNICAL_DOCUMENTATION.md` — architektura
- `DATABASE_SCHEMA.md` — schemat bazy
