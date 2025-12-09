import { Badge } from "@/hooks/useGameification";
import { cn } from "@/lib/utils";

interface BadgeDisplayProps {
  badge: Badge;
  isUnlocked: boolean;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

export function BadgeDisplay({
  badge,
  isUnlocked,
  size = "md",
  showDetails = false,
  className,
}: BadgeDisplayProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-xl",
    md: "w-16 h-16 text-2xl",
    lg: "w-20 h-20 text-3xl",
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          isUnlocked
            ? "bg-primary/10 shadow-lg"
            : "bg-muted grayscale opacity-50"
        )}
      >
        <span className={cn(!isUnlocked && "grayscale")}>{badge.icon}</span>
      </div>
      {showDetails && (
        <div className="text-center">
          <p
            className={cn(
              "text-sm font-medium",
              isUnlocked ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {badge.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {badge.description}
          </p>
        </div>
      )}
    </div>
  );
}

interface BadgeUnlockedModalProps {
  badge: Badge;
  isOpen: boolean;
  onClose: () => void;
}

export function BadgeUnlockedModal({
  badge,
  isOpen,
  onClose,
}: BadgeUnlockedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-3xl shadow-2xl p-8 animate-scale-in text-center max-w-sm mx-4">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl animate-scale-bounce shadow-lg">
            {badge.icon}
          </div>
        </div>
        <div className="pt-8">
          <h2 className="text-xl font-heading font-bold mb-2">
            Nowa Odznaka!
          </h2>
          <p className="text-2xl font-semibold text-primary mb-2">
            {badge.name}
          </p>
          <p className="text-muted-foreground mb-6">{badge.description}</p>
          <button onClick={onClose} className="btn-primary w-full">
            Super!
          </button>
        </div>
      </div>
    </div>
  );
}
