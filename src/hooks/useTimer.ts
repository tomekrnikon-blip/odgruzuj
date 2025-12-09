import { useState, useEffect, useCallback, useRef } from "react";

interface UseTimerOptions {
  initialTime: number; // in seconds
  onComplete?: () => void;
  onWarning?: () => void;
  warningThreshold?: number; // in seconds
}

interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isWarning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
}

export function useTimer({
  initialTime,
  onComplete,
  onWarning,
  warningThreshold = 10,
}: UseTimerOptions): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const warningTriggeredRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          
          // Check for warning threshold
          if (newTime <= warningThreshold && newTime > 0 && !warningTriggeredRef.current) {
            setIsWarning(true);
            warningTriggeredRef.current = true;
            onWarning?.();
          }
          
          // Check for completion
          if (newTime <= 0) {
            setIsComplete(true);
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return clearTimerInterval;
  }, [isRunning, isPaused, timeLeft, warningThreshold, onComplete, onWarning, clearTimerInterval]);

  const start = useCallback(() => {
    if (timeLeft > 0) {
      setIsRunning(true);
      setIsPaused(false);
      setIsComplete(false);
    }
  }, [timeLeft]);

  const pause = useCallback(() => {
    setIsPaused(true);
    clearTimerInterval();
  }, [clearTimerInterval]);

  const reset = useCallback(() => {
    clearTimerInterval();
    setTimeLeft(initialTime);
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setIsWarning(false);
    warningTriggeredRef.current = false;
  }, [initialTime, clearTimerInterval]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Reset when initialTime changes
  useEffect(() => {
    reset();
  }, [initialTime]);

  return {
    timeLeft,
    isRunning,
    isPaused,
    isComplete,
    isWarning,
    start,
    pause,
    reset,
    formatTime,
  };
}
