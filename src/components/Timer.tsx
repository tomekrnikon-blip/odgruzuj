import { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element for completion sound
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleS8LQ5HX4Ki8aB0GQX3T6rG+dC0KQ4nS57XBfDcMRoLQ57jBgDsMR4DQ57nAgj4MR3/Q57rAgkAMR3/P5rnAgEEMR3/P5bjAfkIMR3/O5bfAf0MMR3/O5bbAfkQMR3/O5LXAfkUMR3/N47TAf0YMR3/N47S/fkcMR3/N47O/fkgMR3/M4rO/f0kMR3/M4bK/f0oMR3/M4bK+f0sMR3/L4LG+f0wMR3/L37C+gE0MR3/K3rC+gE4MR3/K3a++gE8MR37J3K6+gFAMRn7I26y9gFEMRX3H2au8gFIMRHzG16m7gVMMQ3vF1ai6gVQMQnrE1Ka5glYMQHnC0qS4gl0MP3fAz6K2g2EMPXa/zZ+0g2cMO3S8y5yxg20MOXKzyJmug3MMNm+wxpWrg3kML2ytwZKng34MK2iqvY6kg4QMJ2Wnt4qggokMImGjsoaagpAMHV2frnqSgpYMFlmZpm9+gZ0MD1OSm2Ntf6AMBQ==";
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Play sound on completion
  useEffect(() => {
    if (isComplete && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
      // Try vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [isComplete]);

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
