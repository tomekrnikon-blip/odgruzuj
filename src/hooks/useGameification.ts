import { useLocalStorage } from "./useLocalStorage";
import { Flashcard } from "@/data/flashcards";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: "tasks" | "streak" | "points";
  unlockedAt?: string;
}

export interface CompletedTask {
  flashcardId: number;
  completedAt: string;
  timeSpent: number; // in seconds
  wasTimedTask: boolean;
  completedInTime: boolean;
}

export interface UserStats {
  points: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  completedTasks: CompletedTask[];
  unlockedBadges: string[];
}

const defaultStats: UserStats = {
  points: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  completedTasks: [],
  unlockedBadges: [],
};

export const allBadges: Badge[] = [
  {
    id: "first_step",
    name: "Pierwszy Krok",
    description: "Ukończ swoje pierwsze zadanie",
    icon: "🌱",
    requirement: 1,
    type: "tasks",
  },
  {
    id: "declutter_starter",
    name: "Początkujący Sprzątacz",
    description: "Ukończ 10 zadań",
    icon: "🧹",
    requirement: 10,
    type: "tasks",
  },
  {
    id: "declutter_master",
    name: "Mistrz Porządku",
    description: "Ukończ 50 zadań",
    icon: "✨",
    requirement: 50,
    type: "tasks",
  },
  {
    id: "declutter_legend",
    name: "Legenda Sprzątania",
    description: "Ukończ 100 zadań",
    icon: "👑",
    requirement: 100,
    type: "tasks",
  },
  {
    id: "streak_3",
    name: "Trzydniowa Seria",
    description: "Utrzymaj 3-dniową serię",
    icon: "🔥",
    requirement: 3,
    type: "streak",
  },
  {
    id: "streak_7",
    name: "Tygodniowa Seria",
    description: "Utrzymaj 7-dniową serię",
    icon: "💪",
    requirement: 7,
    type: "streak",
  },
  {
    id: "streak_30",
    name: "Miesięczna Seria",
    description: "Utrzymaj 30-dniową serię",
    icon: "🏆",
    requirement: 30,
    type: "streak",
  },
  {
    id: "points_100",
    name: "Setka Punktów",
    description: "Zdobądź 100 punktów",
    icon: "💯",
    requirement: 100,
    type: "points",
  },
  {
    id: "points_500",
    name: "Pięćset Punktów",
    description: "Zdobądź 500 punktów",
    icon: "🌟",
    requirement: 500,
    type: "points",
  },
  {
    id: "points_1000",
    name: "Tysiąc Punktów",
    description: "Zdobądź 1000 punktów",
    icon: "💎",
    requirement: 1000,
    type: "points",
  },
];

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isYesterday = (date: Date, today: Date): boolean => {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

export function useGameification() {
  const [stats, setStats] = useLocalStorage<UserStats>("odgruzuj_stats", defaultStats);

  const getLevel = (points: number): number => {
    return Math.floor(points / 100) + 1;
  };

  const getPointsToNextLevel = (points: number): number => {
    const currentLevel = getLevel(points);
    const nextLevelPoints = currentLevel * 100;
    return nextLevelPoints - points;
  };

  const getLevelProgress = (points: number): number => {
    const currentLevel = getLevel(points);
    const prevLevelPoints = (currentLevel - 1) * 100;
    const currentLevelPoints = currentLevel * 100;
    const progressInLevel = points - prevLevelPoints;
    const levelRange = currentLevelPoints - prevLevelPoints;
    return (progressInLevel / levelRange) * 100;
  };

  const checkNewBadges = (newStats: UserStats): string[] => {
    const newBadges: string[] = [];
    const totalTasks = newStats.completedTasks.length;

    allBadges.forEach((badge) => {
      if (newStats.unlockedBadges.includes(badge.id)) return;

      let shouldUnlock = false;

      switch (badge.type) {
        case "tasks":
          shouldUnlock = totalTasks >= badge.requirement;
          break;
        case "streak":
          shouldUnlock = newStats.currentStreak >= badge.requirement;
          break;
        case "points":
          shouldUnlock = newStats.points >= badge.requirement;
          break;
      }

      if (shouldUnlock) {
        newBadges.push(badge.id);
      }
    });

    return newBadges;
  };

  const completeTask = (
    flashcard: Flashcard,
    timeSpent: number,
    completedInTime: boolean
  ): { pointsEarned: number; newBadges: Badge[] } => {
    const today = new Date();
    const basePoints = 10;
    const bonusPoints = flashcard.isTimedTask && completedInTime ? 5 : 0;
    const pointsEarned = basePoints + bonusPoints;

    setStats((prev) => {
      const lastCompleted = prev.lastCompletedDate
        ? new Date(prev.lastCompletedDate)
        : null;

      let newStreak = 1;
      if (lastCompleted) {
        if (isSameDay(lastCompleted, today)) {
          newStreak = prev.currentStreak;
        } else if (isYesterday(lastCompleted, today)) {
          newStreak = prev.currentStreak + 1;
        }
      }

      const newStats: UserStats = {
        ...prev,
        points: prev.points + pointsEarned,
        level: getLevel(prev.points + pointsEarned),
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastCompletedDate: today.toISOString(),
        completedTasks: [
          ...prev.completedTasks,
          {
            flashcardId: flashcard.id,
            completedAt: today.toISOString(),
            timeSpent,
            wasTimedTask: flashcard.isTimedTask,
            completedInTime,
          },
        ],
      };

      const newBadgeIds = checkNewBadges(newStats);
      newStats.unlockedBadges = [...prev.unlockedBadges, ...newBadgeIds];

      return newStats;
    });

    const newBadgeIds = checkNewBadges({
      ...stats,
      points: stats.points + pointsEarned,
      completedTasks: [
        ...stats.completedTasks,
        {
          flashcardId: flashcard.id,
          completedAt: today.toISOString(),
          timeSpent,
          wasTimedTask: flashcard.isTimedTask,
          completedInTime,
        },
      ],
      currentStreak: stats.lastCompletedDate
        ? isSameDay(new Date(stats.lastCompletedDate), today)
          ? stats.currentStreak
          : isYesterday(new Date(stats.lastCompletedDate), today)
          ? stats.currentStreak + 1
          : 1
        : 1,
    });

    const newBadges = allBadges.filter(
      (badge) =>
        newBadgeIds.includes(badge.id) && !stats.unlockedBadges.includes(badge.id)
    );

    return { pointsEarned, newBadges };
  };

  const getTodaysTasks = (): CompletedTask[] => {
    const today = new Date();
    return stats.completedTasks.filter((task) =>
      isSameDay(new Date(task.completedAt), today)
    );
  };

  const getThisWeeksTasks = (): CompletedTask[] => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return stats.completedTasks.filter((task) => {
      const taskDate = new Date(task.completedAt);
      return taskDate >= weekAgo && taskDate <= today;
    });
  };

  const getThisMonthsTasks = (): CompletedTask[] => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    return stats.completedTasks.filter((task) => {
      const taskDate = new Date(task.completedAt);
      return taskDate >= monthAgo && taskDate <= today;
    });
  };

  const resetStats = () => {
    setStats(defaultStats);
  };

  return {
    stats,
    completeTask,
    getTodaysTasks,
    getThisWeeksTasks,
    getThisMonthsTasks,
    getLevel,
    getPointsToNextLevel,
    getLevelProgress,
    resetStats,
    allBadges,
  };
}
