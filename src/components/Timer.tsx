import { useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface AppSettings {
  notificationsEnabled: boolean;
  notificationTime: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const defaultSettings: AppSettings = {
  notificationsEnabled: true,
  notificationTime: "09:00",
  soundEnabled: true,
  vibrationEnabled: true,
};

interface TimerProps {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isWarning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip?: () => void;
  formatTime: (seconds: number) => string;
  totalTime: number;
}

export function Timer({
  timeLeft,
  isRunning,
  isPaused,
  isComplete,
  isWarning,
  onStart,
  onPause,
  onReset,
  onSkip,
  formatTime,
  totalTime,
}: TimerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [settings] = useLocalStorage<AppSettings>("odgruzuj_settings", defaultSettings);

  // Play beep sound using Web Audio API (works better on iOS)
  const playBeep = useCallback(() => {
    if (!settings.soundEnabled) return;
    
    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (required for iOS)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Create oscillator for beep sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      
      // Play second beep
      setTimeout(() => {
        if (!audioContextRef.current) return;
        const ctx2 = audioContextRef.current;
        const oscillator2 = ctx2.createOscillator();
        const gainNode2 = ctx2.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(ctx2.destination);
        
        oscillator2.frequency.value = 1000; // Higher pitch
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0.3, ctx2.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.5);
        
        oscillator2.start(ctx2.currentTime);
        oscillator2.stop(ctx2.currentTime + 0.5);
      }, 300);
    } catch (error) {
      console.error('Error playing beep:', error);
    }
  }, [settings.soundEnabled]);

  // Vibrate device
  const vibrate = useCallback(() => {
    if (!settings.vibrationEnabled) return;
    
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [settings.vibrationEnabled]);

  // Play sound and vibration on completion
  useEffect(() => {
    if (isComplete) {
      playBeep();
      vibrate();
    }
  }, [isComplete, playBeep, vibrate]);

  // Initialize AudioContext on first user interaction (required for iOS)
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });

    return () => {
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
  }, []);

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Timer Display */}
      <div className="relative w-48 h-48 md:w-56 md:h-56">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke={isWarning ? "hsl(var(--timer))" : "hsl(var(--primary))"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}%`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}%`}
            className="transition-all duration-1000"
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "timer-display",
              isWarning && "timer-warning",
              isComplete && "text-success"
            )}
          >
            {formatTime(timeLeft)}
          </span>
          {isComplete && (
            <span className="text-sm text-success font-medium mt-1">
              Czas minął!
            </span>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={onReset}
          className="p-3 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-200 active:scale-95"
          aria-label="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={isRunning && !isPaused ? onPause : onStart}
          className={cn(
            "p-5 rounded-full transition-all duration-200 active:scale-95 shadow-lg",
            isRunning && !isPaused
              ? "bg-warning text-warning-foreground hover:bg-warning/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          aria-label={isRunning && !isPaused ? "Pause" : "Start"}
          disabled={isComplete}
        >
          {isRunning && !isPaused ? (
            <Pause className="w-7 h-7" />
          ) : (
            <Play className="w-7 h-7 ml-1" />
          )}
        </button>

        {onSkip ? (
          <button
            onClick={onSkip}
            className="p-3 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-200 active:scale-95"
            aria-label="Pomiń"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>
    </div>
  );
}
