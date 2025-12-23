import { useState } from 'react';
import { useCategories, type NewCategory, type Category } from '@/hooks/useCategories';
import { useGlobalFlashcards } from '@/hooks/useGlobalFlashcards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, FolderPlus, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const EMOJI_OPTIONS = ['📦', '👕', '📚', '📄', '🍳', '🛁', '🏠', '💼', '🎮', '🎨', '🎵', '🌿', '❤️', '⭐'];

export function CategoryManager() {
  const { 
    categories, 
    isLoading, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    toggleCategoryActive 
  } = useCategories();
  
  const { flashcards } = useGlobalFlashcards();

  // Calculate flashcard stats per category
  const getCategoryStats = (categoryName: string) => {
    const categoryFlashcards = flashcards.filter(
      f => f.category === categoryName || f.category2 === categoryName
    );
    return {
      total: categoryFlashcards.length,
      free: categoryFlashcards.filter(f => !f.is_premium).length,
      premium: categoryFlashcards.filter(f => f.is_premium).length
    };
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<NewCategory>({ name: '', icon: '📦' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setFormData({ name: '', icon: '📦' });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, icon: category.icon });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleAddCategory = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    const success = await addCategory(formData);
    setIsSubmitting(false);
    if (success) {
      setIsAddModalOpen(false);
      setFormData({ name: '', icon: '📦' });
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !formData.name.trim()) return;
    setIsSubmitting(true);
    const success = await updateCategory(selectedCategory.id, {
      name: formData.name,
      icon: formData.icon,
    });
    setIsSubmitting(false);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    const success = await deleteCategory(selectedCategory.id);
    setIsSubmitting(false);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-primary" />
          Kategorie
        </h2>
        <Button onClick={handleOpenAddModal} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj
        </Button>
      </div>

      {isLoading ? (
        <div className="card-flat p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="card-flat p-8 text-center">
          <p className="text-muted-foreground">Brak kategorii</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "card-flat p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-opacity",
                  !category.is_active && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{category.name}</p>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      <span>{getCategoryStats(category.name).total} fiszek</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-success">{getCategoryStats(category.name).free} darm.</span>
                      <Badge variant="secondary" className="bg-warning/10 text-warning text-[10px] sm:text-xs px-1 py-0">
                        <Crown className="h-3 w-3 mr-0.5" />
                        {getCategoryStats(category.name).premium}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={(checked) => toggleCategoryActive(category.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenEditModal(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleOpenDeleteDialog(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Add Category Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj kategorię</DialogTitle>
            <DialogDescription>
              Utwórz nową kategorię dla fiszek
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nazwa kategorii</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Elektronika"
              />
            </div>

            <div className="space-y-2">
              <Label>Ikona</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                      formData.icon === emoji
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleAddCategory} 
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj kategorię</DialogTitle>
            <DialogDescription>
              Zmień nazwę lub ikonę kategorii
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Nazwa kategorii</Label>
              <Input
                id="edit-category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ikona</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                      formData.icon === emoji
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleUpdateCategory} 
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń kategorię</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć kategorię "{selectedCategory?.name}"? 
              Ta akcja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
