/**
 * Wykrywanie środowiska natywnego (Capacitor: Android/iOS).
 *
 * UWAGA — zgodność ze sklepami:
 *   Google Play Billing Policy oraz Apple App Store Guideline 3.1.1 wymagają,
 *   aby sprzedaż treści cyfrowych konsumowanych w aplikacji odbywała się
 *   przez ich własne systemy płatności (Google Play Billing / Apple IAP).
 *   Stripe Checkout (karta i BLIK) NIE spełnia tych wymogów dla buildów
 *   instalowanych ze sklepów.
 *
 * Dlatego w buildzie natywnym ukrywamy wszystkie przyciski zakupu PRO i
 * BLIK i zamiast nich pokazujemy informację, że subskrypcję aktywuje się
 * na stronie odgruzuj.pl. Web/PWA pozostaje bez zmian.
 *
 * Implementacja: `Capacitor.isNativePlatform()` zwraca true tylko gdy
 * aplikacja działa wewnątrz natywnego kontenera Android/iOS.
 */
import { Capacitor } from "@capacitor/core";

export const isNativeMobile = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Publiczny URL, na który kierujemy użytkowników natywnych po zakup PRO. */
export const WEB_PURCHASE_URL = "https://odgruzuj.pl";
