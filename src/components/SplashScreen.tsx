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
  const [phase, setPhase] = useState<'logo' | 'sweep' | 'text' | 'exit'>('logo');
  const [randomText] = useState(() => 
    motivationalTexts[Math.floor(Math.random() * motivationalTexts.length)]
  );

  useEffect(() => {
    // Phase 1: Logo appears (0-1s)
    const sweepTimer = setTimeout(() => {
      setPhase('sweep');
    }, 1000);

    // Phase 2: Sweep done, show text (1.8s)
    const textTimer = setTimeout(() => {
      setPhase('text');
    }, 1800);

    // Phase 3: Exit (3.5s)
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, 3500);

    // Finish (4s)
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 4000);

    return () => {
      clearTimeout(sweepTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden
        bg-gradient-to-b from-white to-[#A8D5BA]
        transition-opacity duration-500
        ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Sweeping broom animation */}
      <div 
        className={`
          absolute pointer-events-none
          transition-all duration-700 ease-in-out
          ${phase === 'logo' ? 'left-[-100px] opacity-0' : ''}
          ${phase === 'sweep' ? 'left-[calc(100%+100px)] opacity-100' : ''}
          ${phase === 'text' || phase === 'exit' ? 'left-[calc(100%+100px)] opacity-0' : ''}
        `}
        style={{ 
          top: '50%', 
          transform: 'translateY(-50%)',
          transition: phase === 'sweep' ? 'left 0.8s ease-in-out, opacity 0.3s' : 'opacity 0.3s'
        }}
      >
        {/* Broom SVG */}
        <svg 
          width="80" 
          height="80" 
          viewBox="0 0 24 24" 
          fill="none" 
          className="transform -rotate-45"
        >
          {/* Broom handle */}
          <line 
            x1="4" 
            y1="4" 
            x2="14" 
            y2="14" 
            stroke="#8B4513" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* Broom bristles */}
          <path 
            d="M12 12 L20 20 M12 12 L18 22 M12 12 L22 18 M12 12 L16 22 M12 12 L22 16" 
            stroke="#16a34a" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* Sparkles */}
          <circle cx="8" cy="16" r="1" fill="#FFD700" className="animate-pulse" />
          <circle cx="16" cy="8" r="1" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '100ms' }} />
          <circle cx="6" cy="10" r="0.8" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '200ms' }} />
        </svg>
      </div>

      {/* Dust particles that appear during sweep */}
      {(phase === 'sweep' || phase === 'text') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full bg-[#16a34a]/30 animate-dust-particle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${30 + Math.random() * 40}%`,
                animationDelay: `${i * 80}ms`,
                animationDuration: `${800 + Math.random() * 400}ms`
              }}
            />
          ))}
        </div>
      )}

      {/* Logo */}
      <div 
        className={`
          transition-all duration-500 ease-out z-10
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
          mt-4 text-2xl sm:text-3xl font-bold text-[#16a34a] font-poppins z-10
          transition-all duration-500 ease-out
          ${phase === 'logo' || phase === 'sweep' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
        `}
      >
        odgruzuj.pl
      </h1>

      {/* Motivational text */}
      <p 
        className={`
          mt-6 text-lg sm:text-xl text-white text-center px-8 max-w-sm z-10
          font-poppins font-medium
          drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]
          transition-all duration-300 ease-out
          ${phase === 'text' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
        `}
      >
        {randomText}
      </p>

      {/* Decorative dots */}
      <div className="absolute bottom-12 flex gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
