# Konfiguracja ikon i Splash Screen dla Android i iOS

## Wygenerowana ikona

Ikona aplikacji została wygenerowana w pliku:
- `src/assets/icon-1024.png` - ikona 1024x1024 (źródłowa)
- `public/icon-1024.png` - kopia do użycia w narzędziach

## Android - Ikony

### Automatyczne generowanie ikon

1. Otwórz projekt w Android Studio:
   ```bash
   npx cap open android
   ```

2. W Android Studio:
   - Kliknij prawym przyciskiem na `app/src/main/res`
   - Wybierz **New → Image Asset**
   - W zakładce **Foreground Layer**:
     - Source Asset: wybierz `public/icon-1024.png`
     - Resize: dostosuj do 60-70%
   - W zakładce **Background Layer**:
     - Wybierz kolor: `#16a34a` (zielony) lub `#FFFFFF` (biały)
   - Kliknij **Next** → **Finish**

### Wymagane rozmiary (zostaną wygenerowane automatycznie):
- `mipmap-mdpi`: 48x48
- `mipmap-hdpi`: 72x72
- `mipmap-xhdpi`: 96x96
- `mipmap-xxhdpi`: 144x144
- `mipmap-xxxhdpi`: 192x192

## iOS - Ikony

### Automatyczne generowanie ikon

1. Otwórz projekt w Xcode:
   ```bash
   npx cap open ios
   ```

2. W Xcode:
   - Przejdź do **App → Assets.xcassets → AppIcon**
   - Przeciągnij `public/icon-1024.png` do slotu **1024pt (App Store)**
   - Xcode automatycznie wygeneruje pozostałe rozmiary

### Alternatywa - narzędzia online:
- [App Icon Generator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)

Wgraj `icon-1024.png` i pobierz wygenerowane ikony.

## Splash Screen

### Capacitor jest już skonfigurowany w `capacitor.config.ts`:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#16a34a',
    showSpinner: false,
    androidScaleType: 'CENTER_CROP',
    splashFullScreen: true,
    splashImmersive: true
  }
}
```

### Android Splash Screen

1. Skopiuj ikonę do zasobów:
   - Umieść `icon-1024.png` jako `android/app/src/main/res/drawable/splash.png`

2. Utwórz plik `android/app/src/main/res/drawable/launch_splash.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item
        android:drawable="@drawable/splash"
        android:gravity="center"
        android:width="200dp"
        android:height="200dp"/>
</layer-list>
```

3. Dodaj kolor w `android/app/src/main/res/values/colors.xml`:
```xml
<color name="splash_background">#16a34a</color>
```

### iOS Splash Screen

1. W Xcode otwórz `App/App/Assets.xcassets`
2. Utwórz nowy **Image Set** o nazwie `Splash`
3. Przeciągnij ikonę do odpowiednich slotów (1x, 2x, 3x)
4. Edytuj `LaunchScreen.storyboard`:
   - Dodaj UIImageView z obrazem `Splash`
   - Ustaw constraints na wyśrodkowanie
   - Ustaw tło na kolor `#16a34a`

## Szybka konfiguracja z CLI

Po przygotowaniu ikon:

```bash
# Zsynchronizuj projekt
npx cap sync

# Otwórz w Android Studio
npx cap open android

# Otwórz w Xcode
npx cap open ios
```

## Przydatne narzędzia

- **[Capacitor Assets](https://github.com/ionic-team/capacitor-assets)** - automatyczne generowanie wszystkich ikon i splash screenów:
  ```bash
  npm install -g @capacitor/assets
  npx capacitor-assets generate --iconBackgroundColor '#16a34a' --splashBackgroundColor '#16a34a'
  ```

## Checklist przed publikacją

- [ ] Ikony Android wygenerowane przez Android Studio
- [ ] Ikony iOS wygenerowane przez Xcode
- [ ] Splash screen Android skonfigurowany
- [ ] Splash screen iOS skonfigurowany (LaunchScreen.storyboard)
- [ ] Przetestowano na urządzeniu fizycznym
