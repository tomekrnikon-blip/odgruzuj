import { useState, useEffect } from "react";
import { Clock, Bell, BellRing, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReminderClockProps {
  notificationTime: string;
  onTimeChange: (time: string) => void;
  isSubscribed: boolean;
  onToggle: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const motivationalMessages = [
  "Każdy mały krok się liczy! 🏃‍♂️",
  "Porządek zaczyna się od jednej rzeczy! ✨",
  "Czas na mini-porządki! 🧹",
  "15 minut dziennie = wielka zmiana! 💪",
  "Twoje przyszłe ja będzie wdzięczne! 🙏",
  "Mniej rzeczy = więcej spokoju! 🧘",
  "Dziś porządkujesz, jutro odpoczywasz! 🏖️",
  "Każdy dzień to nowy start! 🌅",
];

export function ReminderClock({
  notificationTime,
  onTimeChange,
  isSubscribed,
  onToggle,
  isLoading,
  disabled,
}: ReminderClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [motivationalMessage, setMotivationalMessage] = useState("");

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set random motivational message
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    setMotivationalMessage(motivationalMessages[randomIndex]);
  }, []);

  const hours = currentTime.getHours().toString().padStart(2, "0");
  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
  const seconds = currentTime.getSeconds().toString().padStart(2, "0");
  const dateString = currentTime.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Parse notification time to check if it's upcoming
  const [notifHours, notifMinutes] = notificationTime.split(":").map(Number);
  const notifDate = new Date();
  notifDate.setHours(notifHours, notifMinutes, 0, 0);
  
  const isUpcoming = isSubscribed && notifDate > currentTime;
  const timeUntilNotif = isUpcoming 
    ? Math.floor((notifDate.getTime() - currentTime.getTime()) / 1000 / 60)
    : null;

  return (
    <div className="space-y-6">
      {/* Current time display */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm capitalize">{dateString}</span>
          </div>
          
          <div className="flex items-baseline gap-1">
            <span className="text-5xl md:text-6xl font-bold tracking-tight font-mono text-foreground">
              {hours}
            </span>
            <span className="text-5xl md:text-6xl font-bold text-primary animate-pulse">:</span>
            <span className="text-5xl md:text-6xl font-bold tracking-tight font-mono text-foreground">
              {minutes}
            </span>
            <span className="text-2xl md:text-3xl font-medium text-muted-foreground font-mono ml-1">
              :{seconds}
            </span>
          </div>

          {/* Motivational message */}
          <div className="mt-4 flex items-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <p className="text-sm font-medium">{motivationalMessage}</p>
          </div>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Codzienny alarm</h3>
            <p className="text-sm text-muted-foreground">
              Ustaw porę przypomnienia o porządkach
            </p>
          </div>
        </div>

        {/* Time picker */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              type="time"
              value={notificationTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border-2 bg-background text-lg font-medium",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "transition-all duration-200",
                isSubscribed 
                  ? "border-primary/50" 
                  : "border-border"
              )}
            />
          </div>
          
          <button
            onClick={onToggle}
            disabled={isLoading || disabled}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200",
              isSubscribed
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              (isLoading || disabled) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isSubscribed ? (
              <>
                <BellRing className="w-5 h-5" />
                <span className="hidden sm:inline">Włączone</span>
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                <span className="hidden sm:inline">Włącz</span>
              </>
            )}
          </button>
        </div>

        {/* Status info */}
        {isSubscribed && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {timeUntilNotif !== null && timeUntilNotif > 0 ? (
                <p className="text-sm">
                  Następne przypomnienie za{" "}
                  <span className="font-semibold text-primary">
                    {timeUntilNotif < 60
                      ? `${timeUntilNotif} min`
                      : `${Math.floor(timeUntilNotif / 60)}h ${timeUntilNotif % 60}min`}
                  </span>
                </p>
              ) : (
                <p className="text-sm">
                  Przypomnienie codziennie o{" "}
                  <span className="font-semibold text-primary">{notificationTime}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
