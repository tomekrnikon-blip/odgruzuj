import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from './useLocalStorage';
import { Category, categories } from '@/data/flashcards';

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
  completedTodayIds: string[];
  totalAvailable: number;
  setSelectedCategories: (categories: Category[]) => void;
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

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  // Get available flashcards based on user's category selection
  const getAvailableFlashcards = useCallback(() => {
    return flashcards.filter(
      (card) =>
        selectedCategories.includes(card.category as Category) &&
        !completedTodayIds.includes(card.id) &&
        !skippedIds.includes(card.id)
    );
  }, [flashcards, selectedCategories, completedTodayIds, skippedIds]);

  const getNextFlashcard = useCallback(() => {
    checkDailyReset();
    
    let available = getAvailableFlashcards();

    if (available.length === 0) {
      // Reset skipped if no cards available
      setSkippedIds([]);
      available = flashcards.filter(
        (card) =>
          selectedCategories.includes(card.category as Category) &&
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
  }, [flashcards, selectedCategories, completedTodayIds, skippedIds, checkDailyReset, getAvailableFlashcards]);

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
          !completedTodayIds.includes(card.id)
      );
      if (available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        setCurrentFlashcard(available[randomIndex]);
      }
    }
  }, [isLoading, flashcards, selectedCategories, completedTodayIds, currentFlashcard]);

  return {
    currentFlashcard,
    isLoading,
    selectedCategories,
    completedTodayIds,
    totalAvailable: flashcards.length,
    setSelectedCategories,
    getNextFlashcard,
    skipFlashcard,
    markAsCompleted,
    resetDailyProgress,
  };
}
