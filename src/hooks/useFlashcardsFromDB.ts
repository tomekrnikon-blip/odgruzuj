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
  selectedCategories: Category[];
  selectedDifficulties: DifficultyFilter[];
  completedTodayIds: string[];
  totalAvailable: number;
  setSelectedCategories: (categories: Category[]) => void;
  setSelectedDifficulties: (difficulties: DifficultyFilter[]) => void;
  getNextFlashcard: () => void;
  skipFlashcard: () => void;
  markAsCompleted: (id: string) => void;
  resetDailyProgress: () => void;
}

export function useFlashcardsFromDB(): UseFlashcardsFromDBReturn {
  const [flashcards, setFlashcards] = useState<DBFlashcard[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState<DBFlashcard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      setCompletedTodayIds([]);
      setLastResetDate(today);
      setSkippedIds([]);
    }
  }, [lastResetDate, setCompletedTodayIds, setLastResetDate]);

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
  const getAvailableFlashcards = useCallback(() => {
    return flashcards.filter(
      (card) =>
        selectedCategories.includes(card.category as Category) &&
        selectedDifficulties.includes(card.difficulty as DifficultyFilter) &&
        !completedTodayIds.includes(card.id) &&
        !skippedIds.includes(card.id)
    );
  }, [flashcards, selectedCategories, selectedDifficulties, completedTodayIds, skippedIds]);

  const getNextFlashcard = useCallback(() => {
    checkDailyReset();
    
    let available = getAvailableFlashcards();

    if (available.length === 0) {
      // Reset skipped if no cards available
      setSkippedIds([]);
      available = flashcards.filter(
        (card) =>
          selectedCategories.includes(card.category as Category) &&
          selectedDifficulties.includes(card.difficulty as DifficultyFilter) &&
          !completedTodayIds.includes(card.id)
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

  // Initialize with a flashcard when data loads
  useEffect(() => {
    if (!isLoading && flashcards.length > 0 && currentFlashcard === null) {
      const available = flashcards.filter(
        (card) =>
          selectedCategories.includes(card.category as Category) &&
          selectedDifficulties.includes(card.difficulty as DifficultyFilter) &&
          !completedTodayIds.includes(card.id)
      );
      if (available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        setCurrentFlashcard(available[randomIndex]);
      }
    }
  }, [isLoading, flashcards, selectedCategories, selectedDifficulties, completedTodayIds, currentFlashcard]);

  return {
    currentFlashcard,
    isLoading,
    selectedCategories,
    selectedDifficulties,
    completedTodayIds,
    totalAvailable: flashcards.length,
    setSelectedCategories,
    setSelectedDifficulties,
    getNextFlashcard,
    skipFlashcard,
    markAsCompleted,
    resetDailyProgress,
  };
}
