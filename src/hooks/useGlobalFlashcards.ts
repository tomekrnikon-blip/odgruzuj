import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GlobalFlashcard {
  id: string;
  category: string;
  category2: string | null;
  task: string;
  comment: string;
  difficulty: string;
  time_estimate: number;
  time_unit: string;
  is_timed_task: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewGlobalFlashcard {
  category: string;
  category2?: string | null;
  task: string;
  comment: string;
  difficulty: string;
  time_estimate: number;
  time_unit: string;
  is_timed_task?: boolean;
  is_premium?: boolean;
}

export function useGlobalFlashcards() {
  const [flashcards, setFlashcards] = useState<GlobalFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchFlashcards = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_flashcards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      console.error('Error fetching global flashcards:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać fiszek',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addFlashcard = async (newFlashcard: NewGlobalFlashcard): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('global_flashcards')
        .insert({
          ...newFlashcard,
          is_timed_task: newFlashcard.is_timed_task ?? true,
          is_premium: newFlashcard.is_premium ?? false,
        });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Fiszka została dodana',
      });

      await fetchFlashcards();
      return true;
    } catch (error: any) {
      console.error('Error adding flashcard:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać fiszki',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateFlashcard = async (id: string, updates: Partial<GlobalFlashcard>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('global_flashcards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Fiszka została zaktualizowana',
      });

      await fetchFlashcards();
      return true;
    } catch (error: any) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować fiszki',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteFlashcard = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('global_flashcards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Fiszka została usunięta',
      });

      await fetchFlashcards();
      return true;
    } catch (error: any) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć fiszki',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, []);

  return {
    flashcards,
    isLoading,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    refetch: fetchFlashcards,
  };
}
