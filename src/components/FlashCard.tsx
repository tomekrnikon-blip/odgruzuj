import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryIcons, Difficulty } from "@/data/flashcards";
import { DBFlashcard } from "@/hooks/useFlashcardsFromDB";

interface FlashCardProps {
  flashcard: DBFlashcard;
  className?: string;
}

const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case "easy":
      return "Łatwe";
    case "medium":
      return "Średnie";
    case "hard":
      return "Trudne";
    default:
      return difficulty;
  }
};

export function FlashCard({ flashcard, className }: FlashCardProps) {
  const icon = categoryIcons[flashcard.category as keyof typeof categoryIcons] || "📦";
  
  return (
    <div className={cn("flashcard animate-fade-up", className)}>
      {/* Category and difficulty badges */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {flashcard.category}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            flashcard.difficulty === "easy" && "bg-success/10 text-success",
            flashcard.difficulty === "medium" && "bg-warning/10 text-warning",
            flashcard.difficulty === "hard" && "bg-destructive/10 text-destructive"
          )}
        >
          {getDifficultyLabel(flashcard.difficulty)}
        </span>
      </div>

      {/* Task */}
      <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground mb-4 leading-tight">
        {flashcard.task}
      </h2>

      {/* Comment */}
      <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl mb-4">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed">
          {flashcard.comment}
        </p>
      </div>

      {/* Time estimate */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">
          {flashcard.timeEstimate} {flashcard.timeUnit === "minutes" ? "min" : "godz"}
        </span>
        {flashcard.isPremium && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            Pro
          </span>
        )}
      </div>
    </div>
  );
}
