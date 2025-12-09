import { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCategories, type NewCategory } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ShieldAlert, 
  FolderPlus,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJI_OPTIONS = ['📦', '👕', '📚', '📄', '🍳', '🛁', '🏠', '💼', '🎮', '🎨', '🎵', '🌿', '❤️', '⭐'];

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const { 
    categories, 
    isLoading: categoriesLoading, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    toggleCategoryActive 
  } = useCategories();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[0] | null>(null);
  const [formData, setFormData] = useState<NewCategory>({ name: '', icon: '📦' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setFormData({ name: '', icon: '📦' });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (category: typeof categories[0]) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, icon: category.icon });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteDialog = (category: typeof categories[0]) => {
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20 px-4">
        <div className="card-elevated p-8 text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Brak dostępu</h1>
          <p className="text-muted-foreground">
            Ta strona jest dostępna tylko dla administratorów. Zaloguj się na konto z uprawnieniami administratora.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
            Panel Administratora
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj kategoriami i ustawieniami aplikacji
          </p>
        </header>

        {/* Categories Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Kategorie
            </h2>
            <Button onClick={handleOpenAddModal} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj
            </Button>
          </div>

          {categoriesLoading ? (
            <div className="card-flat p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="card-flat p-8 text-center">
              <p className="text-muted-foreground">Brak kategorii</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "card-flat p-4 flex items-center justify-between transition-opacity",
                    !category.is_active && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Kolejność: {category.display_order}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={(checked) => toggleCategoryActive(category.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditModal(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDeleteDialog(category)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

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
              <Label htmlFor="name">Nazwa kategorii</Label>
              <Input
                id="name"
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
              <Label htmlFor="edit-name">Nazwa kategorii</Label>
              <Input
                id="edit-name"
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
    </div>
  );
}
