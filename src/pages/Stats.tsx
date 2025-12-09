import { useGameification, allBadges } from "@/hooks/useGameification";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { Trophy, Star, Flame, Target, Clock, TrendingUp } from "lucide-react";

export default function Stats() {
  const { stats, getThisWeeksTasks, getThisMonthsTasks, getLevelProgress, getPointsToNextLevel } =
    useGameification();

  const weekTasks = getThisWeeksTasks();
  const monthTasks = getThisMonthsTasks();

  const averageTimePerTask =
    stats.completedTasks.length > 0
      ? Math.round(
          stats.completedTasks.reduce((acc, task) => acc + task.timeSpent, 0) /
            stats.completedTasks.length /
            60
        )
      : 0;

  const tasksInTime = stats.completedTasks.filter(
    (task) => task.wasTimedTask && task.completedInTime
  ).length;

  // Create weekly chart data
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = stats.completedTasks.filter(
        (task) => task.completedAt.split("T")[0] === dateStr
      ).length;
      data.push({
        day: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][date.getDay()],
        count,
      });
    }
    return data;
  };

  const chartData = getLast7DaysData();
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-heading font-bold">Statystyki</h1>
          <p className="text-sm text-muted-foreground">
            Twoje postępy i osiągnięcia
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Level progress card */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Poziom</p>
              <p className="text-4xl font-heading font-bold text-primary">
                {stats.level}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Star className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.points} / {stats.level * 100} pkt
              </span>
              <span className="text-muted-foreground">
                {getPointsToNextLevel(stats.points)} do następnego
              </span>
            </div>
            <div className="progress-bar h-3">
              <div
                className="progress-fill"
                style={{ width: `${getLevelProgress(stats.points)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Ukończone</span>
            </div>
            <p className="text-2xl font-heading font-bold">
              {stats.completedTasks.length}
            </p>
          </div>
          <div className="card-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">Najdłuższa seria</span>
            </div>
            <p className="text-2xl font-heading font-bold">
              {stats.longestStreak} dni
            </p>
          </div>
          <div className="card-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Śr. czas</span>
            </div>
            <p className="text-2xl font-heading font-bold">
              {averageTimePerTask} min
            </p>
          </div>
          <div className="card-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">W czasie</span>
            </div>
            <p className="text-2xl font-heading font-bold">{tasksInTime}</p>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold">Ostatnie 7 dni</h2>
          </div>
          <div className="flex items-end justify-between h-32 gap-2">
            {chartData.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-primary/80 rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max((day.count / maxCount) * 100, 8)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges section */}
        <div className="card-elevated p-6">
          <h2 className="font-heading font-semibold mb-4">Odznaki</h2>
          <div className="grid grid-cols-4 gap-4">
            {allBadges.map((badge) => (
              <BadgeDisplay
                key={badge.id}
                badge={badge}
                isUnlocked={stats.unlockedBadges.includes(badge.id)}
                size="sm"
                showDetails={false}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {stats.unlockedBadges.length} / {allBadges.length} odblokowanych
          </p>
        </div>

        {/* All badges with details */}
        <div className="space-y-3">
          <h2 className="font-heading font-semibold px-1">
            Wszystkie odznaki
          </h2>
          {allBadges.map((badge) => (
            <div
              key={badge.id}
              className={`card-flat p-4 flex items-center gap-4 ${
                !stats.unlockedBadges.includes(badge.id) && "opacity-60"
              }`}
            >
              <span className="text-3xl">{badge.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{badge.name}</p>
                <p className="text-sm text-muted-foreground">
                  {badge.description}
                </p>
              </div>
              {stats.unlockedBadges.includes(badge.id) && (
                <span className="text-success text-sm font-medium">✓</span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
