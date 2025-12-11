import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, SkipForward, Flame, Trophy, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashCard } from "@/components/FlashCard";
import { Timer } from "@/components/Timer";
import { StatsCard } from "@/components/StatsCard";
import { BadgeUnlockedModal } from "@/components/BadgeDisplay";
import { useFlashcardsFromDB } from "@/hooks/useFlashcardsFromDB";
import { useTimer } from "@/hooks/useTimer";
import { useGameification, Badge } from "@/hooks/useGameification";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { subscribed } = useSubscription();

  const {
    currentFlashcard,
    isLoading,
    completedTodayIds,
    totalAvailable,
    getNextFlashcard,
    skipFlashcard,
    markAsCompleted,
  } = useFlashcardsFromDB();

  const { stats, completeTask, getTodaysTasks, getThisWeeksTasks, getLevelProgress } =
    useGameification();

  const timerDuration = currentFlashcard
    ? currentFlashcard.timeEstimate *
      (currentFlashcard.timeUnit === "hours" ? 3600 : 60)
    : 0;

  const {
    timeLeft,
    isRunning,
    isPaused,
    isComplete,
    isWarning,
    start,
    pause,
    reset,
    formatTime,
  } = useTimer({
    initialTime: timerDuration,
    onComplete: () => {
      toast({
        title: "⏰ Czas minął!",
        description: "Świetna robota! Oznacz zadanie jako wykonane.",
      });
    },
    onWarning: () => {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    },
  });

  // Track start time
  useEffect(() => {
    if (isRunning && !isPaused && startTime === null) {
      setStartTime(Date.now());
    }
    if (!isRunning) {
      setStartTime(null);
    }
  }, [isRunning, isPaused, startTime]);

  const handleComplete = () => {
    if (!currentFlashcard) return;

    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const completedInTime = isComplete || timeLeft <= 0;

    // Adapt flashcard for gamification
    const flashcardForGameification = {
      id: parseInt(currentFlashcard.id.replace(/-/g, '').slice(0, 8), 16) || 1,
      category: currentFlashcard.category as any,
      task: currentFlashcard.task,
      comment: currentFlashcard.comment,
      difficulty: currentFlashcard.difficulty as any,
      timeEstimate: currentFlashcard.timeEstimate,
      timeUnit: currentFlashcard.timeUnit as any,
      isTimedTask: currentFlashcard.isTimedTask,
      isCustom: false,
    };

    const { pointsEarned, newBadges } = completeTask(
      flashcardForGameification,
      timeSpent,
      completedInTime
    );

    markAsCompleted(currentFlashcard.id);

    toast({
      title: "✨ Zadanie ukończone!",
      description: `Zdobyłeś ${pointsEarned} punktów!`,
    });

    if (newBadges.length > 0) {
      setNewBadge(newBadges[0]);
    }

    reset();
    setStartTime(null);
    getNextFlashcard();
  };

  const handleSkip = () => {
    reset();
    setStartTime(null);
    skipFlashcard();
  };


  const handleUpgrade = () => {
    navigate('/settings?section=subscription');
  };

  const todayCount = getTodaysTasks().length;
  const weekCount = getThisWeeksTasks().length;

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">odgruzuj.pl</h1>
            <p className="text-sm text-muted-foreground">
              Poziom {stats.level} • {stats.points} pkt
            </p>
          </div>
          {!subscribed && (
            <button
              onClick={handleUpgrade}
              className="p-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
              aria-label="Ulepsz do Pro"
            >
              <Crown className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Pro</span>
            </button>
          )}
        </div>

        {/* Level progress */}
        <div className="max-w-lg mx-auto mt-3">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${getLevelProgress(stats.points)}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            icon={Check}
            value={todayCount}
            label="Dziś"
            variant="primary"
          />
          <StatsCard
            icon={Trophy}
            value={weekCount}
            label="Ten tydzień"
            variant="success"
          />
          <StatsCard
            icon={Flame}
            value={stats.currentStreak}
            label="Seria dni"
            variant="warning"
          />
        </div>

        {/* Available flashcards info */}
        {!subscribed && totalAvailable > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Dostępne fiszki: {totalAvailable}/500+
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="card-elevated p-8 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Ładowanie fiszek...</p>
          </div>
        ) : currentFlashcard ? (
          <div className={cn(
            "transition-all duration-200",
            isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
          )}>
            <FlashCard flashcard={currentFlashcard} />

            {/* Timer */}
            {currentFlashcard.isTimedTask && (
              <div className="card-elevated p-6 flex flex-col items-center mt-6">
                <Timer
                  timeLeft={timeLeft}
                  isRunning={isRunning}
                  isPaused={isPaused}
                  isComplete={isComplete}
                  isWarning={isWarning}
                  onStart={start}
                  onPause={pause}
                  onReset={reset}
                  formatTime={formatTime}
                  totalTime={timerDuration}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSkip}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Pomiń
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Wykonane
              </button>
            </div>
          </div>
        ) : (
          <div className="card-elevated p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
              <Star className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-heading font-semibold mb-2">
              {totalAvailable === 0 ? "Brak fiszek" : "Brawo! Wszystko zrobione!"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {totalAvailable === 0 
                ? "Nie masz dostępnych fiszek w wybranych kategoriach."
                : "Na dziś nie ma więcej zadań. Wróć jutro!"
              }
            </p>
            {!subscribed && (
              <button
                onClick={handleUpgrade}
                className="btn-primary flex items-center justify-center gap-2 mx-auto"
              >
                <Crown className="w-5 h-5" />
                Odblokuj ponad 300 fiszek
              </button>
            )}
          </div>
        )}
      </main>

      {/* Badge unlocked modal */}
      {newBadge && (
        <BadgeUnlockedModal
          badge={newBadge}
          isOpen={true}
          onClose={() => setNewBadge(null)}
        />
      )}
    </div>
  );
}
