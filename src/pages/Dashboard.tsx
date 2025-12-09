import { useState, useEffect } from "react";
import { Plus, Check, SkipForward, Flame, Trophy, Star } from "lucide-react";
import { FlashCard } from "@/components/FlashCard";
import { Timer } from "@/components/Timer";
import { AddTaskModal } from "@/components/AddTaskModal";
import { StatsCard } from "@/components/StatsCard";
import { BadgeUnlockedModal } from "@/components/BadgeDisplay";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useTimer } from "@/hooks/useTimer";
import { useGameification, Badge } from "@/hooks/useGameification";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const {
    currentFlashcard,
    completedTodayIds,
    getNextFlashcard,
    skipFlashcard,
    addCustomFlashcard,
    markAsCompleted,
  } = useFlashcards();

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
      // Vibrate on warning
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

    const { pointsEarned, newBadges } = completeTask(
      currentFlashcard,
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

  const handleAddTask = (task: Parameters<typeof addCustomFlashcard>[0]) => {
    addCustomFlashcard(task);
    toast({
      title: "Dodano zadanie!",
      description: "Twoje zadanie zostało dodane do puli fiszek.",
    });
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
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
            aria-label="Dodaj zadanie"
          >
            <Plus className="w-5 h-5" />
          </button>
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

        {/* Current flashcard */}
        {currentFlashcard ? (
          <>
            <FlashCard flashcard={currentFlashcard} />

            {/* Timer */}
            {currentFlashcard.isTimedTask && (
              <div className="card-elevated p-6 flex flex-col items-center">
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
            <div className="flex gap-3">
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
          </>
        ) : (
          <div className="card-elevated p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
              <Star className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-heading font-semibold mb-2">
              Brawo! Wszystko zrobione!
            </h2>
            <p className="text-muted-foreground mb-4">
              Na dziś nie ma więcej zadań. Wróć jutro lub dodaj własne!
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Dodaj zadanie
            </button>
          </div>
        )}
      </main>

      {/* Add task modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
      />

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
