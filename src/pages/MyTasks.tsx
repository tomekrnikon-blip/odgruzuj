import { useState } from "react";
import { Plus, Edit2, Trash2, Clock } from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";
import { categoryIcons, Category, Difficulty } from "@/data/flashcards";
import { AddTaskModal } from "@/components/AddTaskModal";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function MyTasks() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);

  const { customFlashcards, addCustomFlashcard, deleteCustomFlashcard } =
    useFlashcards();

  const handleAddTask = (task: {
    category: Category;
    task: string;
    comment: string;
    difficulty: Difficulty;
    timeEstimate: number;
    timeUnit: "minutes" | "hours";
    isTimedTask: boolean;
  }) => {
    addCustomFlashcard(task);
    toast({
      title: "Dodano zadanie!",
      description: "Twoje zadanie zostało dodane do puli fiszek.",
    });
  };

  const handleDelete = (id: number) => {
    deleteCustomFlashcard(id);
    toast({
      title: "Usunięto zadanie",
      description: "Zadanie zostało usunięte z Twojej listy.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Moje Zadania</h1>
            <p className="text-sm text-muted-foreground">
              {customFlashcards.length} własnych zadań
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
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {customFlashcards.length > 0 ? (
          customFlashcards.map((task) => (
            <div key={task.id} className="card-elevated p-4 animate-fade-up">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">
                  {categoryIcons[task.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-1">{task.task}</h3>
                  <p className="text-sm text-muted-foreground italic mb-2 line-clamp-2">
                    {task.comment}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{task.category}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full",
                        task.difficulty === "easy" && "bg-success/10 text-success",
                        task.difficulty === "medium" && "bg-warning/10 text-warning",
                        task.difficulty === "hard" && "bg-destructive/10 text-destructive"
                      )}
                    >
                      {task.difficulty === "easy" ? "Łatwe" : task.difficulty === "medium" ? "Średnie" : "Trudne"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.timeEstimate}{" "}
                      {task.timeUnit === "minutes" ? "min" : "godz"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Usuń zadanie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card-elevated p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-heading font-semibold mb-2">
              Brak własnych zadań
            </h2>
            <p className="text-muted-foreground mb-4">
              Dodaj własne zadania, które pojawią się w losowaniu fiszek.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Dodaj pierwsze zadanie
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
    </div>
  );
}
