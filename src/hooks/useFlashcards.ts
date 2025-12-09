import { useState, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { 
  Flashcard, 
  Category, 
  categories, 
  flashcards as defaultFlashcards,
  getRandomFlashcard 
} from "@/data/flashcards";

interface UseFlashcardsReturn {
  currentFlashcard: Flashcard | null;
  selectedCategories: Category[];
  customFlashcards: Flashcard[];
  allFlashcards: Flashcard[];
  completedTodayIds: number[];
  setSelectedCategories: (categories: Category[]) => void;
  getNextFlashcard: () => void;
  skipFlashcard: () => void;
  addCustomFlashcard: (flashcard: Omit<Flashcard, "id" | "isCustom">) => void;
  updateCustomFlashcard: (id: number, flashcard: Partial<Flashcard>) => void;
  deleteCustomFlashcard: (id: number) => void;
  markAsCompleted: (id: number) => void;
  resetDailyProgress: () => void;
}

export function useFlashcards(): UseFlashcardsReturn {
  const [selectedCategories, setSelectedCategories] = useLocalStorage<Category[]>(
    "odgruzuj_categories",
    categories
  );
  const [customFlashcards, setCustomFlashcards] = useLocalStorage<Flashcard[]>(
    "odgruzuj_custom_flashcards",
    []
  );
  const [completedTodayIds, setCompletedTodayIds] = useLocalStorage<number[]>(
    "odgruzuj_completed_today",
    []
  );
  const [lastResetDate, setLastResetDate] = useLocalStorage<string>(
    "odgruzuj_last_reset",
    new Date().toDateString()
  );
  const [currentFlashcard, setCurrentFlashcard] = useState<Flashcard | null>(null);
  const [skippedIds, setSkippedIds] = useState<number[]>([]);

  // Check if we need to reset daily progress
  const checkDailyReset = useCallback(() => {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      setCompletedTodayIds([]);
      setLastResetDate(today);
      setSkippedIds([]);
    }
  }, [lastResetDate, setCompletedTodayIds, setLastResetDate]);

  // Combine default and custom flashcards
  const allFlashcards = [...defaultFlashcards, ...customFlashcards];

  const getNextFlashcard = useCallback(() => {
    checkDailyReset();
    
    const availableFlashcards = allFlashcards.filter(
      (card) =>
        selectedCategories.includes(card.category) &&
        !completedTodayIds.includes(card.id) &&
        !skippedIds.includes(card.id)
    );

    if (availableFlashcards.length === 0) {
      // Reset skipped if no cards available
      setSkippedIds([]);
      const afterReset = allFlashcards.filter(
        (card) =>
          selectedCategories.includes(card.category) &&
          !completedTodayIds.includes(card.id)
      );
      
      if (afterReset.length === 0) {
        setCurrentFlashcard(null);
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * afterReset.length);
      setCurrentFlashcard(afterReset[randomIndex]);
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableFlashcards.length);
    setCurrentFlashcard(availableFlashcards[randomIndex]);
  }, [allFlashcards, selectedCategories, completedTodayIds, skippedIds, checkDailyReset]);

  const skipFlashcard = useCallback(() => {
    if (currentFlashcard) {
      setSkippedIds((prev) => [...prev, currentFlashcard.id]);
    }
    getNextFlashcard();
  }, [currentFlashcard, getNextFlashcard]);

  const addCustomFlashcard = useCallback(
    (flashcard: Omit<Flashcard, "id" | "isCustom">) => {
      const maxId = Math.max(
        ...defaultFlashcards.map((f) => f.id),
        ...customFlashcards.map((f) => f.id),
        0
      );
      const newFlashcard: Flashcard = {
        ...flashcard,
        id: maxId + 1,
        isCustom: true,
      };
      setCustomFlashcards((prev) => [...prev, newFlashcard]);
    },
    [customFlashcards, setCustomFlashcards]
  );

  const updateCustomFlashcard = useCallback(
    (id: number, updates: Partial<Flashcard>) => {
      setCustomFlashcards((prev) =>
        prev.map((card) =>
          card.id === id ? { ...card, ...updates } : card
        )
      );
    },
    [setCustomFlashcards]
  );

  const deleteCustomFlashcard = useCallback(
    (id: number) => {
      setCustomFlashcards((prev) => prev.filter((card) => card.id !== id));
    },
    [setCustomFlashcards]
  );

  const markAsCompleted = useCallback(
    (id: number) => {
      setCompletedTodayIds((prev) => [...prev, id]);
    },
    [setCompletedTodayIds]
  );

  const resetDailyProgress = useCallback(() => {
    setCompletedTodayIds([]);
    setSkippedIds([]);
  }, [setCompletedTodayIds]);

  // Initialize with a flashcard if none exists
  if (currentFlashcard === null && selectedCategories.length > 0) {
    const available = allFlashcards.filter(
      (card) =>
        selectedCategories.includes(card.category) &&
        !completedTodayIds.includes(card.id)
    );
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      setCurrentFlashcard(available[randomIndex]);
    }
  }

  return {
    currentFlashcard,
    selectedCategories,
    customFlashcards,
    allFlashcards,
    completedTodayIds,
    setSelectedCategories,
    getNextFlashcard,
    skipFlashcard,
    addCustomFlashcard,
    updateCustomFlashcard,
    deleteCustomFlashcard,
    markAsCompleted,
    resetDailyProgress,
  };
}
