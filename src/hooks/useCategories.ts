import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  name: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewCategory {
  name: string;
  icon: string;
  display_order?: number;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać kategorii',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async (newCategory: NewCategory): Promise<boolean> => {
    try {
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.display_order)) 
        : 0;

      const { error } = await supabase
        .from('categories')
        .insert({
          name: newCategory.name,
          icon: newCategory.icon,
          display_order: newCategory.display_order ?? maxOrder + 1,
        });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Kategoria została dodana',
      });

      await fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({
        title: 'Błąd',
        description: error.message?.includes('unique') 
          ? 'Kategoria o takiej nazwie już istnieje' 
          : 'Nie udało się dodać kategorii',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Kategoria została zaktualizowana',
      });

      await fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować kategorii',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Kategoria została usunięta',
      });

      await fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kategorii',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleCategoryActive = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateCategory(id, { is_active: isActive });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    refetch: fetchCategories,
  };
}
