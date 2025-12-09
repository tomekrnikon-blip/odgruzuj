import { useState } from "react";
import { X } from "lucide-react";
import { Category, categories, Difficulty } from "@/data/flashcards";
import { cn } from "@/lib/utils";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: {
    category: Category;
    task: string;
    comment: string;
    difficulty: Difficulty;
    timeEstimate: number;
    timeUnit: "minutes" | "hours";
    isTimedTask: boolean;
  }) => void;
}

export function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [taskName, setTaskName] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<Category>("Ubrania i Moda");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [timeEstimate, setTimeEstimate] = useState(10);
  const [timeUnit, setTimeUnit] = useState<"minutes" | "hours">("minutes");
  const [isTimedTask, setIsTimedTask] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    onAdd({
      category,
      task: taskName.trim(),
      comment: comment.trim() || "Twoje własne zadanie do wykonania!",
      difficulty,
      timeEstimate,
      timeUnit,
      isTimedTask,
    });

    // Reset form
    setTaskName("");
    setComment("");
    setCategory("Ubrania i Moda");
    setDifficulty("easy");
    setTimeEstimate(10);
    setTimeUnit("minutes");
    setIsTimedTask(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-semibold">Dodaj Zadanie</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Nazwa zadania *
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="np. Wyrzuć stare gazety"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Komentarz (opcjonalny)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Dodaj zabawny komentarz motywacyjny..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              rows={2}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Kategoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Poziom trudności
            </label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all",
                    difficulty === diff
                      ? diff === "easy"
                        ? "bg-success text-success-foreground"
                        : diff === "medium"
                        ? "bg-warning text-warning-foreground"
                        : "bg-destructive text-destructive-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {diff === "easy" ? "Łatwe" : diff === "medium" ? "Średnie" : "Trudne"}
                </button>
              ))}
            </div>
          </div>

          {/* Time estimate */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Czas trwania
              </label>
              <input
                type="number"
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Jednostka
              </label>
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as "minutes" | "hours")}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="minutes">Minuty</option>
                <option value="hours">Godziny</option>
              </select>
            </div>
          </div>

          {/* Timed task toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div>
              <p className="font-medium">Zadanie czasowe</p>
              <p className="text-sm text-muted-foreground">
                Włącz stoper dla tego zadania
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTimedTask(!isTimedTask)}
              className={cn(
                "w-12 h-7 rounded-full transition-all duration-200",
                isTimedTask ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                  isTimedTask ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Anuluj
            </button>
            <button type="submit" className="flex-1 btn-primary">
              Zapisz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
