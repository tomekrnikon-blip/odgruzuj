import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from './useLocalStorage';
import { Category, categories, Difficulty } from '@/data/flashcards';

export type DifficultyFilter = Difficulty;

export const difficulties: DifficultyFilter[] = ['easy', 'medium', 'hard'];

export const difficultyLabels: Record<DifficultyFilter, string> = {
  easy: 'Łatwe',
  medium: 'Średnie',
  hard: 'Trudne',
};

export const difficultyIcons: Record<DifficultyFilter, string> = {
  easy: '🌱',
  medium: '🌿',
  hard: '🌳',
};

export interface DBFlashcard {
  id: string;
  category: string;
  category2: string | null;
  task: string;
  comment: string;
  difficulty: string;
  timeEstimate: number;
  timeUnit: string;
  isTimedTask: boolean;
  isPremium: boolean;
}

interface UseFlashcardsFromDBReturn {
  currentFlashcard: DBFlashcard | null;
  isLoading: boolean;
  isRefreshing: boolean;
  selectedCategories: Category[];
  selectedDifficulties: DifficultyFilter[];
  completedTodayIds: string[];
  totalAvailable: number;
  dailyLimitReached: boolean;
  dailyLimit: number;
  completedTodayCount: number;
  setSelectedCategories: (categories: Category[]) => void;
  setSelectedDifficulties: (difficulties: DifficultyFilter[]) => void;
  getNextFlashcard: () => void;
  skipFlashcard: () => void;
  markAsCompleted: (id: string) => void;
  resetDailyProgress: () => void;
  refreshFlashcards: () => Promise<void>;
}

export function useFlashcardsFromDB(): UseFlashcardsFromDBReturn {
  const [flashcards, setFlashcards] = useState<DBFlashcard[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState<DBFlashcard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  
  const [selectedCategories, setSelectedCategories] = useLocalStorage<Category[]>(
    "odgruzuj_categories",
    categories
  );
  const [selectedDifficulties, setSelectedDifficulties] = useLocalStorage<DifficultyFilter[]>(
    "odgruzuj_difficulties",
    difficulties
  );
  const [completedTodayIds, setCompletedTodayIds] = useLocalStorage<string[]>(
    "odgruzuj_completed_today_db",
    []
  );
  const [lastResetDate, setLastResetDate] = useLocalStorage<string>(
    "odgruzuj_last_reset_db",
    new Date().toDateString()
  );

  // Check if we need to reset daily progress
  const checkDailyReset = useCallback(() => {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      console.log('[Daily Reset] Resetting daily progress for new day');
      setCompletedTodayIds([]);
      setLastResetDate(today);
      setSkippedIds([]);
      return true; // Indicate reset happened
    }
    return false;
  }, [lastResetDate, setCompletedTodayIds, setLastResetDate]);

  // Check daily reset on mount and when tab becomes visible
  useEffect(() => {
    // Check immediately on mount
    checkDailyReset();
    
    // Also check when tab becomes visible again (user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDailyReset();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkDailyReset]);

  // Fetch flashcards from database (RLS will filter based on subscription)
  const fetchFlashcards = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_flashcards')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: DBFlashcard[] = (data || []).map(card => ({
        id: card.id,
        category: card.category,
        category2: card.category2 || null,
        task: card.task,
        comment: card.comment,
        difficulty: card.difficulty,
        timeEstimate: card.time_estimate,
        timeUnit: card.time_unit,
        isTimedTask: card.is_timed_task,
        isPremium: card.is_premium,
      }));

      setFlashcards(mapped);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Track if we've loaded data once
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    fetchFlashcards();
    hasLoadedOnce.current = true;
  }, [fetchFlashcards]);

  // Auto-refresh when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored - refreshing flashcards...');
      fetchFlashcards();
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchFlashcards]);

  // Get available flashcards based on user's category and difficulty selection
  // A flashcard matches if either category or category2 matches the selected categories
  const getAvailableFlashcards = useCallback(() => {
    return flashcards.filter(
      (card) => {
        const matchesCategory = selectedCategories.includes(card.category as Category) || 
          (card.category2 && selectedCategories.includes(card.category2 as Category));
        return matchesCategory &&
          selectedDifficulties.includes(card.difficulty as DifficultyFilter) &&
          !completedTodayIds.includes(card.id) &&
          !skippedIds.includes(card.id);
      }
    );
  }, [flashcards, selectedCategories, selectedDifficulties, completedTodayIds, skippedIds]);

  const getNextFlashcard = useCallback(() => {
    checkDailyReset();
    
    let available = getAvailableFlashcards();

    if (available.length === 0) {
      // Reset skipped if no cards available
      setSkippedIds([]);
      available = flashcards.filter(
        (card) => {
          const matchesCategory = selectedCategories.includes(card.category as Category) || 
            (card.category2 && selectedCategories.includes(card.category2 as Category));
          return matchesCategory &&
            selectedDifficulties.includes(card.difficulty as DifficultyFilter) &&
            !completedTodayIds.includes(card.id);
        }
      );
      
      if (available.length === 0) {
        setCurrentFlashcard(null);
        return;
      }
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * available.length);
    setCurrentFlashcard(available[randomIndex]);
  }, [flashcards, selectedCategories, selectedDifficulties, completedTodayIds, skippedIds, checkDailyReset, getAvailableFlashcards]);

  const skipFlashcard = useCallback(() => {
    if (currentFlashcard) {
      setSkippedIds((prev) => [...prev, currentFlashcard.id]);
    }
    getNextFlashcard();
  }, [currentFlashcard, getNextFlashcard]);

  const markAsCompleted = useCallback(
    (id: string) => {
      setCompletedTodayIds((prev) => [...prev, id]);
    },
    [setCompletedTodayIds]
  );

  const resetDailyProgress = useCallback(() => {
    setCompletedTodayIds([]);
    setSkippedIds([]);
  }, [setCompletedTodayIds]);

  // Manual refresh function for pull-to-refresh
  const refreshFlashcards = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchFlashcards();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFlashcards]);

  // Initialize with a flashcard when data loads
  useEffect(() => {
    if (!isLoading && flashcards.length > 0 && currentFlashcard === null) {
      const available = flashcards.filter(
        (card) => {
          const matchesCategory = selectedCategories.includes(card.category as Category) || 
            (card.category2 && selectedCategories.includes(card.category2 as Category));
          return matchesCategory &&
            selectedDifficulties.includes(card.difficulty as DifficultyFilter) &&
            !completedTodayIds.includes(card.id);
        }
      );
      if (available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        setCurrentFlashcard(available[randomIndex]);
      }
    }
  }, [isLoading, flashcards, selectedCategories, selectedDifficulties, completedTodayIds, currentFlashcard]);

  // Free users have a daily limit of 2 flashcards
  const FREE_DAILY_LIMIT = 2;
  const completedTodayCount = completedTodayIds.length;
  const dailyLimitReached = completedTodayCount >= FREE_DAILY_LIMIT;
  
  // Debug logging for daily limit
  console.log('[FREE LIMIT] completedToday:', completedTodayCount, 'limit:', FREE_DAILY_LIMIT, 'reached:', dailyLimitReached);

  return {
    currentFlashcard,
    isLoading,
    isRefreshing,
    selectedCategories,
    selectedDifficulties,
    completedTodayIds,
    totalAvailable: flashcards.length,
    dailyLimitReached,
    dailyLimit: FREE_DAILY_LIMIT,
    completedTodayCount,
    setSelectedCategories,
    setSelectedDifficulties,
    getNextFlashcard,
    skipFlashcard,
    markAsCompleted,
    resetDailyProgress,
    refreshFlashcards,
  };
}
