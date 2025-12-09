import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
}

export function StatsCard({
  icon: Icon,
  value,
  label,
  variant = "default",
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "card-flat p-4 flex items-center gap-3",
        className
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          variant === "default" && "bg-muted text-muted-foreground",
          variant === "primary" && "bg-primary/10 text-primary",
          variant === "success" && "bg-success/10 text-success",
          variant === "warning" && "bg-warning/10 text-warning"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-heading font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
