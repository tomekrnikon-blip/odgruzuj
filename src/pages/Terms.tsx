import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/install">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
          Regulamin użytkowania
        </h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Postanowienia ogólne</h2>
            <p className="text-muted-foreground">
              Niniejszy regulamin określa zasady korzystania z aplikacji odgruzuj.pl, 
              która wspomaga użytkowników w procesie porządkowania i declutteringu przestrzeni życiowej.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Definicje</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li><strong>Aplikacja</strong> – serwis internetowy odgruzuj.pl dostępny jako PWA oraz aplikacja mobilna</li>
              <li><strong>Użytkownik</strong> – osoba fizyczna korzystająca z Aplikacji</li>
              <li><strong>Konto</strong> – indywidualne konto Użytkownika w Aplikacji</li>
              <li><strong>Konto Pro</strong> – płatna wersja konta z rozszerzonymi funkcjonalnościami</li>
              <li><strong>Fiszki</strong> – zadania do wykonania prezentowane Użytkownikowi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Rejestracja i konto</h2>
            <p className="text-muted-foreground">
              Korzystanie z pełnej funkcjonalności Aplikacji wymaga założenia konta poprzez podanie 
              adresu e-mail i hasła. Użytkownik zobowiązuje się do podania prawdziwych danych 
              oraz do zachowania poufności swojego hasła.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Zasady korzystania z Aplikacji</h2>
            <p className="text-muted-foreground">Użytkownik zobowiązuje się do:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Korzystania z Aplikacji zgodnie z jej przeznaczeniem</li>
              <li>Niepodejmowania działań mogących zakłócić działanie Aplikacji</li>
              <li>Nieudostępniania swojego konta osobom trzecim</li>
              <li>Przestrzegania przepisów prawa i dobrych obyczajów</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Konto Pro i płatności</h2>
            <p className="text-muted-foreground">
              Konto Pro oferuje dostęp do rozszerzonej bazy fiszek i dodatkowych funkcji. 
              Subskrypcja Pro jest płatna zgodnie z aktualnym cennikiem (miesięczna lub roczna). 
              Płatności obsługiwane są przez zewnętrznego operatora (Stripe). 
              Użytkownik może zrezygnować z subskrypcji w dowolnym momencie poprzez portal klienta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Prawa własności intelektualnej</h2>
            <p className="text-muted-foreground">
              Wszelkie treści zawarte w Aplikacji (teksty fiszek, grafiki, logo, kod) są chronione 
              prawem autorskim i stanowią własność właściciela serwisu. Kopiowanie, rozpowszechnianie 
              lub modyfikowanie treści bez zgody jest zabronione.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Ograniczenie odpowiedzialności</h2>
            <p className="text-muted-foreground">
              Aplikacja służy wyłącznie celom rozrywkowym i motywacyjnym. Administrator nie ponosi 
              odpowiedzialności za skutki wykonywania zadań sugerowanych przez fiszki. 
              Użytkownik korzysta z Aplikacji na własną odpowiedzialność.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Dostępność usługi</h2>
            <p className="text-muted-foreground">
              Administrator dokłada starań, aby Aplikacja była dostępna nieprzerwanie, 
              jednak nie gwarantuje jej ciągłej dostępności. Przerwy techniczne mogą być 
              konieczne w celu konserwacji lub aktualizacji systemu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Usunięcie konta</h2>
            <p className="text-muted-foreground">
              Użytkownik może w każdej chwili usunąć swoje konto kontaktując się z administratorem 
              poprzez formularz wsparcia dostępny w ustawieniach. Usunięcie konta skutkuje 
              trwałym usunięciem wszystkich danych Użytkownika.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Odinstalowanie aplikacji</h2>
            <p className="text-muted-foreground mb-3">
              Użytkownik może w każdej chwili odinstalować aplikację ze swojego urządzenia:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>
                <strong>iPhone/iPad:</strong> Przytrzymaj ikonę aplikacji na ekranie głównym, 
                wybierz "Usuń aplikację", a następnie potwierdź usunięcie.
              </li>
              <li>
                <strong>Android:</strong> Przytrzymaj ikonę aplikacji, wybierz "Odinstaluj" 
                lub przeciągnij ikonę do obszaru "Usuń".
              </li>
              <li>
                <strong>Przeglądarka Chrome (komputer):</strong> Kliknij menu przeglądarki (⋮), 
                wybierz "Więcej narzędzi" → "Odinstaluj odgruzuj.pl".
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              <strong>Uwaga:</strong> Odinstalowanie aplikacji nie powoduje usunięcia konta użytkownika 
              ani jego danych. Aby całkowicie usunąć konto i związane z nim dane, należy skontaktować się 
              z administratorem poprzez formularz wsparcia dostępny w ustawieniach aplikacji lub 
              przed odinstalowaniem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Zmiany regulaminu</h2>
            <p className="text-muted-foreground">
              Administrator zastrzega sobie prawo do zmiany niniejszego regulaminu. 
              O istotnych zmianach Użytkownicy zostaną poinformowani poprzez powiadomienie w Aplikacji.
              Dalsze korzystanie z Aplikacji po wprowadzeniu zmian oznacza ich akceptację.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Postanowienia końcowe</h2>
            <p className="text-muted-foreground">
              W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa polskiego. 
              Wszelkie spory będą rozstrzygane przez sąd właściwy dla siedziby Administratora.
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
