/**
 * ============================================================================
 * useAuth — Centralny hook autoryzacji aplikacji Odgruzuj
 * ============================================================================
 *
 * Zadanie:
 *   Hermetyzuje całą komunikację z Lovable Cloud (Supabase Auth):
 *   logowanie, rejestrację, wylogowanie, reset hasła i wykrywanie trybu
 *   "PASSWORD_RECOVERY" (po kliknięciu w e-mail resetujący).
 *
 * Jak to działa krok po kroku:
 *   1. `onAuthStateChange` subskrybuje WSZYSTKIE zdarzenia auth (SIGNED_IN,
 *      SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY).
 *   2. Sesja jest synchronizowana ze stanem komponentu — dzięki temu reszta
 *      aplikacji (np. `useSubscription`, `Admin.tsx`) reaguje natychmiast.
 *   3. Po wykryciu `PASSWORD_RECOVERY` ustawiany jest flag `isPasswordRecovery`,
 *      który strona `/auth?mode=reset` wykorzystuje do pokazania formularza
 *      "ustaw nowe hasło" zamiast standardowego logowania.
 *
 * Bezpieczeństwo:
 *   - Hook nigdy nie zapisuje danych użytkownika w localStorage ręcznie —
 *     robi to wewnętrznie klient Supabase (auto-refresh tokenów).
 *   - Nie sprawdzaj tutaj uprawnień admina! Używaj `useAdminAuth`, który
 *     czyta tabelę `user_roles` przez funkcję `has_role` (SECURITY DEFINER).
 * ============================================================================
 */
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  /** Bieżący użytkownik (null = niezalogowany). */
  const [user, setUser] = useState<User | null>(null);
  /** Pełny obiekt sesji — zawiera access_token używany w nagłówkach edge functions. */
  const [session, setSession] = useState<Session | null>(null);
  /** True dopóki Supabase nie odtworzy sesji z localStorage. Używaj do spinnera. */
  const [isLoading, setIsLoading] = useState(true);
  /**
   * Ustawiane na true gdy użytkownik wszedł z linka resetującego hasło.
   * Strona /auth używa tego do warunkowego renderu formularza nowego hasła.
   */
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Subskrypcja zdarzeń auth — JEDEN listener na cały cykl życia hooka.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH] Event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Wykrywanie kliknięcia w link "Zresetuj hasło" z e-maila.
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[AUTH] Password recovery detected');
          setIsPasswordRecovery(true);
        }
      }
    );

    // Cleanup — zapobiega wyciekowi subskrypcji przy unmoncie.
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Rejestracja. Po wysłaniu Supabase wyśle e-mail potwierdzający
   * (handler `handle_new_user` utworzy wpis w `profiles`, `user_roles`,
   * `user_progress`). `user_number` zostanie nadany dopiero PO potwierdzeniu
   * adresu — to logika triggera `assign_user_number_on_confirm`.
   */
  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  /** Logowanie hasłem. Zwraca błąd zamiast rzucania wyjątku — łatwiej obsłużyć w UI. */
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  /** Wylogowanie — czyści localStorage Supabase i emituje SIGNED_OUT. */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  /**
   * Wysłanie e-maila resetującego hasło. Po kliknięciu w link użytkownik
   * trafi na /auth?mode=reset z parametrem `code` (PKCE) lub `access_token`
   * w hash — obsługa w `src/pages/Auth.tsx` (`enterReset`).
   */
  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  /**
   * Ustawienie nowego hasła PO udanym kliknięciu w link resetujący.
   * Wymaga aktywnej sesji (PASSWORD_RECOVERY już ją utworzył).
   */
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      // Wyłącz tryb recovery — wracamy do normalnego stanu zalogowanego.
      setIsPasswordRecovery(false);
    }
    return { error };
  };

  /** Ręczne wyjście z trybu recovery (np. gdy użytkownik anuluje formularz). */
  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  return {
    user,
    session,
    isLoading,
    isPasswordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearPasswordRecovery,
  };
}
