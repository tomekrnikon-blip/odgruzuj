import { useGameification, CompletedTask } from "@/hooks/useGameification";
import { flashcards } from "@/data/flashcards";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Flashcard } from "@/data/flashcards";
import { Check, Clock, Flame, Calendar } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";

export default function History() {
  const { stats, getTodaysTasks, getThisWeeksTasks, getThisMonthsTasks } = useGameification();
  const [customFlashcards] = useLocalStorage<Flashcard[]>("odgruzuj_custom_flashcards", []);

  const allFlashcards = [...flashcards, ...customFlashcards];

  const getFlashcardById = (id: number) => {
    return allFlashcards.find((f) => f.id === id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Dziś";
    if (isYesterday(date)) return "Wczoraj";
    return format(date, "d MMMM", { locale: pl });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  const groupedTasks = stats.completedTasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.completedAt), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, CompletedTask[]>);

  const sortedDates = Object.keys(groupedTasks).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const todayCount = getTodaysTasks().length;
  const weekCount = getThisWeeksTasks().length;
  const monthCount = getThisMonthsTasks().length;

  return (
    <div className="min-h-screen bg-background pb-24 pt-nav">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-heading font-bold">Historia</h1>
          <p className="text-sm text-muted-foreground">
            Twoje ukończone zadania
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-flat p-4 text-center">
            <p className="text-2xl font-heading font-bold text-primary">
              {todayCount}
            </p>
            <p className="text-xs text-muted-foreground">Dziś</p>
          </div>
          <div className="card-flat p-4 text-center">
            <p className="text-2xl font-heading font-bold text-success">
              {weekCount}
            </p>
            <p className="text-xs text-muted-foreground">Ten tydzień</p>
          </div>
          <div className="card-flat p-4 text-center">
            <p className="text-2xl font-heading font-bold text-accent">
              {monthCount}
            </p>
            <p className="text-xs text-muted-foreground">Ten miesiąc</p>
          </div>
        </div>

        {/* Streak info */}
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <Flame className="w-6 h-6 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Aktualna seria</p>
            <p className="text-sm text-muted-foreground">
              {stats.currentStreak} {stats.currentStreak === 1 ? "dzień" : "dni"} z rzędu
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Najdłuższa</p>
            <p className="font-heading font-bold">{stats.longestStreak} dni</p>
          </div>
        </div>

        {/* Task history */}
        {sortedDates.length > 0 ? (
          <div className="space-y-4">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {formatDate(groupedTasks[dateKey][0].completedAt)}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    • {groupedTasks[dateKey].length} zadań
                  </span>
                </div>
                <div className="space-y-2">
                  {groupedTasks[dateKey].map((task, index) => {
                    const flashcard = getFlashcardById(task.flashcardId);
                    if (!flashcard) return null;

                    return (
                      <div
                        key={`${dateKey}-${index}`}
                        className="card-flat p-4 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{flashcard.task}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{flashcard.category}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(task.completedAt)}
                            </span>
                            {task.completedInTime && (
                              <span className="text-success">+5 bonus</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-heading font-semibold mb-2">
              Brak historii
            </h2>
            <p className="text-muted-foreground">
              Ukończ swoje pierwsze zadanie, aby zobaczyć historię.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
