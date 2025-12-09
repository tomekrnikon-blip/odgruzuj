import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
          Polityka Prywatności i RODO
        </h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Administrator danych osobowych</h2>
            <p className="text-muted-foreground">
              Administratorem Twoich danych osobowych jest właściciel serwisu odgruzuj.pl. 
              Kontakt z administratorem możliwy jest poprzez formularz kontaktowy dostępny w aplikacji.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Jakie dane zbieramy</h2>
            <p className="text-muted-foreground">W ramach korzystania z aplikacji zbieramy następujące dane:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Adres e-mail (wymagany do rejestracji i logowania)</li>
              <li>Hasło (przechowywane w formie zaszyfrowanej)</li>
              <li>Dane o postępach w aplikacji (ukończone zadania, punkty, odznaki)</li>
              <li>Preferencje użytkownika (wybrane kategorie, ustawienia powiadomień)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cel przetwarzania danych</h2>
            <p className="text-muted-foreground">Twoje dane przetwarzamy w celu:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Świadczenia usług aplikacji (Art. 6 ust. 1 lit. b RODO)</li>
              <li>Zapewnienia bezpieczeństwa konta użytkownika</li>
              <li>Synchronizacji danych między urządzeniami</li>
              <li>Obsługi subskrypcji i płatności (w przypadku konta Pro)</li>
              <li>Wysyłania powiadomień związanych z funkcjonowaniem aplikacji</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Podstawa prawna przetwarzania</h2>
            <p className="text-muted-foreground">
              Podstawą prawną przetwarzania Twoich danych jest:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Wykonanie umowy o świadczenie usług (Art. 6 ust. 1 lit. b RODO)</li>
              <li>Twoja zgoda (Art. 6 ust. 1 lit. a RODO)</li>
              <li>Prawnie uzasadniony interes administratora (Art. 6 ust. 1 lit. f RODO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Okres przechowywania danych</h2>
            <p className="text-muted-foreground">
              Twoje dane przechowujemy przez okres korzystania z aplikacji oraz przez 30 dni po usunięciu konta. 
              Dane związane z rozliczeniami przechowujemy przez okres wymagany przepisami prawa podatkowego.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Twoje prawa</h2>
            <p className="text-muted-foreground">Zgodnie z RODO przysługują Ci następujące prawa:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Prawo dostępu do swoich danych</li>
              <li>Prawo do sprostowania danych</li>
              <li>Prawo do usunięcia danych ("prawo do bycia zapomnianym")</li>
              <li>Prawo do ograniczenia przetwarzania</li>
              <li>Prawo do przenoszenia danych</li>
              <li>Prawo do cofnięcia zgody w dowolnym momencie</li>
              <li>Prawo do wniesienia skargi do organu nadzorczego (UODO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Bezpieczeństwo danych</h2>
            <p className="text-muted-foreground">
              Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony Twoich danych osobowych, 
              w tym szyfrowanie połączeń (SSL/TLS), bezpieczne przechowywanie haseł oraz regularne aktualizacje zabezpieczeń.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Udostępnianie danych</h2>
            <p className="text-muted-foreground">
              Twoje dane nie są udostępniane podmiotom trzecim w celach marketingowych. 
              Dane mogą być przekazywane dostawcom usług technicznych (hosting, płatności) 
              wyłącznie w zakresie niezbędnym do świadczenia usług.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Pliki cookies</h2>
            <p className="text-muted-foreground">
              Aplikacja wykorzystuje pliki cookies niezbędne do jej prawidłowego funkcjonowania, 
              w szczególności do utrzymania sesji użytkownika. Nie stosujemy cookies marketingowych ani analitycznych.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Zmiany polityki prywatności</h2>
            <p className="text-muted-foreground">
              Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej polityce prywatności. 
              O istotnych zmianach poinformujemy użytkowników poprzez powiadomienie w aplikacji.
            </p>
          </section>

          <section className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}