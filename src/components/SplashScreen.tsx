import { useEffect, useState } from 'react';
import logo from '@/assets/logo.jpg';

const motivationalTexts = [
  "Odgruzujmy to razem! 💚",
  "Każdy porządek zaczyna się od jednej fiszki",
  "Dzisiaj jest dobry dzień na porządek!",
  "Twoje życie zasługuje na przestrzeń",
  "Mały krok dziś, wielka zmiana jutro",
  "Porządek to nie perfekcja, to postęp",
  "Gotowy na dzisiejszą fiszkę?",
  "Zacznij od małego, osiągnij wielkie",
  "Odgruzuj swoje życie, jeden dzień na raz",
  "Witaj z powrotem! Zaczynamy!",
  "Twoja przestrzeń, Twoje zasady",
  "Porządki mogą być zabawne!",
  "Każda fiszka to krok do wolności",
  "Mniej rzeczy, więcej życia",
  "Dzisiaj odgruzujesz coś nowego",
  "Jesteś bliżej niż myślisz!",
  "Porządek to forma dbania o siebie",
  "Gotowy na zmianę?",
  "Twój dom, Twój spokój",
  "Każdy dzień to nowa szansa",
  "Odgruzuj z uśmiechem!",
  "Przestrzeń do oddychania",
  "Porządek to wolność",
  "Zacznij teraz, dziękuj sobie później",
  "Twoje życie, Twoja przestrzeń",
  "Mniej bałaganu, więcej spokoju",
  "Odgruzuj, co Cię ciąży",
  "Każda fiszka to mały sukces",
  "Twoja podróż do porządku zaczyna się tu",
  "Gotowy na dzisiejsze wyzwanie?"
];

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo');
  const [randomText] = useState(() => 
    motivationalTexts[Math.floor(Math.random() * motivationalTexts.length)]
  );

  useEffect(() => {
    // Phase 1: Logo appears (0-1s)
    const textTimer = setTimeout(() => {
      setPhase('text');
    }, 1000);

    // Phase 3: Exit (2.5s)
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, 2500);

    // Finish (3s)
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-gradient-to-b from-white to-[#A8D5BA]
        transition-opacity duration-500
        ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Logo */}
      <div 
        className={`
          transition-all duration-500 ease-out
          ${phase === 'logo' ? 'animate-splash-logo-in' : ''}
          ${phase === 'text' || phase === 'exit' ? 'transform -translate-y-4' : ''}
        `}
      >
        <img 
          src={logo} 
          alt="odgruzuj.pl" 
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl shadow-lg"
        />
      </div>

      {/* App name */}
      <h1 
        className={`
          mt-4 text-2xl sm:text-3xl font-bold text-[#16a34a] font-poppins
          transition-all duration-500 ease-out
          ${phase === 'logo' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
        `}
      >
        odgruzuj.pl
      </h1>

      {/* Motivational text */}
      <p 
        className={`
          mt-6 text-lg sm:text-xl text-white text-center px-8 max-w-sm
          font-poppins font-medium
          drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]
          transition-all duration-300 ease-out
          ${phase === 'text' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
        `}
      >
        {randomText}
      </p>

      {/* Decorative dots */}
      <div className="absolute bottom-12 flex gap-2">
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
